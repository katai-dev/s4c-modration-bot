'use strict';

/**
 * @fileoverview CaseService
 * Orchestrates the full case submission workflow (/warn, /timeout).
 *
 * PRD Rules enforced here:
 *   - Aegis enabled check
 *   - Target validation (cannot be self, cannot be bot, cannot be owner/staff)
 *   - Rate limit check
 *   - Duplicate detection
 *   - Timeouts are applied IMMEDIATELY on submission (before DB write).
 *   - Pending notifications sent immediately after case creation.
 *
 * Emits CASE_CREATED audit log upon successful completion.
 */

const CaseRepository          = require('../../database/repositories/CaseRepository');
const GuildCounterRepository  = require('../../database/repositories/GuildCounterRepository');
const AegisUserRepository     = require('../../database/repositories/AegisUserRepository');
const CaseValidator           = require('../validators/CaseValidator');
const ReviewEmbedBuilder      = require('../builders/ReviewEmbedBuilder');
const CaseServiceError        = require('./CaseServiceError');
const { AUDIT_ACTIONS }       = require('../../database/models/AuditLog');

class CaseService {

    /**
     * Submit a new case. Throws CaseServiceError on validation failure.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {import('discord.js').ChatInputCommandInteraction} interaction
     * @param {object} inputs
     * @param {import('discord.js').User} inputs.targetUser
     * @param {import('mongoose').Document} inputs.punishmentType
     * @param {import('discord.js').Attachment[]} inputs.attachments
     * @returns {Promise<import('mongoose').Document>} The created Case document
     * @throws {CaseServiceError}
     */
    async createCase(client, interaction, { targetUser, punishmentType, attachments }) {
        const guildId     = interaction.guildId;
        const moderatorId = interaction.user.id;
        const targetId    = targetUser.id;

        // ── 1. Aegis Enabled Check ──────────────────────────────────────────
        const config = await client.aegis.services.config.getConfig(client, guildId);
        if (!config.enabled) {
            throw new CaseServiceError('AEGIS_DISABLED', 'Aegis is currently disabled for this server.');
        }
        if (!config.reviewChannelId) {
            throw new CaseServiceError('REVIEW_CHANNEL_NOT_CONFIGURED', 'Aegis review channel is not configured. Cannot submit cases.');
        }

        // ── 2. Target Validation ────────────────────────────────────────────
        if (!CaseValidator.validateNotSelf(moderatorId, targetId)) {
            throw new CaseServiceError('SELF_SUBMISSION', 'You cannot submit a case against yourself.');
        }
        if (targetUser.bot) {
            throw new CaseServiceError('TARGET_IS_BOT', 'You cannot submit a case against a bot.');
        }
        // Validate target is not staff (tier > 0)
        const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) {
            throw new CaseServiceError('TARGET_NOT_FOUND', 'Target user is no longer in the server.');
        }
        // We temporarily forge a pseudo-interaction to use AegisPermissionGuard on the target.
        const pseudoInteraction = { guild: interaction.guild, member: targetMember };
        const targetTier = await client.systems.aegisPermissions.getTier(pseudoInteraction);
        if (targetTier > 0 || targetId === interaction.guild.ownerId) {
            throw new CaseServiceError('TARGET_IS_STAFF', 'You cannot submit a case against a staff member or the server owner.');
        }

        // ── 3. Basic Field Validation ───────────────────────────────────────
        const validation = CaseValidator.validateCreate({
            guildId,
            targetId,
            moderatorId,
            punishmentTypeId: String(punishmentType._id)
        });
        if (!validation.valid) {
            throw new CaseServiceError('VALIDATION_FAILED', validation.errors.join('\n'));
        }

        // ── 4. Rate Limiting ────────────────────────────────────────────────
        const limitMs = (config.rateLimit?.windowSeconds ?? 3600) * 1000;
        const limitSince = new Date(Date.now() - limitMs);
        const recentCount = await CaseRepository.countRecentByModerator(guildId, moderatorId, targetId, limitSince);

        if (recentCount >= (config.rateLimit?.maxCases ?? 3)) {
            throw new CaseServiceError('RATE_LIMITED', `You have submitted too many cases against this user in the last ${Math.round(limitMs / 60000)} minutes.`);
        }

        // ── 5. Duplicate Detection ──────────────────────────────────────────
        const dupMs = (config.duplicateWindowSeconds ?? 60) * 1000;
        const dupSince = new Date(Date.now() - dupMs);
        const duplicateCase = await CaseRepository.findRecentDuplicate(guildId, targetId, punishmentType._id, dupSince);
        
        const duplicateSuspected = duplicateCase !== null;
        const linkedCaseId       = duplicateCase ? duplicateCase._id : null;

        // ── 6. Immediate Timeout Application (PRD Rule) ──────────────────────
        if (punishmentType.category === 'timeout') {
            try {
                await targetMember.disableCommunicationUntil(
                    Date.now() + punishmentType.duration,
                    `Aegis: Timeout applied pending review by ${interaction.user.tag}`
                );
            } catch (err) {
                client.logger.error(`[CaseService] Failed to apply immediate timeout for ${targetId} in ${guildId}: ${err.message}`);
                throw new CaseServiceError('DISCORD_API_ERROR', 'Failed to apply timeout via Discord. Check bot permissions (Moderate Members role hierarchy).');
            }
        }

        // ── 7. Evidence Upload ──────────────────────────────────────────────
        const evidence = await client.aegis.services.evidence.upload(client, guildId, attachments);

        // ── 8. Generate IDs and Fetch Risk Snapshot ─────────────────────────
        const caseId = await GuildCounterRepository.nextCaseId(guildId);
        const user   = await AegisUserRepository.getOrCreate(guildId, targetId);

        // ── 9. Compute Expiry ───────────────────────────────────────────────
        let expiresAt = null;
        if (config.caseExpiryEnabled) {
            expiresAt = new Date(Date.now() + (config.caseExpiryDays ?? 7) * 24 * 60 * 60 * 1000);
        }

        // ── 10. Database Write ──────────────────────────────────────────────
        const caseDoc = await CaseRepository.create({
            guildId,
            caseId,
            targetId,
            moderatorId,
            punishmentTypeId: punishmentType._id,
            punishmentTypeSnapshot: {
                name:               punishmentType.name,
                category:           punishmentType.category,
                duration:           punishmentType.duration,
                warnLimit:          punishmentType.warnLimit,
                escalationTargetId: punishmentType.escalationTargetId
            },
            status: 'Pending',
            evidenceUrls:        evidence.urls,
            cloudinaryPublicIds: evidence.publicIds,
            evidenceIncomplete:  evidence.incomplete,
            duplicateSuspected,
            linkedCaseId,
            riskTierSnapshot: user.riskTier,
            expiresAt
        });

        // ── 11. Post Review Embed ───────────────────────────────────────────
        try {
            const channel = await client.channels.fetch(config.reviewChannelId);
            if (channel?.isTextBased()) {
                const { embed, row } = ReviewEmbedBuilder.build({
                    caseDoc,
                    targetUser,
                    moderatorUser: interaction.user,
                    config
                });

                const msg = await channel.send({ embeds: [embed], components: [row] });
                await CaseRepository.setReviewMessage(guildId, caseId, msg.id, channel.id);
                // Attach to in-memory doc for the notification service to use if needed
                caseDoc.reviewMessageId = msg.id;
                caseDoc.reviewChannelId = channel.id;
            }
        } catch (err) {
            client.logger.error(`[CaseService] Failed to post review embed for case #${caseId} in ${guildId}: ${err.message}`);
            // Non-fatal. Case exists in DB.
        }

        // ── 12. Notify Target (Pending) ─────────────────────────────────────
        await client.aegis.services.notification.notifyPending(client, caseDoc);

        // ── 13. Audit ───────────────────────────────────────────────────────
        await client.aegis.services.audit.log(client, {
            guildId,
            action:   AUDIT_ACTIONS.CASE_CREATED,
            actorId:  moderatorId,
            targetId: targetId,
            caseId:   caseDoc._id,
            payload:  {
                caseId,
                punishmentType:     punishmentType.name,
                category:           punishmentType.category,
                evidenceCount:      evidence.urls.length,
                evidenceIncomplete: evidence.incomplete,
                duplicateSuspected,
                riskTier:           user.riskTier
            }
        });

        return caseDoc;
    }

    /**
     * Submit a system-generated case (e.g., Escalation).
     * Bypasses manual rate limits, self-checks, and interaction replies.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {object} inputs
     * @param {string} inputs.targetId
     * @param {import('mongoose').Document} inputs.punishmentType
     * @param {import('mongoose').Types.ObjectId[]} [inputs.escalatedFromCaseIds=[]]
     * @returns {Promise<import('mongoose').Document>}
     */
    async createSystemCase(client, guildId, { targetId, punishmentType, escalatedFromCaseIds = [] }) {
        const moderatorId = 'SYSTEM';

        // 1. Config check
        const config = await client.aegis.services.config.getConfig(client, guildId);
        if (!config.enabled || !config.reviewChannelId) {
            return null; // Don't crash, just abort system cases if misconfigured
        }

        // 2. Fetch Guild & Member
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return null;
        
        const targetMember = await guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return null; // Target left the guild

        // 3. Immediate Timeout Application (PRD Rule)
        if (punishmentType.category === 'timeout') {
            try {
                await targetMember.disableCommunicationUntil(
                    Date.now() + punishmentType.duration,
                    `Aegis: Timeout applied pending review by SYSTEM (Escalation)`
                );
            } catch (err) {
                client.logger.error(`[CaseService] Failed to apply immediate timeout for ${targetId} in ${guildId} (Escalation): ${err.message}`);
                // Proceed despite failure so the case gets reviewed
            }
        }

        // 4. Generate ID and Fetch Risk Snapshot
        const caseId = await GuildCounterRepository.nextCaseId(guildId);
        const user   = await AegisUserRepository.getOrCreate(guildId, targetId);

        // 5. Compute Expiry
        let expiresAt = null;
        if (config.caseExpiryEnabled) {
            expiresAt = new Date(Date.now() + (config.caseExpiryDays ?? 7) * 24 * 60 * 60 * 1000);
        }

        // 6. DB Write
        const caseDoc = await CaseRepository.create({
            guildId,
            caseId,
            targetId,
            moderatorId,
            punishmentTypeId: punishmentType._id,
            punishmentTypeSnapshot: {
                name:               punishmentType.name,
                category:           punishmentType.category,
                duration:           punishmentType.duration,
                warnLimit:          punishmentType.warnLimit,
                escalationTargetId: punishmentType.escalationTargetId
            },
            status: 'Pending',
            escalatedFromCaseIds,
            riskTierSnapshot: user.riskTier,
            expiresAt
        });

        // 7. Post Review Embed
        try {
            const channel = await client.channels.fetch(config.reviewChannelId);
            if (channel?.isTextBased()) {
                const { embed, row } = ReviewEmbedBuilder.build({
                    caseDoc,
                    targetUser: targetMember.user,
                    moderatorUser: client.user, // The bot itself represents SYSTEM in the embed
                    config
                });

                const msg = await channel.send({ embeds: [embed], components: [row] });
                await CaseRepository.setReviewMessage(guildId, caseId, msg.id, channel.id);
                caseDoc.reviewMessageId = msg.id;
                caseDoc.reviewChannelId = channel.id;
            }
        } catch (err) {
            client.logger.error(`[CaseService] Failed to post review embed for SYSTEM case #${caseId} in ${guildId}: ${err.message}`);
        }

        // 8. Notify Target
        await client.aegis.services.notification.notifyPending(client, caseDoc);

        // 9. Audit
        await client.aegis.services.audit.log(client, {
            guildId,
            action:   AUDIT_ACTIONS.CASE_ESCALATED,
            actorId:  moderatorId,
            targetId: targetId,
            caseId:   caseDoc._id,
            payload:  {
                caseId,
                punishmentType:       punishmentType.name,
                category:             punishmentType.category,
                triggeredByCaseIds:   escalatedFromCaseIds,
                riskTier:             user.riskTier
            }
        });

        return caseDoc;
    }

    /**
     * Expire a pending case.
     * Updates DB status, reverts timeout, updates embed, and emits audit.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {import('mongoose').Document} caseDoc
     * @returns {Promise<void>}
     */
    async expireCase(client, caseDoc) {
        const guildId = caseDoc.guildId;

        // 1. Update status
        await CaseRepository.updateStatus(guildId, caseDoc.caseId, 'Expired');

        // 2. Revert Timeout if applicable
        if (caseDoc.punishmentTypeSnapshot?.category === 'timeout') {
            try {
                const guild = await client.guilds.fetch(guildId);
                const member = await guild.members.fetch(caseDoc.targetId).catch(() => null);
                if (member) {
                    await member.disableCommunicationUntil(null, `Aegis: Case #${caseDoc.caseId} expired — timeout reverted`);
                }
            } catch (err) {
                client.logger.error(`[CaseService] Failed to revert timeout for expired case #${caseDoc.caseId} in ${guildId}: ${err.message}`);
            }
        }

        // 3. Update Embed
        if (caseDoc.reviewMessageId && caseDoc.reviewChannelId) {
            try {
                const channel = await client.channels.fetch(caseDoc.reviewChannelId).catch(() => null);
                if (channel?.isTextBased()) {
                    const message = await channel.messages.fetch(caseDoc.reviewMessageId).catch(() => null);
                    if (message && message.embeds[0]) {
                        const builder = new (require('discord.js').EmbedBuilder)(message.embeds[0].data);
                        ReviewEmbedBuilder.markExpired(builder);
                        await message.edit({ embeds: [builder], components: [] }); // Remove action row
                    }
                }
            } catch (err) {
                client.logger.warn(`[CaseService] Failed to update embed for expired case #${caseDoc.caseId}: ${err.message}`);
            }
        }

        // 4. Audit
        await client.aegis.services.audit.log(client, {
            guildId,
            action:   AUDIT_ACTIONS.CASE_EXPIRED,
            actorId:  'SYSTEM',
            targetId: caseDoc.targetId,
            caseId:   caseDoc._id,
            payload:  {
                caseId:    caseDoc.caseId,
                expiredAt: new Date()
            }
        });
    }
}

module.exports = CaseService;

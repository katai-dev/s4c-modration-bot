'use strict';

/**
 * @fileoverview ReviewService
 * Processes approval and rejection decisions on Pending cases.
 *
 * PRD Rules enforced here:
 *   - Timeouts are applied immediately on submission (in CaseService).
 *     Approval confirms the timeout remains active.
 *     Rejection reverts the timeout and notifies the target.
 *   - Rejection reason is always mandatory (enforced by modal; validated here).
 *   - Reviewer may not review their own submission (self-review blocked).
 *   - A reviewer may not vote twice on the same case (double-vote blocked).
 *   - Approval threshold is per-guild config (approvalRequirements).
 *   - On auto-approval: risk is updated, points/stats recorded, target notified.
 *   - On rejection: timeout reverted if applicable, target notified, stats recorded.
 *
 * Discord API errors during timeout revert are caught and logged — they must
 * not prevent the case status from being updated or the audit entry from being written.
 *
 * This service does not contain DB queries — all DB access goes through repositories.
 */

const CaseRepository             = require('../../database/repositories/CaseRepository');
const StaffStatisticsRepository  = require('../../database/repositories/StaffStatisticsRepository');
const StaffPointsRepository      = require('../../database/repositories/StaffPointsRepository');
const ReviewEmbedBuilder         = require('../builders/ReviewEmbedBuilder');
const { AUDIT_ACTIONS }          = require('../../database/models/AuditLog');

// Staff points awarded per decision.
const POINTS_PER_APPROVAL  = 2;
const POINTS_PER_REJECTION = 1;

class ReviewService {

    // ── Approval ───────────────────────────────────────────────────────────────

    /**
     * Record an approval vote from a reviewer.
     * If the approval threshold is met, auto-approves the case.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {import('discord.js').ButtonInteraction} interaction
     * @param {import('mongoose').Document} caseDoc  Current state of the case
     * @param {object} config  Aegis guild config
     * @returns {Promise<void>}
     */
    async recordApproval(client, interaction, caseDoc, config) {
        const reviewerId   = interaction.user.id;
        const guildId      = caseDoc.guildId;

        // ── Validation ──────────────────────────────────────────────────────
        if (caseDoc.status !== 'Pending') {
            return interaction.reply({
                content: `This case is no longer pending (status: **${caseDoc.status}**).`,
                flags:   64  // Ephemeral
            });
        }

        if (reviewerId === caseDoc.moderatorId) {
            return interaction.reply({
                content: 'You cannot review your own submission.',
                flags:   64
            });
        }

        const alreadyVoted = caseDoc.approvals.some(a => a.reviewerId === reviewerId);
        if (alreadyVoted) {
            return interaction.reply({
                content: 'You have already voted on this case.',
                flags:   64
            });
        }

        // ── Resolve tier ────────────────────────────────────────────────────
        const guardResult = await client.systems.aegisPermissions.check(interaction, 1);
        if (!guardResult.passed) {
            return interaction.reply({
                content: `Insufficient permissions. Required: Moderator (Tier 1). Your tier: ${guardResult.tierName}.`,
                flags:   64
            });
        }

        // ── Defer to allow async processing ────────────────────────────────
        await interaction.deferReply({ flags: 64 });

        // ── Record approval sub-document ────────────────────────────────────
        const updatedCase = await CaseRepository.addApproval(guildId, caseDoc.caseId, {
            reviewerId,
            reviewerTier: guardResult.tier,
            decision:     'approved',
            decidedAt:    new Date()
        });

        if (!updatedCase) {
            return interaction.editReply({ content: 'Case could not be updated. It may have been modified concurrently.' });
        }

        // ── Check threshold ─────────────────────────────────────────────────
        const thresholdMet = this._isThresholdMet(updatedCase, config);

        if (thresholdMet) {
            await this._approveCase(client, interaction, updatedCase, config);
        } else {
            // Update embed to show new approval count.
            await this._updateReviewEmbed(
                client,
                updatedCase,
                embed => ReviewEmbedBuilder.updateApproval(embed, updatedCase, config)
            );
            await interaction.editReply({ content: `Approval recorded. (${this._approvalCount(updatedCase)} / ${this._required(updatedCase, config)} required)` });
        }
    }

    // ── Rejection ──────────────────────────────────────────────────────────────

    /**
     * Record a rejection and revert the timeout if applicable.
     * Called from the modal submit handler after the reviewer provides a reason.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {import('discord.js').ModalSubmitInteraction} interaction
     * @param {import('mongoose').Document} caseDoc  Current state of the case
     * @param {string} reason  Mandatory rejection reason
     * @returns {Promise<void>}
     */
    async recordRejection(client, interaction, caseDoc, reason) {
        const reviewerId = interaction.user.id;
        const guildId    = caseDoc.guildId;

        // Race-condition guard: re-check status on modal submit.
        if (caseDoc.status !== 'Pending') {
            return interaction.reply({
                content: `This case is no longer pending (status: **${caseDoc.status}**).`,
                flags:   64
            });
        }

        if (!reason || reason.trim().length === 0) {
            return interaction.reply({
                content: 'A rejection reason is required.',
                flags:   64
            });
        }

        const guardResult = await client.systems.aegisPermissions.check(interaction, 1);
        if (!guardResult.passed) {
            return interaction.reply({
                content: `Insufficient permissions. Required: Moderator (Tier 1). Your tier: ${guardResult.tierName}.`,
                flags:   64
            });
        }

        await interaction.deferReply({ flags: 64 });

        // ── Record rejection sub-document ───────────────────────────────────
        await CaseRepository.addApproval(guildId, caseDoc.caseId, {
            reviewerId,
            reviewerTier: guardResult.tier,
            decision:     'rejected',
            reason:       reason.trim(),
            decidedAt:    new Date()
        });

        // ── Update case status ──────────────────────────────────────────────
        const rejectedCase = await CaseRepository.updateStatus(
            guildId,
            caseDoc.caseId,
            'Rejected',
            { rejectionReason: reason.trim() }
        );

        // ── Revert timeout if applicable ────────────────────────────────────
        if (caseDoc.punishmentTypeSnapshot?.category === 'timeout') {
            await this._revertTimeout(client, guildId, caseDoc.targetId, caseDoc.caseId);
        }

        // ── Notify target ───────────────────────────────────────────────────
        await client.aegis.services.notification.notifyRejection(client, rejectedCase ?? caseDoc, reason.trim());

        // ── Update review embed ─────────────────────────────────────────────
        await this._updateReviewEmbed(
            client,
            caseDoc,
            embed => ReviewEmbedBuilder.markRejected(embed, reason.trim())
        );

        // ── Record staff stats/points ───────────────────────────────────────
        const resolutionMs = Date.now() - new Date(caseDoc.createdAt).getTime();
        await client.systems.errors.wrap(
            () => StaffStatisticsRepository.recordDecision(guildId, reviewerId, 'rejected', resolutionMs),
            'ReviewService.recordDecision'
        );
        await client.systems.errors.wrap(
            () => StaffPointsRepository.increment(guildId, reviewerId, POINTS_PER_REJECTION, POINTS_PER_REJECTION, POINTS_PER_REJECTION),
            'ReviewService.incrementPoints'
        );

        // ── Audit ───────────────────────────────────────────────────────────
        await client.aegis.services.audit.log(client, {
            guildId,
            action:   AUDIT_ACTIONS.CASE_REJECTED,
            actorId:  reviewerId,
            targetId: caseDoc.targetId,
            caseId:   caseDoc._id,
            payload:  {
                caseId:       caseDoc.caseId,
                rejectorTier: guardResult.tier,
                reason:       reason.trim()
            }
        });

        await interaction.editReply({ content: `Case #${caseDoc.caseId} has been rejected.` });
    }

    // ── Private: Auto-Approval ──────────────────────────────────────────────────

    /**
     * Execute all side effects when a case reaches its approval threshold.
     * @private
     */
    async _approveCase(client, interaction, caseDoc, config) {
        const guildId = caseDoc.guildId;

        // ── Update status ───────────────────────────────────────────────────
        const approvedCase = await CaseRepository.updateStatus(guildId, caseDoc.caseId, 'Approved');

        // ── Apply risk update ───────────────────────────────────────────────
        const riskResult = await client.systems.errors.wrap(
            () => client.aegis.services.risk.applyApproval(
                client,
                guildId,
                caseDoc.targetId,
                caseDoc.punishmentTypeSnapshot.category,
                config
            ),
            'ReviewService.applyApproval'
        );

        // ── Process Escalated Warnings ──────────────────────────────────────
        // If this case was an escalation, the warnings that triggered it must
        // now be cleared since the escalation is approved.
        if (caseDoc.escalatedFromCaseIds && caseDoc.escalatedFromCaseIds.length > 0) {
            await client.systems.errors.wrap(
                () => CaseRepository.markCleared(guildId, caseDoc.escalatedFromCaseIds),
                'ReviewService.markCleared'
            );
        }

        // ── Trigger Escalation Engine ───────────────────────────────────────
        // Run asynchronously so it doesn't block the approval response.
        client.systems.errors.wrap(
            () => client.aegis.services.escalation.processEscalation(client, guildId, caseDoc.targetId, caseDoc),
            'ReviewService.processEscalation'
        );

        // ── Notify target ───────────────────────────────────────────────────
        await client.aegis.services.notification.notifyApproval(client, approvedCase ?? caseDoc);

        // ── Record stats and points for all approvers ───────────────────────
        const approvers    = (caseDoc.approvals ?? []).filter(a => a.decision === 'approved');
        const resolutionMs = Date.now() - new Date(caseDoc.createdAt).getTime();

        for (const approver of approvers) {
            await client.systems.errors.wrap(
                () => StaffStatisticsRepository.recordDecision(guildId, approver.reviewerId, 'approved', resolutionMs),
                'ReviewService.recordDecision'
            );
            await client.systems.errors.wrap(
                () => StaffPointsRepository.increment(guildId, approver.reviewerId, POINTS_PER_APPROVAL, POINTS_PER_APPROVAL, POINTS_PER_APPROVAL),
                'ReviewService.incrementPoints'
            );
        }

        // ── Update review embed ─────────────────────────────────────────────
        await this._updateReviewEmbed(
            client,
            caseDoc,
            embed => ReviewEmbedBuilder.markApproved(embed, caseDoc, config)
        );

        // ── Audit ───────────────────────────────────────────────────────────
        await client.aegis.services.audit.log(client, {
            guildId,
            action:   AUDIT_ACTIONS.CASE_APPROVED,
            actorId:  interaction.user.id,
            targetId: caseDoc.targetId,
            caseId:   caseDoc._id,
            payload:  {
                caseId:       caseDoc.caseId,
                approverCount: approvers.length,
                riskScore:    riskResult?.riskScore,
                riskTier:     riskResult?.riskTier
            }
        });

        await interaction.editReply({ content: `Case #${caseDoc.caseId} has been approved.` });
    }

    // ── Private: Timeout Revert ─────────────────────────────────────────────────

    /**
     * Attempt to remove a Discord timeout from the target member.
     * Errors are logged but never propagated — the case is already rejected in DB.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {string} targetId
     * @param {number} caseId  For logging context
     * @private
     */
    async _revertTimeout(client, guildId, targetId, caseId) {
        try {
            const guild  = await client.guilds.fetch(guildId);
            const member = await guild.members.fetch(targetId).catch(() => null);

            if (!member) {
                client.logger.warn(
                    `[ReviewService] Cannot revert timeout for case #${caseId}: ` +
                    `member ${targetId} not found in guild ${guildId} (may have left).`
                );
                return;
            }

            // Setting communicationDisabledUntil to null removes the timeout.
            await member.disableCommunicationUntil(null, `Aegis: Case #${caseId} rejected — timeout reverted`);

            client.logger.info(
                `[ReviewService] Timeout reverted for member ${targetId} in guild ${guildId} (case #${caseId}).`
            );
        } catch (err) {
            client.logger.error(
                `[ReviewService] Failed to revert timeout for case #${caseId} ` +
                `target ${targetId} in guild ${guildId}: ${err.message}`
            );
        }
    }

    // ── Private: Embed Update ───────────────────────────────────────────────────

    /**
     * Fetch the existing review embed message and apply a mutation function to it.
     * If the message cannot be found (deleted, channel gone), logs a warning and continues.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {import('mongoose').Document} caseDoc
     * @param {function(import('discord.js').EmbedBuilder): import('discord.js').EmbedBuilder} mutateFn
     * @private
     */
    async _updateReviewEmbed(client, caseDoc, mutateFn) {
        if (!caseDoc.reviewMessageId || !caseDoc.reviewChannelId) return;

        try {
            const channel = await client.channels.fetch(caseDoc.reviewChannelId).catch(() => null);
            if (!channel?.isTextBased()) return;

            const message = await channel.messages.fetch(caseDoc.reviewMessageId).catch(() => null);
            if (!message) return;

            // Rebuild embed from existing data then apply mutation.
            const existingEmbed = message.embeds[0];
            if (!existingEmbed) return;

            const builder = new (require('discord.js').EmbedBuilder)(existingEmbed.data);
            mutateFn(builder);

            await message.edit({ embeds: [builder] });
        } catch (err) {
            client.logger.warn(
                `[ReviewService] Failed to update review embed for case #${caseDoc.caseId}: ${err.message}`
            );
        }
    }

    // ── Private: Threshold Helpers ─────────────────────────────────────────────

    /**
     * Check if the current approval count meets the required threshold.
     * Uses the moderator-level requirement as the standard floor.
     * @param {import('mongoose').Document} caseDoc
     * @param {object} config
     * @returns {boolean}
     * @private
     */
    _isThresholdMet(caseDoc, config) {
        const count    = this._approvalCount(caseDoc);
        const required = this._required(caseDoc, config);
        return count >= required;
    }

    /**
     * Count approval (not rejection) votes on a case.
     * @param {import('mongoose').Document} caseDoc
     * @returns {number}
     * @private
     */
    _approvalCount(caseDoc) {
        return (caseDoc.approvals ?? []).filter(a => a.decision === 'approved').length;
    }

    /**
     * Resolve required approvals from config.
     * @param {import('mongoose').Document} caseDoc
     * @param {object} config
     * @returns {number}
     * @private
     */
    _required(caseDoc, config) {
        return config?.approvalRequirements?.moderator ?? 1;
    }
}

module.exports = ReviewService;

'use strict';

/**
 * @fileoverview ReviewEmbedBuilder
 * Builds the review embed posted to the review channel when a case is created,
 * and updates it as approvals or rejections are recorded.
 *
 * The embed is the source of truth for reviewers — it must show:
 *   - Case ID, target user, punishment type, category
 *   - Duration (for timeouts) — explicitly labelled as already-applied
 *   - Evidence (thumbnail / field links)
 *   - Duplicate warning if suspected
 *   - Risk tier and repeat offender flag
 *   - Current approval state (votes collected / required)
 *   - Status (Pending / Approved / Rejected / Expired)
 *
 * No Discord API calls. Returns EmbedBuilder and ActionRowBuilder instances only.
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { Colors } = require('../../utils/EmbedHelper');

// ── Risk tier colours ──────────────────────────────────────────────────────────
const RISK_COLORS = {
    Low:      0x57F287,  // Green
    Medium:   0xFEE75C,  // Yellow
    High:     0xED4245,  // Red
    Critical: 0x9B59B6   // Purple
};

const STATUS_LABELS = {
    Pending:   '🕐 Pending Review',
    Approved:  '✅ Approved',
    Rejected:  '❌ Rejected',
    Expired:   '⌛ Expired',
    Cleared:   '🔄 Cleared',
    Completed: '✔️ Completed'
};

class ReviewEmbedBuilder {

    /**
     * Build the initial review embed for a newly created case.
     *
     * @param {object} opts
     * @param {import('mongoose').Document} opts.caseDoc         Case document
     * @param {import('discord.js').User}   opts.targetUser      Fetched Discord user
     * @param {import('discord.js').User}   opts.moderatorUser   Fetched Discord user
     * @param {object}                      opts.config          Aegis guild config
     * @returns {{ embed: EmbedBuilder, row: ActionRowBuilder }}
     */
    static build({ caseDoc, targetUser, moderatorUser, config }) {
        const snapshot  = caseDoc.punishmentTypeSnapshot;
        const isTimeout = snapshot.category === 'timeout';
        const riskColor = RISK_COLORS[caseDoc.riskTierSnapshot] ?? Colors.PRIMARY;

        const embed = new EmbedBuilder()
            .setColor(riskColor)
            .setTitle(`Case #${caseDoc.caseId} — ${snapshot.name}`)
            .setTimestamp(caseDoc.createdAt)
            .setFooter({ text: `Case ID: ${caseDoc.caseId} • Aegis V3` });

        // ── Target ──────────────────────────────────────────────────────────
        embed.addFields({
            name:   'Target',
            value:  `${targetUser} (\`${targetUser.id}\`)`,
            inline: true
        });

        // ── Submitted by ────────────────────────────────────────────────────
        embed.addFields({
            name:   'Submitted by',
            value:  `${moderatorUser} (\`${moderatorUser.id}\`)`,
            inline: true
        });

        // ── Category / Duration ──────────────────────────────────────────────
        if (isTimeout && snapshot.duration) {
            const mins = Math.round(snapshot.duration / 60000);
            embed.addFields({
                name:   'Punishment',
                value:  `Timeout — **${ReviewEmbedBuilder._formatDuration(snapshot.duration)}**\n⚠️ *Timeout applied immediately. Rejection will revert it.*`,
                inline: false
            });
        } else {
            embed.addFields({
                name:   'Punishment',
                value:  'Warning (no Discord action)',
                inline: false
            });
        }

        // ── Risk ────────────────────────────────────────────────────────────
        const riskLine = caseDoc.riskTierSnapshot
            ? `**${caseDoc.riskTierSnapshot}** risk tier`
            : 'No risk data';
        embed.addFields({
            name:   'User Risk',
            value:  riskLine,
            inline: true
        });

        // ── Approvals ───────────────────────────────────────────────────────
        const required = ReviewEmbedBuilder._requiredApprovals(caseDoc, config);
        embed.addFields({
            name:   'Approvals',
            value:  `0 / ${required} required`,
            inline: true
        });

        // ── Status ──────────────────────────────────────────────────────────
        embed.addFields({
            name:   'Status',
            value:  STATUS_LABELS['Pending'],
            inline: true
        });

        // ── Duplicate warning ───────────────────────────────────────────────
        if (caseDoc.duplicateSuspected) {
            embed.addFields({
                name:   '⚠️ Duplicate Suspected',
                value:  'A similar recent case exists for this user and punishment type.',
                inline: false
            });
        }

        // ── Evidence ────────────────────────────────────────────────────────
        if (caseDoc.evidenceUrls?.length > 0) {
            embed.addFields({
                name:   `Evidence (${caseDoc.evidenceUrls.length})`,
                value:  caseDoc.evidenceUrls.map((u, i) => `[Attachment ${i + 1}](${u})`).join('\n'),
                inline: false
            });
            // Set first image as thumbnail if it looks like an image URL.
            if (/\.(png|jpg|jpeg|gif|webp)(\?|$)/i.test(caseDoc.evidenceUrls[0])) {
                embed.setThumbnail(caseDoc.evidenceUrls[0]);
            }
        }

        if (caseDoc.evidenceIncomplete) {
            embed.addFields({
                name:   '⚠️ Evidence Incomplete',
                value:  'One or more attachments failed to upload. Review carefully.',
                inline: false
            });
        }

        const row = ReviewEmbedBuilder._buildActionRow(caseDoc.caseId);
        return { embed, row };
    }

    /**
     * Update the embed to reflect a new approval (threshold not yet met).
     *
     * @param {EmbedBuilder} embed
     * @param {import('mongoose').Document} caseDoc  Updated case document
     * @param {object} config  Aegis guild config
     * @returns {EmbedBuilder}
     */
    static updateApproval(embed, caseDoc, config) {
        const approvalCount = caseDoc.approvals.filter(a => a.decision === 'approved').length;
        const required      = ReviewEmbedBuilder._requiredApprovals(caseDoc, config);

        return ReviewEmbedBuilder._replaceField(
            embed,
            'Approvals',
            `${approvalCount} / ${required} required`
        );
    }

    /**
     * Update the embed to reflect case approval (threshold met).
     *
     * @param {EmbedBuilder} embed
     * @param {import('mongoose').Document} caseDoc
     * @param {object} config
     * @returns {EmbedBuilder}
     */
    static markApproved(embed, caseDoc, config) {
        const approvalCount = caseDoc.approvals.filter(a => a.decision === 'approved').length;
        const required      = ReviewEmbedBuilder._requiredApprovals(caseDoc, config);
        embed.setColor(Colors.SUCCESS);
        ReviewEmbedBuilder._replaceField(embed, 'Approvals', `${approvalCount} / ${required} required`);
        ReviewEmbedBuilder._replaceField(embed, 'Status',    STATUS_LABELS['Approved']);
        return embed;
    }

    /**
     * Update the embed to reflect case rejection.
     *
     * @param {EmbedBuilder} embed
     * @param {string} reason
     * @returns {EmbedBuilder}
     */
    static markRejected(embed, reason) {
        embed.setColor(Colors.ERROR);
        ReviewEmbedBuilder._replaceField(embed, 'Status', STATUS_LABELS['Rejected']);
        // Add rejection reason as a new field (only add once).
        const data = embed.data;
        const alreadyHasReason = data.fields?.some(f => f.name === 'Rejection Reason');
        if (!alreadyHasReason) {
            embed.addFields({
                name:   'Rejection Reason',
                value:  reason.slice(0, 1024),
                inline: false
            });
        }
        return embed;
    }

    /**
     * Update the embed to reflect case expiry.
     * @param {EmbedBuilder} embed
     * @returns {EmbedBuilder}
     */
    static markExpired(embed) {
        embed.setColor(Colors.NEUTRAL);
        ReviewEmbedBuilder._replaceField(embed, 'Status', STATUS_LABELS['Expired']);
        return embed;
    }

    // ── Private Helpers ────────────────────────────────────────────────────────

    /**
     * Build the Approve / Reject action row for a given case ID.
     * @param {number} caseId
     * @returns {ActionRowBuilder}
     * @private
     */
    static _buildActionRow(caseId) {
        const approveBtn = new ButtonBuilder()
            .setCustomId(`aegis-approve-${caseId}`)
            .setLabel('Approve')
            .setStyle(ButtonStyle.Success);

        const rejectBtn = new ButtonBuilder()
            .setCustomId(`aegis-reject-${caseId}`)
            .setLabel('Reject')
            .setStyle(ButtonStyle.Danger);

        return new ActionRowBuilder().addComponents(approveBtn, rejectBtn);
    }

    /**
     * Determine required approval count from config.
     * Falls back to 1 if the config or tier mapping is absent.
     * @param {import('mongoose').Document} caseDoc
     * @param {object} config
     * @returns {number}
     * @private
     */
    static _requiredApprovals(caseDoc, config) {
        const reqs = config?.approvalRequirements ?? {};
        // Approval requirement is based on the submitter's tier stored in
        // the first approval sub-doc or defaults to 'moderator' tier (1).
        // The exact submitter tier is not stored on the case itself —
        // we use the moderator-level requirement as the minimum floor.
        return reqs.moderator ?? 1;
    }

    /**
     * Replace the value of a named field in-place on an EmbedBuilder.
     * @param {EmbedBuilder} embed
     * @param {string} name
     * @param {string} value
     * @returns {EmbedBuilder}
     * @private
     */
    static _replaceField(embed, name, value) {
        const fields = embed.data.fields ?? [];
        const idx = fields.findIndex(f => f.name === name);
        if (idx !== -1) {
            fields[idx].value = value;
        }
        return embed;
    }

    /**
     * Format a duration in milliseconds to a human-readable string.
     * @param {number} ms
     * @returns {string}
     * @private
     */
    static _formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const days    = Math.floor(totalSeconds / 86400);
        const hours   = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);

        const parts = [];
        if (days)    parts.push(`${days}d`);
        if (hours)   parts.push(`${hours}h`);
        if (minutes) parts.push(`${minutes}m`);
        return parts.length > 0 ? parts.join(' ') : '< 1m';
    }
}

module.exports = ReviewEmbedBuilder;

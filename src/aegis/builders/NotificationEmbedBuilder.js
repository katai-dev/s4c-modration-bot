'use strict';

/**
 * @fileoverview NotificationEmbedBuilder
 * Builds DM notification embeds sent to the target user when:
 *   - A timeout is applied and awaiting review (pending notification)
 *   - Their case is approved (action confirmed)
 *   - Their case is rejected (timeout reverted if applicable)
 *
 * Embeds are written from the target's perspective — staff-internal
 * language (tiers, approval counts, reviewer names) is intentionally
 * excluded. The target sees only what affects them directly.
 *
 * No Discord API calls. Returns EmbedBuilder instances only.
 */

const { EmbedBuilder } = require('discord.js');
const { Colors }       = require('../../utils/EmbedHelper');

class NotificationEmbedBuilder {

    /**
     * Embed sent when a timeout case is submitted and the timeout is
     * now active, but the decision is still pending review.
     *
     * @param {import('mongoose').Document} caseDoc
     * @param {string} guildName
     * @returns {EmbedBuilder}
     */
    static pendingTimeoutEmbed(caseDoc, guildName) {
        const snapshot = caseDoc.punishmentTypeSnapshot;
        const duration = NotificationEmbedBuilder._formatDuration(snapshot.duration);

        return new EmbedBuilder()
            .setColor(Colors.WARNING)
            .setTitle('You have been timed out — Under Review')
            .setDescription(
                `You have been timed out in **${guildName}** for **${duration}**.\n\n` +
                `This action is currently under review by the moderation team. ` +
                `If the review does not proceed, the timeout will be removed automatically.`
            )
            .addFields(
                { name: 'Reason',   value: snapshot.name, inline: true },
                { name: 'Duration', value: duration,       inline: true },
                { name: 'Case',     value: `#${caseDoc.caseId}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${guildName} • Aegis Moderation` });
    }

    /**
     * Embed sent when a warn case is submitted and is awaiting review.
     * No Discord action has been applied yet — the target is informed proactively.
     *
     * @param {import('mongoose').Document} caseDoc
     * @param {string} guildName
     * @returns {EmbedBuilder}
     */
    static pendingWarnEmbed(caseDoc, guildName) {
        const snapshot = caseDoc.punishmentTypeSnapshot;

        return new EmbedBuilder()
            .setColor(Colors.WARNING)
            .setTitle('A moderation action is being reviewed')
            .setDescription(
                `A warning has been submitted against you in **${guildName}** ` +
                `and is currently under review by the moderation team. ` +
                `You will be notified of the outcome.`
            )
            .addFields(
                { name: 'Reason', value: snapshot.name, inline: true },
                { name: 'Case',   value: `#${caseDoc.caseId}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${guildName} • Aegis Moderation` });
    }

    /**
     * Embed sent when a warn case is approved.
     *
     * @param {import('mongoose').Document} caseDoc
     * @param {string} guildName
     * @returns {EmbedBuilder}
     */
    static approvedWarnEmbed(caseDoc, guildName) {
        const snapshot = caseDoc.punishmentTypeSnapshot;

        return new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setTitle('Moderation Action — Warning Issued')
            .setDescription(
                `A warning has been issued against you in **${guildName}**. ` +
                `Please review the server rules to avoid further action.`
            )
            .addFields(
                { name: 'Reason', value: snapshot.name, inline: true },
                { name: 'Case',   value: `#${caseDoc.caseId}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${guildName} • Aegis Moderation` });
    }

    /**
     * Embed sent when a timeout case is approved (timeout remains active).
     *
     * @param {import('mongoose').Document} caseDoc
     * @param {string} guildName
     * @returns {EmbedBuilder}
     */
    static approvedTimeoutEmbed(caseDoc, guildName) {
        const snapshot = caseDoc.punishmentTypeSnapshot;
        const duration = NotificationEmbedBuilder._formatDuration(snapshot.duration);

        return new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setTitle('Moderation Action — Timeout Confirmed')
            .setDescription(
                `Your timeout in **${guildName}** has been reviewed and confirmed. ` +
                `The timeout will remain active for the full duration.`
            )
            .addFields(
                { name: 'Reason',   value: snapshot.name, inline: true },
                { name: 'Duration', value: duration,       inline: true },
                { name: 'Case',     value: `#${caseDoc.caseId}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${guildName} • Aegis Moderation` });
    }

    /**
     * Embed sent when a case is rejected.
     * If the case was a timeout, this also signals that the timeout has been reverted.
     *
     * @param {import('mongoose').Document} caseDoc
     * @param {string} guildName
     * @param {string} reason  Rejection reason from the reviewer
     * @returns {EmbedBuilder}
     */
    static rejectedEmbed(caseDoc, guildName, reason) {
        const snapshot  = caseDoc.punishmentTypeSnapshot;
        const isTimeout = snapshot.category === 'timeout';

        const description = isTimeout
            ? `The moderation action against you in **${guildName}** has been reviewed and **rejected**. ` +
              `Your timeout has been automatically removed.`
            : `The moderation action against you in **${guildName}** has been reviewed and **rejected**. ` +
              `No action will be taken.`;

        return new EmbedBuilder()
            .setColor(Colors.SUCCESS)
            .setTitle(isTimeout
                ? 'Timeout Reverted — Action Rejected'
                : 'Moderation Action Rejected'
            )
            .setDescription(description)
            .addFields(
                { name: 'Reason for Rejection', value: reason.slice(0, 1024), inline: false },
                { name: 'Case',                 value: `#${caseDoc.caseId}`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `${guildName} • Aegis Moderation` });
    }

    // ── Private Helpers ────────────────────────────────────────────────────────

    /**
     * Format duration in milliseconds to a human-readable string.
     * @param {number|null} ms
     * @returns {string}
     * @private
     */
    static _formatDuration(ms) {
        if (!ms) return 'Unknown';
        const totalSeconds = Math.floor(ms / 1000);
        const days    = Math.floor(totalSeconds / 86400);
        const hours   = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const parts   = [];
        if (days)    parts.push(`${days} day${days !== 1 ? 's' : ''}`);
        if (hours)   parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
        if (minutes) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
        return parts.length > 0 ? parts.join(', ') : 'Less than 1 minute';
    }
}

module.exports = NotificationEmbedBuilder;

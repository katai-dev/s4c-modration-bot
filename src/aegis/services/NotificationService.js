'use strict';

/**
 * @fileoverview NotificationService
 * Delivers DM notifications to target users at three lifecycle points:
 *   1. Pending  — immediately after case submission (timeout: timeout applied;
 *                 warn: under review notification)
 *   2. Approved — case confirmed; timeout remains active or warning issued
 *   3. Rejected — case rejected; timeout reverted if applicable
 *
 * All sends are fire-and-forget. DM failures are handled gracefully:
 *   - CannotSendMessagesToThisUser is logged at WARN level (expected condition)
 *   - All other errors are logged at ERROR level
 *   - On DM failure, the message is attempted in the fallback channel if configured
 *
 * This service performs no DB access and emits no audit entries.
 * Audit entries are the responsibility of the calling service (ReviewService/CaseService).
 */

const { DiscordAPIError, RESTJSONErrorCodes } = require('discord.js');
const NotificationEmbedBuilder = require('../builders/NotificationEmbedBuilder');

class NotificationService {

    // ── Pending Notifications ──────────────────────────────────────────────────

    /**
     * Notify the target that their case is pending review.
     * For timeouts: notifies that the timeout is active and under review.
     * For warns: notifies that a warning is under review.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {import('mongoose').Document} caseDoc
     * @returns {Promise<void>}
     */
    async notifyPending(client, caseDoc) {
        const guild    = client.guilds.cache.get(caseDoc.guildId);
        const guildName = guild?.name ?? 'the server';
        const snapshot  = caseDoc.punishmentTypeSnapshot;

        const embed = snapshot.category === 'timeout'
            ? NotificationEmbedBuilder.pendingTimeoutEmbed(caseDoc, guildName)
            : NotificationEmbedBuilder.pendingWarnEmbed(caseDoc, guildName);

        await this._send(client, caseDoc.guildId, caseDoc.targetId, embed);
    }

    // ── Approval Notifications ─────────────────────────────────────────────────

    /**
     * Notify the target that their case has been approved.
     * For timeouts: confirms the timeout remains active.
     * For warns: confirms the warning has been issued.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {import('mongoose').Document} caseDoc
     * @returns {Promise<void>}
     */
    async notifyApproval(client, caseDoc) {
        const guild     = client.guilds.cache.get(caseDoc.guildId);
        const guildName = guild?.name ?? 'the server';
        const snapshot  = caseDoc.punishmentTypeSnapshot;

        const embed = snapshot.category === 'timeout'
            ? NotificationEmbedBuilder.approvedTimeoutEmbed(caseDoc, guildName)
            : NotificationEmbedBuilder.approvedWarnEmbed(caseDoc, guildName);

        await this._send(client, caseDoc.guildId, caseDoc.targetId, embed);
    }

    // ── Rejection Notifications ────────────────────────────────────────────────

    /**
     * Notify the target that their case has been rejected.
     * For timeouts: informs them the timeout has been reverted.
     * For warns: informs them no action will be taken.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {import('mongoose').Document} caseDoc
     * @param {string} reason  Rejection reason from the reviewer
     * @returns {Promise<void>}
     */
    async notifyRejection(client, caseDoc, reason) {
        const guild     = client.guilds.cache.get(caseDoc.guildId);
        const guildName = guild?.name ?? 'the server';

        const embed = NotificationEmbedBuilder.rejectedEmbed(caseDoc, guildName, reason);

        await this._send(client, caseDoc.guildId, caseDoc.targetId, embed);
    }

    // ── Internal Send Logic ────────────────────────────────────────────────────

    /**
     * Attempt to DM a user. Falls back to the fallback channel on DM failure.
     * All errors are caught and logged. Never throws.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {string} userId
     * @param {import('discord.js').EmbedBuilder} embed
     * @returns {Promise<void>}
     * @private
     */
    async _send(client, guildId, userId, embed) {
        try {
            const user = await client.users.fetch(userId);
            await user.send({ embeds: [embed] });
        } catch (err) {
            const isDmBlocked = err instanceof DiscordAPIError &&
                err.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser;

            if (isDmBlocked) {
                client.logger.warn(
                    `[NotificationService] Cannot DM user ${userId} in guild ${guildId} ` +
                    `— DMs are disabled. Attempting fallback channel.`
                );
            } else {
                client.logger.error(
                    `[NotificationService] Failed to DM user ${userId} in guild ${guildId}: ${err.message}`
                );
            }

            // Attempt fallback channel delivery.
            await this._sendToFallback(client, guildId, embed);
        }
    }

    /**
     * Send a notification embed to the guild's configured fallback channel.
     * Silently skips if no fallback channel is configured or the channel
     * cannot be fetched.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {import('discord.js').EmbedBuilder} embed
     * @returns {Promise<void>}
     * @private
     */
    async _sendToFallback(client, guildId, embed) {
        try {
            const config    = await client.aegis.services.config.getConfig(client, guildId);
            const channelId = config?.fallbackChannelId;
            if (!channelId) return;

            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel?.isTextBased()) return;

            await channel.send({ embeds: [embed] });
        } catch (err) {
            client.logger.error(
                `[NotificationService] Failed to send to fallback channel in guild ${guildId}: ${err.message}`
            );
        }
    }
}

module.exports = NotificationService;

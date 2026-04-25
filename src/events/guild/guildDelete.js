/**
 * @fileoverview guildDelete Event
 * Fires when the bot is removed from a guild (kicked, server deleted, or banned).
 * Logs the event for monitoring purposes.
 *
 * NOTE: guild.name / guild.memberCount may be unavailable if the guild
 * was not cached. Always use optional chaining when accessing guild properties.
 */

const Event = require('../../structures/Event');

module.exports = new Event({
    name: 'guildDelete',
    run: async (client, guild) => {
        client.logger.warn(
            `Left guild: ${guild.name ?? 'Unknown'} (${guild.id}) ` +
            `| Members: ${guild.memberCount ?? '?'} ` +
            `| Remaining guilds: ${client.guilds.cache.size}`
        );
    }
});

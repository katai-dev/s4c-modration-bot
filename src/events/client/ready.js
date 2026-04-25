/**
 * @fileoverview Ready Event
 * Fires once the bot has successfully logged in and is ready to serve.
 * Logs shard info, guild count, and startup duration.
 */

const Event = require('../../structures/Event');

module.exports = new Event({
    name: 'ready',
    once: true, // Only fires once per process lifecycle
    run: async (client) => {
        const startupMs  = Date.now() - client.loginTimestamp;
        const guildCount = client.guilds.cache.size;

        // Shard-aware logging
        const shardId = client.shard?.ids?.[0];
        const shardTag = shardId !== undefined ? `[Shard #${shardId}]` : '';

        client.logger.success(
            `${shardTag} Logged in as ${client.user.tag} | ` +
            `${guildCount} guild(s) | Ready in ${startupMs}ms`
        );

        // ── Dynamic Status Rotation ───────────────────────────────────────────
        // Example of how to rotate statuses periodically.
        const statuses = [
            () => ({ name: `${client.guilds.cache.size} servers`, type: 3 }), // 3 = WATCHING
            () => ({ name: `Shard ${shardId ?? 0}`, type: 0 }),               // 0 = PLAYING
            () => ({ name: `${client.config.commands.prefix.symbol}help`, type: 2 }) // 2 = LISTENING
        ];

        let i = 0;
        setInterval(() => {
            const status = statuses[i]();
            client.user.setPresence({ activities: [status], status: 'online' });
            i = (i + 1) % statuses.length;
        }, 15000); // Rotate every 15 seconds
    }
});

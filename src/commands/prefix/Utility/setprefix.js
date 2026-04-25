const MessageCommand = require('../../../structures/MessageCommand');

module.exports = new MessageCommand({
    name: 'setprefix',
    description: 'Change the bot prefix for this server.',
    aliases: ['prefix'],
    cooldown: 10,
    guildOwnerOnly: true,
    permissions: ['ManageGuild'],
    run: async (client, message, args) => {
        const current = await client._resolvePrefix(message);

        if (!args[0]) {
            return message.reply(
                `ℹ️ Current prefix: \`${current}\`\n` +
                `Usage: \`${current}setprefix <new_prefix>\``
            );
        }

        const newPrefix = args[0];

        if (newPrefix.length > 5) {
            return message.reply('❌ Prefix cannot be longer than 5 characters.');
        }

        // Persist to database if connected
        if (client.db.isConnected) {
            try {
                const GuildSettings = client.db.model('GuildSettings');
                await GuildSettings.findOneAndUpdate(
                    { guildId: message.guild.id },
                    { prefix: newPrefix },
                    { upsert: true }
                );
            } catch (err) {
                client.logger.error(`setprefix DB error: ${err.message}`);
                return message.reply('❌ Failed to save prefix. Please try again.');
            }
        }

        // Always update the memory cache
        client.cache.prefixes.set(message.guild.id, newPrefix);

        await message.reply(`✅ Prefix changed to \`${newPrefix}\` for this server.`);
    }
});

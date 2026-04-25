const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('shards')
        .setDescription('[DEV] View information about all bot shards.'),
    devOnly: true,
    run: async (client, interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // If the bot isn't sharded, client.shard will be null
            if (!client.shard) {
                return interaction.editReply({
                    content: '❌ This bot is not currently running in sharded mode (start with `npm run shard`).'
                });
            }

            // Fetch data across all shards
            const promises = [
                client.shard.fetchClientValues('guilds.cache.size'),
                client.shard.fetchClientValues('ws.ping'),
                client.shard.broadcastEval(c => c.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)),
                client.shard.fetchClientValues('uptime')
            ];

            const [guilds, pings, members, uptimes] = await Promise.all(promises);

            const totalGuilds = guilds.reduce((acc, guildCount) => acc + guildCount, 0);
            const totalMembers = members.reduce((acc, memberCount) => acc + memberCount, 0);

            const embed = new EmbedBuilder()
                .setTitle('📡 Shard Status')
                .setColor(0x5865F2)
                .setDescription(`Total Guilds: **${totalGuilds}** | Total Members: **${totalMembers}**`)
                .setTimestamp();

            // Format data for each shard
            guilds.forEach((guildCount, shardId) => {
                const ping = pings[shardId];
                const memberCount = members[shardId];
                
                // Calculate uptime string
                const uptimeMs = uptimes[shardId];
                let uptimeStr = 'Unknown';
                if (uptimeMs) {
                    const days = Math.floor(uptimeMs / 86400000);
                    const hours = Math.floor(uptimeMs / 3600000) % 24;
                    const minutes = Math.floor(uptimeMs / 60000) % 60;
                    uptimeStr = `${days}d ${hours}h ${minutes}m`;
                }

                // Check if this is the current shard
                const isCurrent = client.shard.ids.includes(shardId) ? ' (Current)' : '';

                embed.addFields({
                    name: `Shard #${shardId}${isCurrent}`,
                    value: [
                        `> **Guilds:** ${guildCount}`,
                        `> **Members:** ${memberCount}`,
                        `> **Ping:** ${ping}ms`,
                        `> **Uptime:** ${uptimeStr}`
                    ].join('\n'),
                    inline: true
                });
            });

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            client.logger.error(`Error in /shards command: ${error.message}`);
            await interaction.editReply({
                content: `❌ Failed to fetch shard data: \`${error.message}\``
            });
        }
    }
});

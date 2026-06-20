'use strict';

const { SlashCommandBuilder } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');
const PointsEmbedBuilder = require('../../../aegis/builders/PointsEmbedBuilder');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('points')
        .setDescription('View moderation point leaderboards.'),
        
    permissions: [], 
    
    run: async (client, interaction) => {
        const guard = await client.systems.aegisPermissions.check(interaction, 1);
        if (!guard.passed) {
            return interaction.reply({ content: `❌ **Aegis V3**\nInsufficient permissions.`, flags: 64 });
        }

        await interaction.deferReply();

        try {
            const leaderboards = await client.aegis.services.staff.getLeaderboards(client, interaction.guildId);
            const embed = PointsEmbedBuilder.build(leaderboards);
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            client.logger.error(`[PointsCommand] Error: ${err.message}`);
            await interaction.editReply({ content: '⚠️ An error occurred fetching leaderboards.' });
        }
    }
});

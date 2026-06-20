'use strict';

const { SlashCommandBuilder } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');
const StaffPointsRepository = require('../../../database/repositories/StaffPointsRepository');
const StatsEmbedBuilder = require('../../../aegis/builders/StatsEmbedBuilder');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View moderation statistics for yourself or another staff member.')
        .addUserOption(opt => 
            opt.setName('staff')
               .setDescription('The staff member to view.')
               .setRequired(false)
        ),
        
    permissions: [], 
    
    run: async (client, interaction) => {
        const guard = await client.systems.aegisPermissions.check(interaction, 1);
        if (!guard.passed) {
            return interaction.reply({ content: `❌ **Aegis V3**\nInsufficient permissions.`, flags: 64 });
        }

        const targetUser = interaction.options.getUser('staff') || interaction.user;
        const guildId    = interaction.guildId;
        const staffId    = targetUser.id;

        await interaction.deferReply();

        try {
            const stats = await client.aegis.services.staff.getStaffStats(client, guildId, staffId);
            const points = await StaffPointsRepository.getOrCreate(guildId, staffId);

            const embed = StatsEmbedBuilder.build(stats, points, targetUser);
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            client.logger.error(`[StatsCommand] Error: ${err.message}`);
            await interaction.editReply({ content: '⚠️ An error occurred fetching stats.' });
        }
    }
});

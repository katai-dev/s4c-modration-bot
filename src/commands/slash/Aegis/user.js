'use strict';

const { SlashCommandBuilder } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');
const AegisUserRepository = require('../../../database/repositories/AegisUserRepository');
const CaseRepository = require('../../../database/repositories/CaseRepository');
const NoteRepository = require('../../../database/repositories/NoteRepository');
const UserHistoryEmbedBuilder = require('../../../aegis/builders/UserHistoryEmbedBuilder');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('View moderation history for a specific user.')
        .addUserOption(opt => 
            opt.setName('target')
               .setDescription('The user to view.')
               .setRequired(true)
        ),
        
    permissions: [], 
    
    run: async (client, interaction) => {
        const guard = await client.systems.aegisPermissions.check(interaction, 1);
        if (!guard.passed) {
            return interaction.reply({ content: `❌ **Aegis V3**\nInsufficient permissions.`, flags: 64 });
        }

        const targetUser = interaction.options.getUser('target');
        const guildId    = interaction.guildId;
        const targetId   = targetUser.id;

        await interaction.deferReply({ flags: 64 }); // Ephemeral by default for privacy

        try {
            const userDoc = await AegisUserRepository.findByUser(guildId, targetId);
            
            // Get active warnings (Approved, not escalated)
            const activeWarnings = await CaseRepository.findActiveWarnings(guildId, targetId, null); // null typeId = all types
            
            // Get recent cases (Last 5)
            const recentCases = await CaseRepository.findByTarget(guildId, targetId, { limit: 5 });
            
            // Get notes count
            const noteCount = await NoteRepository.countByTarget(guildId, targetId);

            const embed = UserHistoryEmbedBuilder.build(targetUser, userDoc, activeWarnings, recentCases, noteCount);
            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            client.logger.error(`[UserCommand] Error: ${err.message}`);
            await interaction.editReply({ content: '⚠️ An error occurred fetching user history.' });
        }
    }
});

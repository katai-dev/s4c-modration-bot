'use strict';

const { SlashCommandBuilder } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('note')
        .setDescription('Manage internal staff notes for a user.')
        .addSubcommand(sub => 
            sub.setName('add')
               .setDescription('Add a new note.')
               .addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true))
               .addStringOption(opt => opt.setName('content').setDescription('Note content').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('remove')
               .setDescription('Remove an existing note.')
               .addIntegerOption(opt => opt.setName('id').setDescription('Note ID').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('list')
               .setDescription('List all active notes for a user.')
               .addUserOption(opt => opt.setName('target').setDescription('User').setRequired(true))
        ),
        
    permissions: [], 
    
    run: async (client, interaction) => {
        const guard = await client.systems.aegisPermissions.check(interaction, 1);
        if (!guard.passed) {
            return interaction.reply({ content: `❌ **Aegis V3**\nInsufficient permissions.`, flags: 64 });
        }

        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        await interaction.deferReply({ flags: 64 });

        try {
            if (sub === 'add') {
                const targetId = interaction.options.getUser('target').id;
                const content  = interaction.options.getString('content');
                const note = await client.aegis.services.notes.addNote(client, guildId, targetId, interaction.user.id, content);
                await interaction.editReply({ content: `✅ Note \`#${note.noteId}\` added to target.` });
            } 
            else if (sub === 'remove') {
                const noteId = interaction.options.getInteger('id');
                const note = await client.aegis.services.notes.removeNote(client, guildId, noteId, interaction.user.id);
                if (note) {
                    await interaction.editReply({ content: `✅ Note \`#${noteId}\` removed.` });
                } else {
                    await interaction.editReply({ content: `❌ Note not found or already deleted.` });
                }
            }
            else if (sub === 'list') {
                const targetId = interaction.options.getUser('target').id;
                const notes = await client.aegis.services.notes.getUserNotes(client, guildId, targetId);
                if (!notes.length) {
                    await interaction.editReply({ content: 'No active notes for this user.' });
                    return;
                }
                const formatted = notes.map(n => `**#${n.noteId}** (by <@${n.authorId}>): ${n.content}`).join('\n');
                await interaction.editReply({ content: `**Notes for <@${targetId}>:**\n\n${formatted}` });
            }
        } catch (err) {
            client.logger.error(`[NoteCommand] Error: ${err.message}`);
            await interaction.editReply({ content: '⚠️ An error occurred processing notes.' });
        }
    }
});

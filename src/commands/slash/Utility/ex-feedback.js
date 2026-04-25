const {
    SlashCommandBuilder,
    ModalBuilder,
    ActionRowBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('ex-feedback')
        .setDescription('Submit feedback via a modal form (Example).'),
    cooldown: 30,
    run: async (client, interaction) => {
        const modal = new ModalBuilder()
            .setCustomId('ex-feedback-modal')
            .setTitle('📝 Submit Feedback');

        const titleInput = new TextInputBuilder()
            .setCustomId('feedback-title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Brief summary of your feedback...')
            .setRequired(true)
            .setMaxLength(100);

        const bodyInput = new TextInputBuilder()
            .setCustomId('feedback-body')
            .setLabel('Details')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe your feedback in detail...')
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(bodyInput)
        );

        await interaction.showModal(modal);
    }
});

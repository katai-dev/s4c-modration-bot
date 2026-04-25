const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const Button = require('../../structures/Button');

// This button opens the feedback modal when clicked.
module.exports = new Button({
    customId: 'open-example-modal',
    run: async (client, interaction) => {
        const modal = new ModalBuilder()
            .setCustomId('feedback-modal')
            .setTitle('📝 Submit Feedback');

        const titleInput = new TextInputBuilder()
            .setCustomId('feedback-title')
            .setLabel('Title')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Brief summary...')
            .setRequired(true)
            .setMaxLength(100);

        const bodyInput = new TextInputBuilder()
            .setCustomId('feedback-body')
            .setLabel('Details')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Describe in detail...')
            .setRequired(true)
            .setMaxLength(1000);

        modal.addComponents(
            new ActionRowBuilder().addComponents(titleInput),
            new ActionRowBuilder().addComponents(bodyInput)
        );

        await interaction.showModal(modal);
    }
});

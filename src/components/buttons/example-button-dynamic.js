const { MessageFlags } = require('discord.js');
const Button = require('../../structures/Button');

// ── Dynamic customId Example ───────────────────────────────────────────────────
// This button matches ANY customId like: ticket-close-12345, ticket-close-99999
// Real-world use: ticket systems, pagination, confirmations with entity IDs.
module.exports = new Button({
    customId: /^example-button-danger$/,
    authorOnly: true, // Only the original interaction author can click
    run: async (client, interaction) => {
        // Extract dynamic part from customId if needed:
        // const ticketId = interaction.customId.split('-')[2];

        await interaction.reply({
            content: '⚠️ You clicked the **Danger Button**! (author-only guard active)',
            flags: MessageFlags.Ephemeral
        });
    }
});

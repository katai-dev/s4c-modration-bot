const { MessageFlags } = require('discord.js');
const Button = require('../../structures/Button');

// ── Static customId Example ────────────────────────────────────────────────────
module.exports = new Button({
    customId: 'example-button',
    authorOnly: false,
    run: async (client, interaction) => {
        await interaction.reply({
            content: '👋 You clicked the **Example Button**!',
            flags: MessageFlags.Ephemeral
        });
    }
});

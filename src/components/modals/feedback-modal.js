const { MessageFlags } = require('discord.js');
const Modal = require('../../structures/Modal');

module.exports = new Modal({
    customId: 'feedback-modal',
    run: async (client, interaction) => {
        const title  = interaction.fields.getTextInputValue('feedback-title');
        const body   = interaction.fields.getTextInputValue('feedback-body');

        // In a real bot, you'd save this or forward it to a channel.
        // Example: await logsChannel.send({ content: `Feedback from ${interaction.user.tag}: **${title}** — ${body}` });

        await interaction.reply({
            content: [
                `✅ **Thank you for your feedback!**`,
                `> **Title:** ${title}`,
                `> **Details:** ${body.substring(0, 200)}`
            ].join('\n'),
            flags: MessageFlags.Ephemeral
        });
    }
});

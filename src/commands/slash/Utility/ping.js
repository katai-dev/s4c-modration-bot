const { SlashCommandBuilder } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot latency.'),
    cooldown: 5,
    run: async (client, interaction) => {
        const start = Date.now();
        const reply = await interaction.deferReply({ fetchReply: true });
        const roundtrip = Date.now() - start;

        await interaction.editReply({
            content: [
                `🏓 **Pong!**`,
                `> 📡 WebSocket: \`${client.ws.ping}ms\``,
                `> 🔁 Roundtrip: \`${roundtrip}ms\``
            ].join('\n')
        });
    }
});

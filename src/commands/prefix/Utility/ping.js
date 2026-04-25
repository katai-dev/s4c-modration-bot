const MessageCommand = require('../../../structures/MessageCommand');

module.exports = new MessageCommand({
    name: 'ping',
    description: 'Check the bot latency.',
    aliases: ['p', 'latency'],
    cooldown: 5,
    run: async (client, message, args) => {
        const start = Date.now();
        const sent  = await message.reply('🏓 Pinging...');
        const roundtrip = Date.now() - start;

        await sent.edit([
            `🏓 **Pong!**`,
            `> 📡 WebSocket: \`${client.ws.ping}ms\``,
            `> 🔁 Roundtrip: \`${roundtrip}ms\``
        ].join('\n'));
    }
});

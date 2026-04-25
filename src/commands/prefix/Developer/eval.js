const { AttachmentBuilder } = require('discord.js');
const MessageCommand = require('../../../structures/MessageCommand');

module.exports = new MessageCommand({
    name: 'eval',
    description: 'Evaluate JavaScript code. [DEV ONLY]',
    aliases: ['e'],
    devOnly: true,
    run: async (client, message, args) => {
        const code = args.join(' ');

        if (!code) return message.reply('❌ Provide code to evaluate.');

        try {
            // eslint-disable-next-line no-eval
            let result = eval(code);
            if (result instanceof Promise) result = await result;

            const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

            if (output.length > 1900) {
                const file = new AttachmentBuilder(Buffer.from(output, 'utf-8'), { name: 'output.js' });
                return message.reply({ content: '✅ Output too long — attached as file.', files: [file] });
            }

            await message.reply(`✅ **Result:**\n\`\`\`js\n${output}\n\`\`\``);
        } catch (err) {
            await message.reply(`❌ **Error:**\n\`\`\`js\n${err.message}\n\`\`\``);
        }
    }
});

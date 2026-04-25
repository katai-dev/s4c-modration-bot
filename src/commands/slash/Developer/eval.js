const {
    SlashCommandBuilder,
    AttachmentBuilder,
    MessageFlags
} = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluate JavaScript code. [DANGEROUS — Dev only]')
        .addStringOption(opt =>
            opt.setName('code')
               .setDescription('The code to evaluate.')
               .setRequired(true)
        ),
    devOnly: true,
    run: async (client, interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const code = interaction.options.getString('code');

        try {
            // eslint-disable-next-line no-eval
            let result = eval(code);
            if (result instanceof Promise) result = await result;

            const output = typeof result === 'string' ? result : JSON.stringify(result, null, 2);

            if (output.length > 1900) {
                const file = new AttachmentBuilder(Buffer.from(output, 'utf-8'), { name: 'output.js' });
                return interaction.editReply({ content: '✅ Output too long — attached as file.', files: [file] });
            }

            await interaction.editReply({ content: `✅ **Result:**\n\`\`\`js\n${output}\n\`\`\`` });
        } catch (err) {
            await interaction.editReply({ content: `❌ **Error:**\n\`\`\`js\n${err.message}\n\`\`\`` });
        }
    }
});

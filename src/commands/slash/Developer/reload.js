const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload all commands and components.'),
    devOnly: true,
    run: async (client, interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            await client.reload();
            await interaction.editReply({
                content: `✅ Successfully reloaded all commands and components.`
            });
        } catch (err) {
            await interaction.editReply({
                content: `❌ Reload failed: \`${err.message}\``
            });
        }
    }
});

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');
const Autocomplete = require('../../../structures/Autocomplete');

// ── Slash Command ──────────────────────────────────────────────────────────────
module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('color')
        .setDescription('Get info about a color.')
        .addStringOption(opt =>
            opt.setName('name')
               .setDescription('Color name')
               .setRequired(true)
               .setAutocomplete(true)
        ),
    cooldown: 5,
    run: async (client, interaction) => {
        const colorName = interaction.options.getString('name');

        const colors = {
            red: '#FF0000', blue: '#0000FF', green: '#00FF00',
            purple: '#800080', orange: '#FFA500', yellow: '#FFFF00',
            pink: '#FFC0CB', black: '#000000', white: '#FFFFFF', cyan: '#00FFFF'
        };

        const hex = colors[colorName.toLowerCase()];

        if (!hex) {
            return interaction.reply({
                content: `❌ Unknown color: \`${colorName}\``,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.reply({
            content: `🎨 **${colorName}** → \`${hex}\``,
            flags: MessageFlags.Ephemeral
        });
    }
});

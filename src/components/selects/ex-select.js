const { MessageFlags } = require('discord.js');
const SelectMenu = require('../../structures/SelectMenu');

module.exports = new SelectMenu({
    customId: 'ex-example-select',
    authorOnly: false,
    run: async (client, interaction) => {
        const selected = interaction.values[0];

        const responses = {
            'option-a': '🍎 You picked **Option A** — great choice!',
            'option-b': '🍌 You picked **Option B** — solid pick!',
            'option-c': '🍇 You picked **Option C** — nice!'
        };

        await interaction.reply({
            content: responses[selected] ?? `You selected: \`${selected}\``,
            flags: MessageFlags.Ephemeral
        });
    }
});

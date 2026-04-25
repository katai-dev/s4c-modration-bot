const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('ex-components')
        .setDescription('[DEV] Test all interactive components (Example).'),
    devOnly: true,
    run: async (client, interaction) => {
        const buttonRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ex-example-button')
                .setLabel('Click Me')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('👋'),
            new ButtonBuilder()
                .setCustomId('ex-example-button-danger')
                .setLabel('Danger')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('⚠️')
        );

        const selectRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('ex-example-select')
                .setPlaceholder('Choose an option...')
                .addOptions(
                    new StringSelectMenuOptionBuilder().setLabel('Option A').setValue('option-a').setEmoji('🍎'),
                    new StringSelectMenuOptionBuilder().setLabel('Option B').setValue('option-b').setEmoji('🍌'),
                    new StringSelectMenuOptionBuilder().setLabel('Option C').setValue('option-c').setEmoji('🍇')
                )
        );

        const modalRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ex-open-example-modal')
                .setLabel('Open Modal')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('📝')
        );

        await interaction.reply({
            content: '🧪 **Component Test** — try the button, select, and modal:',
            components: [buttonRow, selectRow, modalRow]
        });
    }
});

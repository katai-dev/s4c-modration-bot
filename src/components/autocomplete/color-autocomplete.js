/**
 * @fileoverview Autocomplete handler for the /color command.
 * Maps to commands that have .setAutocomplete(true) on their option.
 *
 * The Autocomplete structure's `commandName` must match the slash command name.
 * Galaxy Handler routes autocomplete interactions to this file automatically.
 */

const Autocomplete = require('../../../structures/Autocomplete');

const COLORS = ['red', 'blue', 'green', 'purple', 'orange', 'yellow', 'pink', 'black', 'white', 'cyan'];

module.exports = new Autocomplete({
    commandName: 'color',
    run: async (client, interaction) => {
        const focused = interaction.options.getFocused().toLowerCase();

        const choices = COLORS
            .filter(c => c.startsWith(focused))
            .slice(0, 25) // Discord limits autocomplete to 25 results
            .map(c => ({ name: c.charAt(0).toUpperCase() + c.slice(1), value: c }));

        await interaction.respond(choices);
    }
});

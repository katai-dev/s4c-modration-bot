/**
 * @fileoverview Autocomplete Structure
 * Use this to respond to autocomplete interactions for a specific slash command.
 *
 * @example
 * module.exports = new Autocomplete({
 *     commandName: 'search',
 *     run: async (client, interaction) => {
 *         const query = interaction.options.getFocused();
 *         const results = await searchDatabase(query);
 *         await interaction.respond(results.map(r => ({ name: r.label, value: r.id })));
 *     }
 * });
 */

class Autocomplete {
    /**
     * @param {object} options
     * @param {string} options.commandName
     *   The name of the slash command this autocomplete belongs to.
     * @param {function(import('./GalaxyClient'), import('discord.js').AutocompleteInteraction): Promise<void>} options.run
     */
    constructor(options) {
        this.commandName = options.commandName;
        this.run         = options.run;

        /** @internal */
        this.__type = 'autocomplete';
    }
}

module.exports = Autocomplete;

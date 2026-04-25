/**
 * @fileoverview SelectMenu Structure
 * Use this to handle all select menu interactions
 * (String, User, Role, Mentionable, Channel select menus).
 *
 * The `customId` supports exact strings and RegExp patterns.
 *
 * @example
 * module.exports = new SelectMenu({
 *     customId: 'role-picker',
 *     authorOnly: true,
 *     run: async (client, interaction) => {
 *         const selected = interaction.values;
 *         // ...
 *     }
 * });
 */

class SelectMenu {
    /**
     * @param {object} options
     * @param {string|RegExp} options.customId   Exact customId string OR RegExp pattern.
     * @param {boolean} [options.authorOnly=false]
     * @param {import('discord.js').PermissionResolvable[]} [options.permissions=[]]
     * @param {function(import('./GalaxyClient'), import('discord.js').AnySelectMenuInteraction): Promise<void>} options.run
     */
    constructor(options) {
        this.customId    = options.customId;
        this.authorOnly  = options.authorOnly ?? false;
        this.permissions = options.permissions ?? [];
        this.run         = options.run;

        /** @internal */
        this.__type = 'select';
    }
}

module.exports = SelectMenu;

/**
 * @fileoverview Button Structure
 * Use this to handle button interactions.
 *
 * The `customId` supports:
 *  - Exact match: `'my-button'`
 *  - RegExp pattern: `/^ticket-close-\d+$/`
 *  This allows you to handle dynamic IDs like `ticket-close-12345`.
 *
 * @example
 * module.exports = new Button({
 *     customId: 'confirm-action',
 *     authorOnly: true,
 *     run: async (client, interaction) => { ... }
 * });
 *
 * @example Dynamic customId
 * module.exports = new Button({
 *     customId: /^ticket-close-\d+$/,
 *     run: async (client, interaction) => { ... }
 * });
 */

class Button {
    /**
     * @param {object} options
     * @param {string|RegExp} options.customId   Exact customId string OR RegExp pattern.
     * @param {boolean} [options.authorOnly=false]
     *   If true, only the user who triggered the original interaction can click this button.
     * @param {import('discord.js').PermissionResolvable[]} [options.permissions=[]]
     * @param {function(import('./GalaxyClient'), import('discord.js').ButtonInteraction): Promise<void>} options.run
     */
    constructor(options) {
        this.customId    = options.customId;
        this.authorOnly  = options.authorOnly ?? false;
        this.permissions = options.permissions ?? [];
        this.run         = options.run;

        /** @internal */
        this.__type = 'button';
    }
}

module.exports = Button;

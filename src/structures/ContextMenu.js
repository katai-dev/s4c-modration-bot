/**
 * @fileoverview ContextMenu Structure
 * Use this for User Context Menu and Message Context Menu commands.
 *
 * @example
 * const { ApplicationCommandType } = require('discord.js');
 *
 * module.exports = new ContextMenu({
 *     data: new ContextMenuCommandBuilder()
 *         .setName('User Info')
 *         .setType(ApplicationCommandType.User),
 *     devOnly: false,
 *     run: async (client, interaction) => { ... }
 * });
 */

class ContextMenu {
    /**
     * @param {object} options
     * @param {import('discord.js').ContextMenuCommandBuilder|object} options.data
     *   The context menu builder or raw API data.
     * @param {number}  [options.cooldown=0]         Cooldown in seconds.
     * @param {'user'|'guild'|'channel'} [options.cooldownScope]
     * @param {boolean} [options.devOnly=false]
     * @param {boolean} [options.ownerOnly=false]
     * @param {boolean} [options.guildOwnerOnly=false]
     * @param {boolean} [options.guildOnly=true]
     * @param {import('discord.js').PermissionResolvable[]} [options.permissions=[]]
     * @param {function(import('./GalaxyClient'), import('discord.js').ContextMenuCommandInteraction): Promise<void>} options.run
     */
    constructor(options) {
        this.data           = options.data;
        this.cooldown       = options.cooldown ?? 0;
        this.cooldownScope  = options.cooldownScope ?? null;
        this.devOnly        = options.devOnly ?? false;
        this.ownerOnly      = options.ownerOnly ?? false;
        this.guildOwnerOnly = options.guildOwnerOnly ?? false;
        this.guildOnly      = options.guildOnly ?? true;
        this.permissions    = options.permissions ?? [];
        this.run            = options.run;

        /** @internal */
        this.__type = 'context';
    }
}

module.exports = ContextMenu;

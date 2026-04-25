/**
 * @fileoverview SlashCommand Structure
 * Use this to define all slash (chat input) commands.
 *
 * @example
 * module.exports = new SlashCommand({
 *     data: new SlashCommandBuilder().setName('ping').setDescription('Pong!'),
 *     cooldown: 5,
 *     devOnly: false,
 *     ownerOnly: false,
 *     permissions: [],
 *     run: async (client, interaction) => { ... }
 * });
 */

class SlashCommand {
    /**
     * @param {object} options
     * @param {import('discord.js').SlashCommandBuilder|import('discord.js').ContextMenuCommandBuilder|object} options.data
     *   The command builder or raw API data object.
     * @param {number}  [options.cooldown=0]         Cooldown in seconds. 0 = no cooldown.
     * @param {'user'|'guild'|'channel'} [options.cooldownScope]  Overrides global cooldown scope.
     * @param {boolean} [options.devOnly=false]       Restrict to bot developers only.
     * @param {boolean} [options.ownerOnly=false]     Restrict to bot owner only.
     * @param {boolean} [options.guildOwnerOnly=false] Restrict to guild owner only.
     * @param {boolean} [options.guildOnly=true]      Block usage in DMs.
     * @param {import('discord.js').PermissionResolvable[]} [options.permissions=[]]
     *   Discord permissions the user must have.
     * @param {function(import('./GalaxyClient'), import('discord.js').ChatInputCommandInteraction): Promise<void>} options.run
     *   The function executed when the command is invoked.
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

        /** @internal Used by the handler to identify structure type */
        this.__type = 'slash';
    }
}

module.exports = SlashCommand;

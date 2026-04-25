/**
 * @fileoverview MessageCommand Structure
 * Use this to define prefix/text commands.
 *
 * @example
 * module.exports = new MessageCommand({
 *     name: 'ping',
 *     description: 'Replies with Pong!',
 *     aliases: ['p'],
 *     cooldown: 5,
 *     devOnly: false,
 *     permissions: ['SendMessages'],
 *     run: async (client, message, args) => { ... }
 * });
 */

class MessageCommand {
    /**
     * @param {object} options
     * @param {string}   options.name              Command name (used after the prefix).
     * @param {string}   [options.description]     Short description of the command.
     * @param {string[]} [options.aliases=[]]      Alternate names for the command.
     * @param {number}   [options.cooldown=0]      Cooldown in seconds. 0 = no cooldown.
     * @param {'user'|'guild'|'channel'} [options.cooldownScope] Overrides global scope.
     * @param {boolean}  [options.devOnly=false]   Restrict to bot developers only.
     * @param {boolean}  [options.ownerOnly=false] Restrict to bot owner only.
     * @param {boolean}  [options.guildOwnerOnly=false] Restrict to guild owner only.
     * @param {boolean}  [options.nsfw=false]      Allow only in NSFW channels.
     * @param {boolean}  [options.guildOnly=true]  Block usage in DMs.
     * @param {import('discord.js').PermissionResolvable[]} [options.permissions=[]]
     * @param {function(import('./GalaxyClient'), import('discord.js').Message, string[]): Promise<void>} options.run
     */
    constructor(options) {
        this.name           = options.name;
        this.description    = options.description ?? 'No description provided.';
        this.aliases        = options.aliases ?? [];
        this.cooldown       = options.cooldown ?? 0;
        this.cooldownScope  = options.cooldownScope ?? null;
        this.devOnly        = options.devOnly ?? false;
        this.ownerOnly      = options.ownerOnly ?? false;
        this.guildOwnerOnly = options.guildOwnerOnly ?? false;
        this.nsfw           = options.nsfw ?? false;
        this.guildOnly      = options.guildOnly ?? true;
        this.permissions    = options.permissions ?? [];
        this.run            = options.run;

        /** @internal */
        this.__type = 'message';
    }
}

module.exports = MessageCommand;

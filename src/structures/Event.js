/**
 * @fileoverview Event Structure
 * Use this to define Discord client event listeners.
 *
 * @template {keyof import('discord.js').ClientEvents} K
 *
 * @example Once event (fires only once):
 * module.exports = new Event({
 *     name: 'clientReady',
 *     once: true,
 *     run: async (client, readyClient) => {
 *         console.log(`Logged in as ${readyClient.user.tag}`);
 *     }
 * });
 *
 * @example Recurring event:
 * module.exports = new Event({
 *     name: 'guildMemberAdd',
 *     run: async (client, member) => {
 *         // ...
 *     }
 * });
 */

class Event {
    /**
     * @param {object} options
     * @param {K} options.name          The Discord.js event name (e.g. 'messageCreate').
     * @param {boolean} [options.once=false]  If true, the listener fires only once.
     * @param {function(import('../client/GalaxyClient'), ...import('discord.js').ClientEvents[K]): Promise<void>} options.run
     */
    constructor(options) {
        this.name  = options.name;
        this.once  = options.once ?? false;
        this.run   = options.run;

        /** @internal */
        this.__type = 'event';
    }
}

module.exports = Event;

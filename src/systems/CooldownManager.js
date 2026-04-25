/**
 * @fileoverview CooldownManager
 * Handles per-user, per-guild, and per-channel cooldowns for commands.
 * Uses in-memory Collections with automatic cleanup via setTimeout.
 */

const { Collection } = require('discord.js');

class CooldownManager {
    constructor() {
        /**
         * Map: `${scope}:${scopeId}:${commandKey}` → timestamp (ms) cooldown expires
         * @type {Collection<string, number>}
         */
        this._store = new Collection();
    }

    /**
     * Build the unique cooldown key.
     * @param {import('discord.js').Interaction|import('discord.js').Message} interaction
     * @param {object} command  A SlashCommand or MessageCommand instance.
     * @param {'user'|'guild'|'channel'} scope
     * @returns {string}
     * @private
     */
    _buildKey(interaction, command, scope) {
        const commandName = command.name
            ?? (typeof command.data?.name === 'string' ? command.data.name : command.data?.toJSON?.()?.name ?? 'unknown');

        let scopeId;
        switch (scope) {
            case 'guild':   scopeId = interaction.guildId ?? interaction.guild?.id ?? 'dm'; break;
            case 'channel': scopeId = interaction.channelId ?? interaction.channel?.id ?? 'dm'; break;
            default:        scopeId = interaction.user?.id ?? interaction.author?.id ?? 'unknown'; break;
        }

        return `${scope}:${scopeId}:${commandName}`;
    }

    /**
     * Get the effective cooldown scope for a command.
     * Prefers command-specific scope, then global config default.
     * @param {object} command
     * @param {import('../GalaxyClient')} client
     * @returns {'user'|'guild'|'channel'}
     * @private
     */
    _getScope(command, client) {
        return command.cooldownScope
            ?? client?.config?.systems?.cooldowns?.defaultScope
            ?? 'user';
    }

    /**
     * Get the effective cooldown duration in seconds.
     * Prefers command-specific, then global config default.
     * @param {object} command
     * @param {import('../GalaxyClient')} client
     * @returns {number} seconds
     * @private
     */
    _getDuration(command, client) {
        if (typeof command.cooldown === 'number' && command.cooldown > 0) {
            return command.cooldown;
        }
        return client?.config?.systems?.cooldowns?.defaultSeconds ?? 0;
    }

    /**
     * Check if a user/guild/channel is on cooldown for a command.
     * @param {import('discord.js').Interaction|import('discord.js').Message} interaction
     * @param {object} command
     * @param {import('../GalaxyClient')} [client]
     * @returns {{ allowed: boolean, remaining: number }} remaining = seconds left (0 if allowed)
     */
    check(interaction, command, client) {
        const duration = this._getDuration(command, client);
        if (duration <= 0) return { allowed: true, remaining: 0 };

        const scope = this._getScope(command, client);
        const key   = this._buildKey(interaction, command, scope);

        if (!this._store.has(key)) return { allowed: true, remaining: 0 };

        const expiresAt = this._store.get(key);
        const now       = Date.now();

        if (now >= expiresAt) {
            this._store.delete(key);
            return { allowed: true, remaining: 0 };
        }

        const remaining = ((expiresAt - now) / 1000).toFixed(1);
        return { allowed: false, remaining };
    }

    /**
     * Set a cooldown for an interaction/command.
     * @param {import('discord.js').Interaction|import('discord.js').Message} interaction
     * @param {object} command
     * @param {import('../GalaxyClient')} [client]
     */
    set(interaction, command, client) {
        const duration = this._getDuration(command, client);
        if (duration <= 0) return;

        const scope     = this._getScope(command, client);
        const key       = this._buildKey(interaction, command, scope);
        const expiresAt = Date.now() + duration * 1000;

        this._store.set(key, expiresAt);

        // Auto-cleanup when cooldown expires
        setTimeout(() => this._store.delete(key), duration * 1000);
    }

    /**
     * Manually reset a cooldown (e.g. after a failed command).
     * @param {import('discord.js').Interaction|import('discord.js').Message} interaction
     * @param {object} command
     * @param {import('../GalaxyClient')} [client]
     */
    reset(interaction, command, client) {
        const scope = this._getScope(command, client);
        const key   = this._buildKey(interaction, command, scope);
        this._store.delete(key);
    }

    /**
     * Clear all stored cooldowns.
     */
    clear() {
        this._store.clear();
    }

    /** @returns {number} Total active cooldown entries */
    get size() {
        return this._store.size;
    }
}

module.exports = CooldownManager;

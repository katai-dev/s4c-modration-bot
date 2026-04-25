/**
 * @fileoverview CooldownManager
 * Handles per-user, per-guild, and per-channel cooldowns for commands.
 * Supports Redis for distributed caching across shards, falling back to local memory.
 */

const { Collection } = require('discord.js');

class CooldownManager {
    constructor() {
        /**
         * Local fallback map if Redis is not enabled.
         * Map: `${scope}:${scopeId}:${commandKey}` → timestamp (ms) cooldown expires
         * @type {Collection<string, number>}
         */
        this._localStore = new Collection();
    }

    /**
     * Build the unique cooldown key.
     * @param {import('discord.js').Interaction|import('discord.js').Message} interaction
     * @param {object} command
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

        return `cooldown:${scope}:${scopeId}:${commandName}`;
    }

    /**
     * @private
     */
    _getScope(command, client) {
        return command.cooldownScope
            ?? client?.config?.systems?.cooldowns?.defaultScope
            ?? 'user';
    }

    /**
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
     * @returns {Promise<{ allowed: boolean, remaining: number }>}
     */
    async check(interaction, command, client) {
        const duration = this._getDuration(command, client);
        if (duration <= 0) return { allowed: true, remaining: 0 };

        const scope = this._getScope(command, client);
        const key   = this._buildKey(interaction, command, scope);

        // Try Redis first
        if (client?.systems?.redis?.isConnected) {
            const expiresAtStr = await client.systems.redis.connection.get(key);
            if (!expiresAtStr) return { allowed: true, remaining: 0 };

            const expiresAt = parseInt(expiresAtStr, 10);
            const now = Date.now();
            if (now >= expiresAt) return { allowed: true, remaining: 0 };

            const remaining = ((expiresAt - now) / 1000).toFixed(1);
            return { allowed: false, remaining };
        }

        // Fallback to local memory
        if (!this._localStore.has(key)) return { allowed: true, remaining: 0 };

        const expiresAt = this._localStore.get(key);
        const now       = Date.now();

        if (now >= expiresAt) {
            this._localStore.delete(key);
            return { allowed: true, remaining: 0 };
        }

        const remaining = ((expiresAt - now) / 1000).toFixed(1);
        return { allowed: false, remaining };
    }

    /**
     * Set a cooldown for an interaction/command.
     * @returns {Promise<void>}
     */
    async set(interaction, command, client) {
        const duration = this._getDuration(command, client);
        if (duration <= 0) return;

        const scope     = this._getScope(command, client);
        const key       = this._buildKey(interaction, command, scope);
        const expiresAt = Date.now() + duration * 1000;

        if (client?.systems?.redis?.isConnected) {
            // EX adds expiration in seconds (we use Math.ceil to ensure it doesn't expire too early)
            await client.systems.redis.connection.set(key, expiresAt.toString(), 'EX', Math.ceil(duration));
        } else {
            this._localStore.set(key, expiresAt);
            setTimeout(() => this._localStore.delete(key), duration * 1000);
        }
    }

    /**
     * Manually reset a cooldown.
     * @returns {Promise<void>}
     */
    async reset(interaction, command, client) {
        const scope = this._getScope(command, client);
        const key   = this._buildKey(interaction, command, scope);

        if (client?.systems?.redis?.isConnected) {
            await client.systems.redis.connection.del(key);
        } else {
            this._localStore.delete(key);
        }
    }

    /**
     * Clear all stored local cooldowns.
     * Note: Does not clear Redis.
     */
    clearLocal() {
        this._localStore.clear();
    }
}

module.exports = CooldownManager;

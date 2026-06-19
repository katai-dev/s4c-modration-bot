/**
 * @fileoverview ConfigService
 * Manages reading and writing Aegis guild configuration.
 *
 * All config is stored at GuildSettings.modules.aegis via GuildSettingsRepository.
 * ConfigService is the single point of truth for config access in Aegis.
 * No service, command, or component reads GuildSettings directly.
 *
 * Cache invalidation:
 *   Every write invalidates the Redis cache key 'aegis:config:{guildId}'.
 *   AegisPermissionGuard reads from DB directly in Phase 1 (Redis caching
 *   is added in Phase 7). ConfigService invalidates the key regardless so
 *   the Phase 7 integration has no migration burden.
 *
 * Usage:
 *   const config = await client.aegis.services.config.getConfig(client, guildId);
 *   await client.aegis.services.config.setConfig(client, guildId, { enabled: true });
 */

'use strict';

const GuildSettingsRepository = require('../../database/repositories/GuildSettingsRepository');
const { AEGIS_DEFAULT_CONFIG } = require('../../database/models/GuildSettings');

// Redis key pattern for Aegis config cache.
const CACHE_KEY = (guildId) => `aegis:config:${guildId}`;

class ConfigService {

    /**
     * Get the full Aegis config for a guild.
     * Merges stored config with defaults to ensure all keys are present.
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @returns {Promise<object>} Full Aegis config object
     */
    async getConfig(client, guildId) {
        return GuildSettingsRepository.getAegisConfig(guildId);
    }

    /**
     * Apply a partial patch to the guild's Aegis config.
     * Invalidates the Redis cache after the write.
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {object} patch Partial Aegis config (only provided keys are updated)
     * @returns {Promise<object>} The resulting full Aegis config
     */
    async patchConfig(client, guildId, patch) {
        const result = await GuildSettingsRepository.patchAegisConfig(guildId, patch);
        await this._invalidateCache(client, guildId);
        return result;
    }

    /**
     * Overwrite the full Aegis config for a guild.
     * Merges with defaults before writing.
     * Invalidates the Redis cache after the write.
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {object} config Full or partial Aegis config
     * @returns {Promise<object>} The saved Aegis config
     */
    async setConfig(client, guildId, config) {
        const result = await GuildSettingsRepository.setAegisConfig(guildId, config);
        await this._invalidateCache(client, guildId);
        return result;
    }

    /**
     * Check whether Aegis is enabled for a guild.
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @returns {Promise<boolean>}
     */
    async isEnabled(client, guildId) {
        return GuildSettingsRepository.isAegisEnabled(guildId);
    }

    /**
     * Return the default Aegis config object.
     * Useful for displaying current defaults in /config view.
     * @returns {object}
     */
    getDefaultConfig() {
        return { ...AEGIS_DEFAULT_CONFIG };
    }

    /**
     * Invalidate the Redis cache for a guild's Aegis config.
     * Silently no-ops if Redis is not connected.
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @returns {Promise<void>}
     * @private
     */
    async _invalidateCache(client, guildId) {
        if (!client.systems.redis?.isConnected) return;
        try {
            await client.systems.redis.connection.del(CACHE_KEY(guildId));
        } catch (err) {
            client.logger.error(`[ConfigService] Failed to invalidate Redis cache for guild ${guildId}: ${err.message}`);
        }
    }
}

module.exports = ConfigService;

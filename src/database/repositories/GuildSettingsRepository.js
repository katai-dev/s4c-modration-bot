/**
 * @fileoverview GuildSettingsRepository
 * All database access for GuildSettings documents, including Aegis config
 * stored at modules.get('aegis') (live documents) or modules.aegis (lean).
 *
 * GuildSettings.modules is a Mongoose Map type:
 *   - Live document: settings.modules.get('aegis') / settings.modules.set('aegis', val)
 *   - Lean result:   settings.modules?.aegis
 *
 * All Aegis config reads and writes MUST go through this repository.
 * No command, service, or handler may query GuildSettings directly.
 */

'use strict';

const GuildSettings = require('../models/GuildSettings');
const { AEGIS_DEFAULT_CONFIG } = GuildSettings;

class GuildSettingsRepository {

    /**
     * Get or create guild settings document.
     * @param {string} guildId
     * @returns {Promise<import('mongoose').Document>}
     */
    static async getOrCreate(guildId) {
        let settings = await GuildSettings.findOne({ guildId });
        if (!settings) {
            settings = await GuildSettings.create({ guildId });
        }
        return settings;
    }

    /**
     * Get the Aegis config for a guild.
     * Returns the default config if none has been set yet.
     * @param {string} guildId
     * @returns {Promise<object>} Aegis config object (plain, not a Mongoose Map)
     */
    static async getAegisConfig(guildId) {
        const settings = await GuildSettings.findOne({ guildId }).lean();
        if (!settings) return { ...AEGIS_DEFAULT_CONFIG };

        // lean() deserialises Map → plain object; key access is direct property.
        const aegis = settings.modules?.aegis;
        if (!aegis) return { ...AEGIS_DEFAULT_CONFIG };

        // Merge with defaults to ensure all keys are present even for older documents.
        return { ...AEGIS_DEFAULT_CONFIG, ...aegis };
    }

    /**
     * Overwrite the entire Aegis config for a guild.
     * Merges with defaults before writing to ensure completeness.
     * @param {string} guildId
     * @param {object} config Full or partial Aegis config object
     * @returns {Promise<object>} The saved Aegis config
     */
    static async setAegisConfig(guildId, config) {
        const merged = { ...AEGIS_DEFAULT_CONFIG, ...config };

        await GuildSettings.findOneAndUpdate(
            { guildId },
            { $set: { 'modules.aegis': merged } },
            { upsert: true, new: true }
        );

        return merged;
    }

    /**
     * Apply a partial patch to the Aegis config.
     * Only the provided keys are updated; all other keys are preserved.
     * @param {string} guildId
     * @param {object} patch Partial Aegis config object
     * @returns {Promise<object>} The resulting full Aegis config
     */
    static async patchAegisConfig(guildId, patch) {
        // Build a $set that only touches the provided keys using dot notation.
        // Nested objects (roles, approvalRequirements, rateLimit) are expanded one
        // level deeper so that e.g. patch.roles.moderator updates only that one field
        // rather than overwriting the entire roles sub-document.
        const setOp = {};
        for (const [key, value] of Object.entries(patch)) {
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                // Expand sub-object keys individually to avoid overwriting sibling fields.
                for (const [subKey, subVal] of Object.entries(value)) {
                    setOp[`modules.aegis.${key}.${subKey}`] = subVal;
                }
            } else {
                setOp[`modules.aegis.${key}`] = value;
            }
        }

        const updated = await GuildSettings.findOneAndUpdate(
            { guildId },
            { $set: setOp },
            { upsert: true, new: true }
        ).lean();

        const aegis = updated?.modules?.aegis;
        return { ...AEGIS_DEFAULT_CONFIG, ...aegis };
    }

    /**
     * Check whether Aegis is enabled for a guild.
     * @param {string} guildId
     * @returns {Promise<boolean>}
     */
    static async isAegisEnabled(guildId) {
        const settings = await GuildSettings.findOne(
            { guildId },
            { 'modules.aegis.enabled': 1 }
        ).lean();
        return settings?.modules?.aegis?.enabled === true;
    }
}

module.exports = GuildSettingsRepository;

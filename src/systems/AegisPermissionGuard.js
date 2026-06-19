/**
 * @fileoverview AegisPermissionGuard
 * Resolves a guild member's Aegis tier and checks tier-based access.
 *
 * Tier hierarchy (cumulative upward):
 *   1 = Moderator
 *   2 = Senior Moderator
 *   3 = Admin
 *   4 = Head Admin
 *
 * Tier resolution:
 *   1. Fetch guild Aegis config from DB via GuildSettingsRepository.
 *   2. Compare the member's Discord role IDs against the four tier mappings.
 *   3. Return the highest matching tier. If no match, tier = 0 (no access).
 *
 * This guard sits alongside (not replacing) GalaxyHandler's PermissionGuard.
 * PermissionGuard handles Discord BitField permissions. AegisPermissionGuard
 * handles Aegis role-tier permissions.
 *
 * Redis caching is deferred to Phase 7 hardening. All config reads in Phase 1
 * go directly to MongoDB via GuildSettingsRepository.
 *
 * Usage in a command run():
 *   const guard = await client.systems.aegisPermissions.check(interaction, 2);
 *   if (!guard.passed) return interaction.reply({ ... });
 */

'use strict';

const GuildSettingsRepository = require('../database/repositories/GuildSettingsRepository');

// Tier name labels for human-readable messages.
const TIER_NAMES = {
    0: 'None',
    1: 'Moderator',
    2: 'Senior Moderator',
    3: 'Admin',
    4: 'Head Admin'
};

class AegisPermissionGuard {

    /**
     * @param {import('../client/GalaxyClient')} client
     */
    constructor(client) {
        this.client = client;
    }

    /**
     * Check whether the interaction member meets the required tier.
     *
     * @param {import('discord.js').ChatInputCommandInteraction|import('discord.js').ButtonInteraction|import('discord.js').ModalSubmitInteraction} interaction
     * @param {number} requiredTier Minimum tier required (1-4)
     * @returns {Promise<{ passed: boolean, tier: number, tierName: string, reason?: string }>}
     */
    async check(interaction, requiredTier) {
        if (!interaction.guild) {
            return {
                passed: false,
                tier: 0,
                tierName: TIER_NAMES[0],
                reason: 'NOT_IN_GUILD'
            };
        }

        const tier = await this.getTier(interaction);

        if (tier < requiredTier) {
            return {
                passed: false,
                tier,
                tierName: TIER_NAMES[tier] ?? 'Unknown',
                reason: 'INSUFFICIENT_TIER',
                required: requiredTier,
                requiredName: TIER_NAMES[requiredTier] ?? 'Unknown'
            };
        }

        return {
            passed: true,
            tier,
            tierName: TIER_NAMES[tier] ?? 'Unknown'
        };
    }

    /**
     * Resolve the Aegis tier for the member in the interaction.
     * Returns 0 if the member has no matching Aegis role or Aegis is not configured.
     *
     * @param {import('discord.js').Interaction} interaction
     * @returns {Promise<number>} Tier (0-4)
     */
    async getTier(interaction) {
        if (!interaction.guild || !interaction.member) return 0;

        const guildId = interaction.guild.id;
        const memberRoles = interaction.member.roles?.cache;
        if (!memberRoles) return 0;

        const config = await this._getConfig(guildId);
        if (!config) return 0;

        const roles = config.roles ?? {};

        // Check from highest to lowest tier; return the first match.
        if (roles.headAdmin      && memberRoles.has(roles.headAdmin))      return 4;
        if (roles.admin          && memberRoles.has(roles.admin))          return 3;
        if (roles.seniorModerator && memberRoles.has(roles.seniorModerator)) return 2;
        if (roles.moderator      && memberRoles.has(roles.moderator))      return 1;

        return 0;
    }

    /**
     * Convenience: get the human-readable name for a tier number.
     * @param {number} tier
     * @returns {string}
     */
    tierName(tier) {
        return TIER_NAMES[tier] ?? 'Unknown';
    }

    /**
     * Load Aegis config for the guild.
     * Direct DB read. Redis caching deferred to Phase 7.
     * Returns null if the document does not exist.
     * @param {string} guildId
     * @returns {Promise<object|null>}
     * @private
     */
    async _getConfig(guildId) {
        try {
            return await GuildSettingsRepository.getAegisConfig(guildId);
        } catch (err) {
            this.client.logger.error(`[AegisPermissionGuard] Failed to load config for guild ${guildId}: ${err.message}`);
            return null;
        }
    }
}

module.exports = AegisPermissionGuard;

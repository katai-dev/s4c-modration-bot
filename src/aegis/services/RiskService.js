'use strict';

/**
 * @fileoverview RiskService
 * Calculates and applies risk score changes to AegisUser documents.
 *
 * Risk weights are read from the guild's Aegis config (riskWeights.warn and
 * riskWeights.timeout), with fallback defaults of warn=1 and timeout=3.
 * Weights are never hardcoded in callers — always resolved through this service.
 *
 * Tier thresholds (fixed in V3, not configurable):
 *   Low      0  – 2
 *   Medium   3  – 6
 *   High     7  – 12
 *   Critical 13+
 *
 * All DB access is delegated to repositories.
 * This service does not emit audit entries — callers are responsible.
 */

const AegisUserRepository = require('../../database/repositories/AegisUserRepository');
const CaseRepository       = require('../../database/repositories/CaseRepository');

// ── Tier Thresholds ────────────────────────────────────────────────────────────
const TIER_THRESHOLDS = [
    { tier: 'Critical', min: 13 },
    { tier: 'High',     min: 7  },
    { tier: 'Medium',   min: 3  },
    { tier: 'Low',      min: 0  }
];

// ── Default Weights (fallback when guild config has no riskWeights) ─────────────
const DEFAULT_WEIGHTS = { warn: 1, timeout: 3 };

// ── Repeat Offender Window ──────────────────────────────────────────────────────
const REPEAT_OFFENDER_DAYS    = 90;
const REPEAT_OFFENDER_THRESHOLD = 3;

class RiskService {

    // ── Weight Helpers ──────────────────────────────────────────────────────────

    /**
     * Resolve risk score weight for a category from guild config.
     * Falls back to defaults if config does not define riskWeights.
     *
     * @param {'warn'|'timeout'} category
     * @param {object} config  Aegis guild config from ConfigService
     * @returns {number}
     */
    scoreWeight(category, config) {
        const weights = config?.riskWeights ?? DEFAULT_WEIGHTS;
        return weights[category] ?? DEFAULT_WEIGHTS[category] ?? 1;
    }

    /**
     * Derive the risk tier string from a numeric risk score.
     *
     * @param {number} score
     * @returns {'Low'|'Medium'|'High'|'Critical'}
     */
    tierFromScore(score) {
        for (const { tier, min } of TIER_THRESHOLDS) {
            if (score >= min) return tier;
        }
        return 'Low';
    }

    // ── Application ────────────────────────────────────────────────────────────

    /**
     * Apply risk changes after a case is approved.
     * Increments risk score by the category weight, increments the punishment
     * count, recalculates the tier, and updates the repeat offender flag.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {string} userId
     * @param {'warn'|'timeout'} category
     * @param {object} config  Aegis guild config
     * @returns {Promise<{ riskScore: number, riskTier: string, isRepeatOffender: boolean }>}
     */
    async applyApproval(client, guildId, userId, category, config) {
        const weight = this.scoreWeight(category, config);

        // Fetch current score to compute new tier before write.
        const current = await AegisUserRepository.getOrCreate(guildId, userId);
        const rawScore = (current.riskScore ?? 0) + weight;
        const flooredScore = Math.max(0, rawScore);
        const newTier = this.tierFromScore(flooredScore);

        // Atomically increment score (repository enforces floor at 0).
        await AegisUserRepository.incrementRiskScore(guildId, userId, weight, newTier);

        // Increment punishment count by category.
        await AegisUserRepository.incrementPunishmentCount(guildId, userId, category);

        // Repeat offender check: 3+ Approved cases in 90 days.
        const since = new Date(Date.now() - REPEAT_OFFENDER_DAYS * 24 * 60 * 60 * 1000);
        const recentCount = await CaseRepository.countApproved(guildId, userId, since);
        const isRepeatOffender = recentCount >= REPEAT_OFFENDER_THRESHOLD;
        await AegisUserRepository.setRepeatOffender(guildId, userId, isRepeatOffender);

        // Return the final state from DB.
        const updated = await AegisUserRepository.findByUser(guildId, userId);
        return {
            riskScore:        updated?.riskScore        ?? flooredScore,
            riskTier:         updated?.riskTier         ?? newTier,
            isRepeatOffender: updated?.isRepeatOffender ?? isRepeatOffender
        };
    }

    /**
     * Apply a manual risk score override (for /override command, Phase 5).
     * Recalculates tier from the resulting score.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {string} userId
     * @param {number} scoreDelta  Positive or negative. Result floored at 0.
     * @param {object} config  Aegis guild config
     * @returns {Promise<{ riskScore: number, riskTier: string }>}
     */
    async applyOverride(client, guildId, userId, scoreDelta, config) {
        const current = await AegisUserRepository.getOrCreate(guildId, userId);
        const rawScore = (current.riskScore ?? 0) + scoreDelta;
        const flooredScore = Math.max(0, rawScore);
        const newTier = this.tierFromScore(flooredScore);

        // Use actual delta that lands at floored value.
        const actualDelta = flooredScore - (current.riskScore ?? 0);
        await AegisUserRepository.incrementRiskScore(guildId, userId, actualDelta, newTier);

        const updated = await AegisUserRepository.findByUser(guildId, userId);
        return {
            riskScore: updated?.riskScore ?? flooredScore,
            riskTier:  updated?.riskTier  ?? newTier
        };
    }
}

module.exports = RiskService;

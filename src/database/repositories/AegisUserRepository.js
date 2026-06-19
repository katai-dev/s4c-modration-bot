/**
 * @fileoverview AegisUserRepository
 * All database access for AegisUser documents.
 *
 * One document per (guildId, userId) pair.
 * All queries are scoped to a guildId. No cross-guild access.
 * Soft-delete pattern applies. Physical deletion is never performed.
 */

'use strict';

const AegisUser = require('../models/AegisUser');

class AegisUserRepository {

    /**
     * Get or create an AegisUser document for a guild member.
     * @param {string} guildId
     * @param {string} userId
     * @returns {Promise<import('mongoose').Document>}
     */
    static async getOrCreate(guildId, userId) {
        return AegisUser.findOneAndUpdate(
            { guildId, userId },
            { $setOnInsert: { guildId, userId } },
            { upsert: true, new: true }
        );
    }

    /**
     * Find an AegisUser by guild and user ID.
     * @param {string} guildId
     * @param {string} userId
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async findByUser(guildId, userId) {
        return AegisUser.findOne({ guildId, userId, isDeleted: false });
    }

    /**
     * Apply a patch to an AegisUser document.
     * @param {string} guildId
     * @param {string} userId
     * @param {object} patch
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async update(guildId, userId, patch) {
        return AegisUser.findOneAndUpdate(
            { guildId, userId, isDeleted: false },
            { $set: patch },
            { new: true }
        );
    }

    /**
     * Atomically increment the risk score and update the risk tier.
     * riskScore is floored at 0.
     * @param {string} guildId
     * @param {string} userId
     * @param {number} amount Points to add (can be negative for reductions)
     * @param {string} newTier Recalculated tier after increment
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async incrementRiskScore(guildId, userId, amount, newTier) {
        // Increment the score and update the tier.
        await AegisUser.updateOne(
            { guildId, userId },
            {
                $inc: { riskScore: amount },
                $set: { riskTier: newTier },
                $setOnInsert: { guildId, userId }
            },
            { upsert: true }
        );

        // Floor riskScore at 0. Mongoose min validators do not fire on $inc,
        // so we enforce the floor with a second conditional update.
        return AegisUser.findOneAndUpdate(
            { guildId, userId, riskScore: { $lt: 0 } },
            { $set: { riskScore: 0 } },
            { new: false } // we want the doc after the floor, fetched below
        ).then(() => AegisUser.findOne({ guildId, userId }));
    }

    /**
     * Increment warn or timeout counts by category.
     * @param {string} guildId
     * @param {string} userId
     * @param {'warn'|'timeout'} category
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async incrementPunishmentCount(guildId, userId, category) {
        const field = category === 'timeout' ? 'timeoutCount' : 'warnCount';
        return AegisUser.findOneAndUpdate(
            { guildId, userId },
            {
                $inc: { [field]: 1 },
                $setOnInsert: { guildId, userId }
            },
            { upsert: true, new: true }
        );
    }

    /**
     * Set the repeat offender flag.
     * @param {string} guildId
     * @param {string} userId
     * @param {boolean} value
     * @returns {Promise<void>}
     */
    static async setRepeatOffender(guildId, userId, value) {
        await AegisUser.updateOne(
            { guildId, userId },
            { $set: { isRepeatOffender: value } }
        );
    }

    /**
     * Find all high-risk users in a guild (High or Critical tier).
     * @param {string} guildId
     * @param {number} [limit=50]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findHighRisk(guildId, limit = 50) {
        return AegisUser.find({
            guildId,
            isDeleted: false,
            riskTier: { $in: ['High', 'Critical'] }
        }).sort({ riskScore: -1 }).limit(limit);
    }
}

module.exports = AegisUserRepository;

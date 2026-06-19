/**
 * @fileoverview StaffStatisticsRepository
 * All database access for StaffStatistics documents.
 *
 * One document per (guildId, staffId) pair.
 * All queries are scoped to a guildId. No cross-guild access.
 *
 * Rolling window stats are computed by StaffService and stored here
 * with a lastComputedAt timestamp to enable cache invalidation.
 */

'use strict';

const StaffStatistics = require('../models/StaffStatistics');

class StaffStatisticsRepository {

    /**
     * Get or create a StaffStatistics document.
     * @param {string} guildId
     * @param {string} staffId
     * @returns {Promise<import('mongoose').Document>}
     */
    static async getOrCreate(guildId, staffId) {
        return StaffStatistics.findOneAndUpdate(
            { guildId, staffId },
            { $setOnInsert: { guildId, staffId } },
            { upsert: true, new: true }
        );
    }

    /**
     * Find a StaffStatistics document.
     * @param {string} guildId
     * @param {string} staffId
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async findByStaff(guildId, staffId) {
        return StaffStatistics.findOne({ guildId, staffId });
    }

    /**
     * Apply a patch to a StaffStatistics document.
     * @param {string} guildId
     * @param {string} staffId
     * @param {object} patch
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async update(guildId, staffId, patch) {
        return StaffStatistics.findOneAndUpdate(
            { guildId, staffId },
            { $set: patch },
            { upsert: true, new: true }
        );
    }

    /**
     * Increment lifetime counters atomically on case resolution.
     * @param {string} guildId
     * @param {string} staffId
     * @param {'approved'|'rejected'} decision
     * @param {number} resolutionMs Time taken from case creation to decision
     * @returns {Promise<void>}
     */
    static async recordDecision(guildId, staffId, decision, resolutionMs) {
        const incOp = { totalCases: 1 };
        if (decision === 'approved') incOp.approvedCases = 1;
        if (decision === 'rejected') incOp.rejectedCases = 1;

        // Update avgResolutionMs using cumulative moving average via $set after fetch.
        // Full recompute is deferred to StaffService to avoid stale avg on concurrent writes.
        await StaffStatistics.updateOne(
            { guildId, staffId },
            { $inc: incOp },
            { upsert: true }
        );
    }

    /**
     * Find the top N staff members by approved cases (leaderboard).
     * Excludes staff with no resolved cases.
     * @param {string} guildId
     * @param {number} [limit=10]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findLeaderboard(guildId, limit = 10) {
        return StaffStatistics.find({ guildId, totalCases: { $gt: 0 } })
            .sort({ approvedCases: -1, totalCases: -1 })
            .limit(limit);
    }
}

module.exports = StaffStatisticsRepository;

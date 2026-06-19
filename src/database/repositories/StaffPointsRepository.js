/**
 * @fileoverview StaffPointsRepository
 * All database access for StaffPoints documents.
 *
 * One document per (guildId, staffId) pair.
 * All queries are scoped to a guildId. No cross-guild access.
 *
 * Point floor rules:
 *   weeklyPoints  → never stored below 0 (enforced via $max after $inc)
 *   monthlyPoints → never stored below 0 (enforced via $max after $inc)
 *   lifetimePoints → may go negative
 */

'use strict';

const StaffPoints = require('../models/StaffPoints');

class StaffPointsRepository {

    /**
     * Get or create a StaffPoints document.
     * @param {string} guildId
     * @param {string} staffId
     * @returns {Promise<import('mongoose').Document>}
     */
    static async getOrCreate(guildId, staffId) {
        return StaffPoints.findOneAndUpdate(
            { guildId, staffId },
            { $setOnInsert: { guildId, staffId } },
            { upsert: true, new: true }
        );
    }

    /**
     * Find a StaffPoints document.
     * @param {string} guildId
     * @param {string} staffId
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async findByStaff(guildId, staffId) {
        return StaffPoints.findOne({ guildId, staffId });
    }

    /**
     * Increment points across all three windows.
     * Weekly and monthly floors are enforced post-increment using a second
     * conditional update — MongoDB has no native "increment then floor" operator.
     * @param {string} guildId
     * @param {string} staffId
     * @param {number} weekDelta
     * @param {number} monthDelta
     * @param {number} lifetimeDelta
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async increment(guildId, staffId, weekDelta, monthDelta, lifetimeDelta) {
        // Increment all windows.
        await StaffPoints.updateOne(
            { guildId, staffId },
            {
                $inc: {
                    weeklyPoints:  weekDelta,
                    monthlyPoints: monthDelta,
                    lifetimePoints: lifetimeDelta
                },
                $setOnInsert: { guildId, staffId }
            },
            { upsert: true }
        );

        // Floor weekly and monthly at 0.
        return StaffPoints.findOneAndUpdate(
            { guildId, staffId, weeklyPoints: { $lt: 0 } },
            { $set: { weeklyPoints: 0 } },
            { new: true }
        ).then(() =>
            StaffPoints.findOneAndUpdate(
                { guildId, staffId, monthlyPoints: { $lt: 0 } },
                { $set: { monthlyPoints: 0 } },
                { new: true }
            )
        ).then(() =>
            StaffPoints.findOne({ guildId, staffId })
        );
    }

    /**
     * Reset all weekly points to 0 for all staff in a guild.
     * Called by StaffPointsResetJob on Monday 00:00 UTC.
     * @param {string} guildId
     * @returns {Promise<void>}
     */
    static async resetWeekly(guildId) {
        await StaffPoints.updateMany(
            { guildId },
            { $set: { weeklyPoints: 0, lastWeeklyResetAt: new Date() } }
        );
    }

    /**
     * Reset all monthly points to 0 for all staff in a guild.
     * Called by StaffPointsResetJob on the 1st of each month.
     * @param {string} guildId
     * @returns {Promise<void>}
     */
    static async resetMonthly(guildId) {
        await StaffPoints.updateMany(
            { guildId },
            { $set: { monthlyPoints: 0, lastMonthlyResetAt: new Date() } }
        );
    }

    /**
     * Find top N staff by weekly points (leaderboard).
     * @param {string} guildId
     * @param {number} [limit=10]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findWeeklyLeaderboard(guildId, limit = 10) {
        return StaffPoints.find({ guildId, weeklyPoints: { $gt: 0 } })
            .sort({ weeklyPoints: -1 })
            .limit(limit);
    }

    /**
     * Find top N staff by monthly points (leaderboard).
     * @param {string} guildId
     * @param {number} [limit=10]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findMonthlyLeaderboard(guildId, limit = 10) {
        return StaffPoints.find({ guildId, monthlyPoints: { $gt: 0 } })
            .sort({ monthlyPoints: -1 })
            .limit(limit);
    }

    /**
     * Find top N staff by lifetime points (leaderboard).
     * @param {string} guildId
     * @param {number} [limit=10]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findLifetimeLeaderboard(guildId, limit = 10) {
        return StaffPoints.find({ guildId })
            .sort({ lifetimePoints: -1 })
            .limit(limit);
    }
}

module.exports = StaffPointsRepository;

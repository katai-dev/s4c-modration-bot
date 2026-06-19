/**
 * @fileoverview AegisStaffRepository
 * All database access for AegisStaff documents.
 *
 * One document per (guildId, staffId) pair.
 * All queries are scoped to a guildId. No cross-guild access.
 * Soft-delete pattern applies. Physical deletion is never performed.
 *
 * Departed staff (isActive = false) are excluded from active leaderboards
 * but their data is retained for audit purposes.
 */

'use strict';

const AegisStaff = require('../models/AegisStaff');

class AegisStaffRepository {

    /**
     * Get or create an AegisStaff document.
     * @param {string} guildId
     * @param {string} staffId
     * @param {number} [tier=1]
     * @returns {Promise<import('mongoose').Document>}
     */
    static async getOrCreate(guildId, staffId, tier = 1) {
        return AegisStaff.findOneAndUpdate(
            { guildId, staffId },
            { $setOnInsert: { guildId, staffId, tier } },
            { upsert: true, new: true }
        );
    }

    /**
     * Find an AegisStaff document by guild and staff ID.
     * @param {string} guildId
     * @param {string} staffId
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async findByStaff(guildId, staffId) {
        return AegisStaff.findOne({ guildId, staffId, isDeleted: false });
    }

    /**
     * Set the isActive flag for a staff member.
     * @param {string} guildId
     * @param {string} staffId
     * @param {boolean} value
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async setActive(guildId, staffId, value) {
        return AegisStaff.findOneAndUpdate(
            { guildId, staffId, isDeleted: false },
            { $set: { isActive: value } },
            { new: true }
        );
    }

    /**
     * Update the recorded tier for a staff member.
     * @param {string} guildId
     * @param {string} staffId
     * @param {number} tier
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async setTier(guildId, staffId, tier) {
        return AegisStaff.findOneAndUpdate(
            { guildId, staffId, isDeleted: false },
            { $set: { tier } },
            { new: true }
        );
    }

    /**
     * Find all active staff members in a guild.
     * @param {string} guildId
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findAllActive(guildId) {
        return AegisStaff.find({ guildId, isActive: true, isDeleted: false });
    }

    /**
     * Find all staff members in a guild (including inactive), for audit purposes.
     * @param {string} guildId
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findAll(guildId) {
        return AegisStaff.find({ guildId, isDeleted: false });
    }
}

module.exports = AegisStaffRepository;

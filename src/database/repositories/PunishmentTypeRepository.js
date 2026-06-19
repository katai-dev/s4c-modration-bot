/**
 * @fileoverview PunishmentTypeRepository
 * All database access for PunishmentType documents.
 *
 * All queries are scoped to a guildId. No cross-guild access.
 * Soft-delete pattern: isDeleted flag + deletedAt timestamp.
 * Physical deletion is never performed.
 */

'use strict';

const PunishmentType = require('../models/PunishmentType');

class PunishmentTypeRepository {

    /**
     * Create a new punishment type.
     * @param {object} data
     * @param {string} data.guildId
     * @param {string} data.name
     * @param {string} [data.description]
     * @param {'warn'|'timeout'} data.category
     * @param {number|null} [data.duration]
     * @param {number|null} [data.warnLimit]
     * @param {import('mongoose').Types.ObjectId|null} [data.escalationTargetId]
     * @returns {Promise<import('mongoose').Document>}
     */
    static async create(data) {
        return PunishmentType.create(data);
    }

    /**
     * Find a punishment type by its MongoDB _id, scoped to a guild.
     * @param {string} guildId
     * @param {string|import('mongoose').Types.ObjectId} id
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async findById(guildId, id) {
        return PunishmentType.findOne({ _id: id, guildId, isDeleted: false });
    }

    /**
     * Find all non-deleted punishment types for a guild.
     * @param {string} guildId
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findAll(guildId) {
        return PunishmentType.find({ guildId, isDeleted: false }).sort({ name: 1 });
    }

    /**
     * Find all active (enabled and non-deleted) punishment types for a guild.
     * Used for autocomplete and case creation.
     * @param {string} guildId
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findActive(guildId) {
        return PunishmentType.find({ guildId, isDeleted: false, isActive: true }).sort({ name: 1 });
    }

    /**
     * Update fields on a punishment type. Returns the updated document.
     * @param {string} guildId
     * @param {string|import('mongoose').Types.ObjectId} id
     * @param {object} patch
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async update(guildId, id, patch) {
        return PunishmentType.findOneAndUpdate(
            { _id: id, guildId, isDeleted: false },
            { $set: patch },
            { new: true }
        );
    }

    /**
     * Soft-delete a punishment type.
     * @param {string} guildId
     * @param {string|import('mongoose').Types.ObjectId} id
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async softDelete(guildId, id) {
        return PunishmentType.findOneAndUpdate(
            { _id: id, guildId, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: new Date(), isActive: false } },
            { new: true }
        );
    }

    /**
     * Check whether a name is already taken in this guild (case-insensitive).
     * @param {string} guildId
     * @param {string} name
     * @param {string|import('mongoose').Types.ObjectId|null} [excludeId] Exclude this ID from the check (for updates).
     * @returns {Promise<boolean>}
     */
    static async nameExists(guildId, name, excludeId = null) {
        const query = {
            guildId,
            isDeleted: false,
            name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
        };
        if (excludeId) query._id = { $ne: excludeId };
        const doc = await PunishmentType.findOne(query).select('_id').lean();
        return doc !== null;
    }
}

module.exports = PunishmentTypeRepository;

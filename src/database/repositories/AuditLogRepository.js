/**
 * @fileoverview AuditLogRepository
 * All database access for AuditLog documents.
 *
 * AuditLog records are IMMUTABLE. No update or delete operations exist here.
 * The only write operation is create(). Archival sets isArchived = true
 * but does not modify any other fields.
 *
 * All queries are scoped to a guildId. No cross-guild access.
 */

'use strict';

const { AuditLog } = require('../models/AuditLog');

class AuditLogRepository {

    /**
     * Create an audit log entry.
     * This is the only write path for audit records.
     * @param {object} data
     * @param {string} data.guildId
     * @param {string} data.action One of AUDIT_ACTIONS values
     * @param {string} data.actorId Discord user ID or 'SYSTEM'
     * @param {string|null} [data.targetId]
     * @param {import('mongoose').Types.ObjectId|null} [data.caseId] Case._id reference
     * @param {object} [data.payload]
     * @returns {Promise<import('mongoose').Document>}
     */
    static async create(data) {
        return AuditLog.create(data);
    }

    /**
     * Find all audit log entries related to a specific case (by Case._id).
     * @param {string} guildId
     * @param {import('mongoose').Types.ObjectId|string} caseId
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findByCase(guildId, caseId) {
        return AuditLog.find({ guildId, caseId }).sort({ createdAt: 1 });
    }

    /**
     * Find audit log entries for a specific actor.
     * @param {string} guildId
     * @param {string} actorId
     * @param {object} [opts]
     * @param {number} [opts.limit=50]
     * @param {number} [opts.skip=0]
     * @param {Date} [opts.since]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findByActor(guildId, actorId, opts = {}) {
        const query = { guildId, actorId };
        if (opts.since) query.createdAt = { $gte: opts.since };

        return AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(opts.skip ?? 0)
            .limit(opts.limit ?? 50);
    }

    /**
     * Find audit log entries for a specific target user.
     * @param {string} guildId
     * @param {string} targetId
     * @param {object} [opts]
     * @param {number} [opts.limit=50]
     * @param {number} [opts.skip=0]
     * @param {Date} [opts.since]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findByTarget(guildId, targetId, opts = {}) {
        const query = { guildId, targetId };
        if (opts.since) query.createdAt = { $gte: opts.since };

        return AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(opts.skip ?? 0)
            .limit(opts.limit ?? 50);
    }

    /**
     * Find audit log entries by action type.
     * @param {string} guildId
     * @param {string} action One of AUDIT_ACTIONS values
     * @param {object} [opts]
     * @param {number} [opts.limit=50]
     * @param {Date} [opts.since]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findByAction(guildId, action, opts = {}) {
        const query = { guildId, action };
        if (opts.since) query.createdAt = { $gte: opts.since };

        return AuditLog.find(query)
            .sort({ createdAt: -1 })
            .limit(opts.limit ?? 50);
    }

    /**
     * Mark all entries older than a given date as archived.
     * Called by AuditArchivalJob. Sets isArchived = true only.
     * No other fields are modified.
     * @param {string} guildId
     * @param {Date} beforeDate
     * @returns {Promise<number>} Number of records archived
     */
    static async markArchived(guildId, beforeDate) {
        const result = await AuditLog.updateMany(
            { guildId, isArchived: false, createdAt: { $lt: beforeDate } },
            { $set: { isArchived: true } }
        );
        return result.modifiedCount;
    }

    /**
     * Count total audit entries for a guild (excluding archived, for display).
     * @param {string} guildId
     * @returns {Promise<number>}
     */
    static async countActive(guildId) {
        return AuditLog.countDocuments({ guildId, isArchived: false });
    }
}

module.exports = AuditLogRepository;

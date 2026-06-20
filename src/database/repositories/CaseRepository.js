/**
 * @fileoverview CaseRepository
 * All database access for Case documents.
 *
 * All queries are scoped to a guildId. No cross-guild access.
 * Soft-delete pattern: isDeleted flag + deletedAt timestamp.
 * Physical deletion is never performed.
 *
 * Status state machine (enforced at the service layer, not here):
 *   Pending → Approved | Rejected | Expired
 *   Approved → Cleared | Completed
 */

'use strict';

const Case = require('../models/Case');

class CaseRepository {

    /**
     * Create a new case document.
     * @param {object} data Full case data including frozen snapshots.
     * @returns {Promise<import('mongoose').Document>}
     */
    static async create(data) {
        return Case.create(data);
    }

    /**
     * Find a case by its sequential guild-scoped caseId.
     * @param {string} guildId
     * @param {number} caseId
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async findByCaseId(guildId, caseId) {
        return Case.findOne({ guildId, caseId, isDeleted: false });
    }

    /**
     * Find a case by its MongoDB _id, scoped to a guild.
     * @param {string} guildId
     * @param {string|import('mongoose').Types.ObjectId} id
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async findById(guildId, id) {
        return Case.findOne({ _id: id, guildId, isDeleted: false });
    }

    /**
     * Find all non-deleted cases for a target user in a guild.
     * @param {string} guildId
     * @param {string} targetId
     * @param {object} [opts]
     * @param {string} [opts.status] Filter by status
     * @param {number} [opts.limit=50]
     * @param {number} [opts.skip=0]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findByTarget(guildId, targetId, opts = {}) {
        const query = { guildId, targetId, isDeleted: false };
        if (opts.status) query.status = opts.status;

        return Case.find(query)
            .sort({ createdAt: -1 })
            .skip(opts.skip ?? 0)
            .limit(opts.limit ?? 50);
    }

    /**
     * Find all active (un-escalated) warnings of a specific type for a user.
     * @param {string} guildId
     * @param {string} targetId
     * @param {string|import('mongoose').Types.ObjectId} punishmentTypeId
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findActiveWarnings(guildId, targetId, punishmentTypeId) {
        return Case.find({
            guildId,
            targetId,
            punishmentTypeId,
            status: 'Approved',
            isEscalated: false,
            isDeleted: false
        }).sort({ createdAt: 1 });
    }

    /**
     * Mark an array of cases as escalated.
     * @param {string} guildId
     * @param {import('mongoose').Types.ObjectId[]} caseIds
     * @returns {Promise<void>}
     */
    static async markEscalated(guildId, caseIds) {
        await Case.updateMany(
            { _id: { $in: caseIds }, guildId, isDeleted: false },
            { $set: { isEscalated: true } }
        );
    }

    /**
     * Mark an array of cases as Cleared.
     * @param {string} guildId
     * @param {import('mongoose').Types.ObjectId[]} caseIds
     * @returns {Promise<void>}
     */
    static async markCleared(guildId, caseIds) {
        await Case.updateMany(
            { _id: { $in: caseIds }, guildId, isDeleted: false },
            { $set: { status: 'Cleared' } }
        );
    }

    /**
     * Find cases pending longer than a specific deadlock limit.
     * @param {string} guildId
     * @param {Date} olderThan
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findDeadlocked(guildId, olderThan) {
        return Case.find({
            guildId,
            status: 'Pending',
            deadlockPinged: false,
            isDeleted: false,
            createdAt: { $lt: olderThan }
        }).sort({ createdAt: 1 });
    }

    /**
     * Mark cases as having been pinged for deadlock.
     * @param {string} guildId
     * @param {import('mongoose').Types.ObjectId[]} caseIds
     * @returns {Promise<void>}
     */
    static async markDeadlockPinged(guildId, caseIds) {
        await Case.updateMany(
            { _id: { $in: caseIds }, guildId, isDeleted: false },
            { $set: { deadlockPinged: true } }
        );
    }

    /**
     * Find all pending cases for a guild. Used by deadlock escalation job.
     * @param {string} guildId
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findPending(guildId) {
        return Case.find({ guildId, status: 'Pending', isDeleted: false }).sort({ createdAt: 1 });
    }

    /**
     * Find all expired-eligible cases across all guilds.
     * Used by CaseExpiryJob — not guild-scoped.
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findExpirable() {
        return Case.find({
            status:    'Pending',
            isDeleted: false,
            expiresAt: { $lte: new Date() }
        });
    }

    /**
     * Count approved cases for a target within a rolling time window.
     * Used for repeat offender detection and escalation trigger.
     * @param {string} guildId
     * @param {string} targetId
     * @param {Date} since Start of the window
     * @param {string|import('mongoose').Types.ObjectId|null} [punishmentTypeId] Restrict to one type
     * @returns {Promise<number>}
     */
    static async countApproved(guildId, targetId, since, punishmentTypeId = null) {
        const query = {
            guildId,
            targetId,
            status:    'Approved',
            isDeleted: false,
            createdAt: { $gte: since }
        };
        if (punishmentTypeId) query.punishmentTypeId = punishmentTypeId;
        return Case.countDocuments(query);
    }

    /**
     * Find recent cases for rate-limit checking.
     * Returns cases submitted by a moderator against a target within a time window.
     * @param {string} guildId
     * @param {string} moderatorId
     * @param {string} targetId
     * @param {Date} since
     * @returns {Promise<number>}
     */
    static async countRecentByModerator(guildId, moderatorId, targetId, since) {
        return Case.countDocuments({
            guildId,
            moderatorId,
            targetId,
            isDeleted:  false,
            createdAt: { $gte: since }
        });
    }

    /**
     * Find a recent duplicate case (same target, same punishment type, within window).
     * @param {string} guildId
     * @param {string} targetId
     * @param {string|import('mongoose').Types.ObjectId} punishmentTypeId
     * @param {Date} since
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async findRecentDuplicate(guildId, targetId, punishmentTypeId, since) {
        return Case.findOne({
            guildId,
            targetId,
            punishmentTypeId,
            isDeleted: false,
            createdAt: { $gte: since }
        }).sort({ createdAt: -1 });
    }

    /**
     * Update a case's status and optionally apply a patch to other fields.
     * @param {string} guildId
     * @param {number} caseId
     * @param {string} status New status value
     * @param {object} [patch] Additional fields to set
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async updateStatus(guildId, caseId, status, patch = {}) {
        return Case.findOneAndUpdate(
            { guildId, caseId, isDeleted: false },
            { $set: { status, ...patch } },
            { new: true }
        );
    }

    /**
     * Push an approval sub-document onto a case's approvals array.
     * @param {string} guildId
     * @param {number} caseId
     * @param {object} approval Approval sub-document data
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async addApproval(guildId, caseId, approval) {
        return Case.findOneAndUpdate(
            { guildId, caseId, isDeleted: false },
            { $push: { approvals: approval } },
            { new: true }
        );
    }

    /**
     * Update the review message reference (after posting or editing the embed).
     * @param {string} guildId
     * @param {number} caseId
     * @param {string} messageId
     * @param {string} channelId
     * @returns {Promise<void>}
     */
    static async setReviewMessage(guildId, caseId, messageId, channelId) {
        await Case.updateOne(
            { guildId, caseId, isDeleted: false },
            { $set: { reviewMessageId: messageId, reviewChannelId: channelId } }
        );
    }

    /**
     * Soft-delete a case. Should only be called by Manual Override flow.
     * @param {string} guildId
     * @param {number} caseId
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async softDelete(guildId, caseId) {
        return Case.findOneAndUpdate(
            { guildId, caseId, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: new Date() } },
            { new: true }
        );
    }
}

module.exports = CaseRepository;

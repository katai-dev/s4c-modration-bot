/**
 * @fileoverview Case Model
 * The central record for every punishment action submitted through Aegis.
 * Each case progresses through a defined status state machine:
 *
 *   Pending → Approved   (all required approvals received)
 *   Pending → Rejected   (any single rejection)
 *   Pending → Expired    (caseExpiryDays elapsed with no decision)
 *   Approved → Cleared   (manual override by Admin+)
 *   Approved → Completed (all downstream dependencies resolved — e.g. escalated
 *                         warn cases after the resulting timeout resolves)
 *
 * Escalation is represented through linkedCaseId / escalatedFromCaseIds links.
 * There is NO 'Escalated' status — escalation produces a new Case document.
 *
 * punishmentTypeSnapshot and riskTierSnapshot are frozen at creation time.
 * They must NEVER be updated after a case is created.
 *
 * Soft-delete only. Never physically removed.
 * Require directly: const Case = require('../models/Case');
 */

'use strict';

const mongoose = require('mongoose');

// ── Approval Sub-Document ──────────────────────────────────────────────────────
const approvalSchema = new mongoose.Schema({
    reviewerId: {
        type:     String,
        required: true
    },
    reviewerTier: {
        type:     Number,
        required: true,
        min:      1,
        max:      4
    },
    decision: {
        type:     String,
        required: true,
        enum:     ['approved', 'rejected']
    },
    reason: {
        // Required when decision = 'rejected'. Null for approvals.
        type:    String,
        default: null,
        maxlength: 1000
    },
    decidedAt: {
        type:    Date,
        default: Date.now
    }
}, { _id: true });

// ── Punishment Type Snapshot Sub-Document ──────────────────────────────────────
// Frozen copy of the PunishmentType at case creation time.
// Preserved forever — original PunishmentType document may change or be deleted.
const punishmentTypeSnapshotSchema = new mongoose.Schema({
    name:               { type: String, required: true },
    category:           { type: String, required: true, enum: ['warn', 'timeout'] },
    duration:           { type: Number, default: null },
    warnLimit:          { type: Number, default: null },
    escalationTargetId: { type: mongoose.Schema.Types.ObjectId, default: null }
}, { _id: false });

// ── Case Schema ────────────────────────────────────────────────────────────────
const CaseSchema = new mongoose.Schema({
    guildId: {
        type:     String,
        required: true,
        index:    true
    },

    // Sequential integer ID within the guild (1, 2, 3...).
    // Generated atomically by GuildCounterRepository.nextCaseId().
    caseId: {
        type:     Number,
        required: true
    },

    // ── Parties ────────────────────────────────────────────────────────────────
    targetId: {
        type:     String,
        required: true,
        index:    true
    },

    // Discord user ID of the moderator who submitted this case.
    // 'SYSTEM' is used for system-generated escalation cases.
    moderatorId: {
        type:     String,
        required: true
    },

    // ── Punishment ─────────────────────────────────────────────────────────────
    punishmentTypeId: {
        type:     mongoose.Schema.Types.ObjectId,
        required: true,
        ref:      'PunishmentType'
    },

    // Frozen snapshot — set once at creation, never modified.
    punishmentTypeSnapshot: {
        type:     punishmentTypeSnapshotSchema,
        required: true
    },

    // ── Status ─────────────────────────────────────────────────────────────────
    status: {
        type:    String,
        default: 'Pending',
        enum:    ['Pending', 'Approved', 'Rejected', 'Expired', 'Cleared', 'Completed']
    },

    // ── Review ─────────────────────────────────────────────────────────────────
    // All review decisions (approvals and the final rejection).
    approvals: {
        type:    [approvalSchema],
        default: []
    },

    // Populated with the rejection reason when status = 'Rejected'.
    rejectionReason: {
        type:    String,
        default: null,
        maxlength: 1000
    },

    // ── Evidence ───────────────────────────────────────────────────────────────
    // Cloudinary secure_url values for uploaded evidence.
    evidenceUrls: {
        type:    [String],
        default: []
    },

    // Cloudinary public_id values for future deletion/archival.
    cloudinaryPublicIds: {
        type:    [String],
        default: []
    },

    // True if a Cloudinary upload failed during submission.
    // Case proceeds; reviewer is notified via embed flag.
    evidenceIncomplete: {
        type:    Boolean,
        default: false
    },

    // ── Evidence Archival (Phase 4) ────────────────────────────────────────────
    // True if the evidence was successfully purged from Cloudinary by the archival job.
    // Preserves the fact that evidence once existed for historical auditing.
    evidenceArchived: {
        type:    Boolean,
        default: false
    },

    evidenceArchivedAt: {
        type:    Date,
        default: null
    },

    // ── Duplicate Detection ─────────────────────────────────────────────────────
    duplicateSuspected: {
        type:    Boolean,
        default: false
    },

    // If duplicateSuspected, links to the earlier case.
    linkedCaseId: {
        type:    mongoose.Schema.Types.ObjectId,
        default: null,
        ref:     'Case'
    },

    // ── Escalation Links ───────────────────────────────────────────────────────
    // For escalation RESULT cases: list of Case._ids whose approved warns
    // triggered this timeout case.
    escalatedFromCaseIds: {
        type:    [mongoose.Schema.Types.ObjectId],
        default: [],
        ref:     'Case'
    },

    // True if this case has already triggered an escalation.
    // Removes it from the active "towards next limit" count.
    isEscalated: {
        type:    Boolean,
        default: false
    },

    // ── Risk Snapshot ──────────────────────────────────────────────────────────
    // Frozen at case creation time. Never recomputed for in-flight cases.
    riskTierSnapshot: {
        type:    String,
        default: null,
        enum:    ['Low', 'Medium', 'High', 'Critical', null]
    },

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    // Set at creation when caseExpiryEnabled = true. Null = no expiry.
    expiresAt: {
        type:    Date,
        default: null,
        index:   true
    },

    // ── Audit ──────────────────────────────────────────────────────────────────
    // Discord message ID of the posted review embed (for editing after decisions).
    reviewMessageId: {
        type:    String,
        default: null
    },

    // Discord channel ID where the review embed was posted.
    reviewChannelId: {
        type:    String,
        default: null
    },

    // True if the DeadlockEscalationJob has already pinged about this case.
    deadlockPinged: {
        type:    Boolean,
        default: false
    },

    // ── Soft Delete ────────────────────────────────────────────────────────────
    isDeleted: {
        type:    Boolean,
        default: false,
        index:   true
    },

    deletedAt: {
        type:    Date,
        default: null
    }

}, {
    timestamps: true
});

// ── Indexes ────────────────────────────────────────────────────────────────────
CaseSchema.index({ guildId: 1, caseId: 1 }, { unique: true });
CaseSchema.index({ guildId: 1, targetId: 1, isDeleted: 1 });
CaseSchema.index({ guildId: 1, moderatorId: 1, isDeleted: 1 });
CaseSchema.index({ guildId: 1, status: 1, isDeleted: 1 });
CaseSchema.index({ guildId: 1, targetId: 1, status: 1, createdAt: -1 });
CaseSchema.index({ expiresAt: 1, status: 1, isDeleted: 1 }); // CaseExpiryJob

module.exports = mongoose.model('Case', CaseSchema);

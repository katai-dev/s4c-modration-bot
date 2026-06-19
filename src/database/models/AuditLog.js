/**
 * @fileoverview AuditLog Model
 * Immutable append-only log of every state change within Aegis.
 * Records are NEVER modified after creation. No soft-delete on AuditLog.
 *
 * isArchived is set to true by AuditArchivalJob after auditArchivalMonths.
 * Archived records are retained forever — never physically deleted.
 *
 * Audit action enum constants are defined here and re-exported for use
 * by AuditService and any code that creates audit entries.
 *
 * AI suggestion correlation: AI_SUGGESTION_LOGGED and the subsequent
 * CASE_APPROVED / CASE_REJECTED are separate chronological entries.
 * The relationship is inferrable by caseId + createdAt ordering.
 * AI audit entries are NEVER retroactively modified.
 *
 * Require directly: const { AuditLog, AUDIT_ACTIONS } = require('../models/AuditLog');
 */

'use strict';

const mongoose = require('mongoose');

// ── Audit Action Enum ──────────────────────────────────────────────────────────
// All possible action types. Exhaustive — add new values only for new features.
const AUDIT_ACTIONS = Object.freeze({
    CASE_CREATED:         'CASE_CREATED',
    CASE_APPROVED:        'CASE_APPROVED',
    CASE_REJECTED:        'CASE_REJECTED',
    CASE_EXPIRED:         'CASE_EXPIRED',
    CASE_ESCALATED:       'CASE_ESCALATED',       // New escalation case created
    CASE_CLEARED:         'CASE_CLEARED',          // Manual override → Cleared status
    CASE_COMPLETED:       'CASE_COMPLETED',
    MANUAL_OVERRIDE:      'MANUAL_OVERRIDE',
    NOTE_ADDED:           'NOTE_ADDED',
    NOTE_REMOVED:         'NOTE_REMOVED',
    CONFIG_UPDATED:       'CONFIG_UPDATED',
    AI_SUGGESTION_LOGGED: 'AI_SUGGESTION_LOGGED',
    PERMISSION_BLOCKED:   'PERMISSION_BLOCKED',
    STAFF_ACTIVATED:      'STAFF_ACTIVATED',
    STAFF_DEACTIVATED:    'STAFF_DEACTIVATED'
});

// ── AuditLog Schema ────────────────────────────────────────────────────────────
const AuditLogSchema = new mongoose.Schema({
    guildId: {
        type:     String,
        required: true,
        index:    true
    },

    // Action type — must be one of the AUDIT_ACTIONS values.
    action: {
        type:     String,
        required: true,
        enum:     Object.values(AUDIT_ACTIONS),
        index:    true
    },

    // Discord user ID of the actor who caused this event.
    // 'SYSTEM' for automated events (expiry jobs, escalation trigger).
    actorId: {
        type:     String,
        required: true
    },

    // Discord user ID of the subject of this event. Optional.
    targetId: {
        type:    String,
        default: null,
        index:   true
    },

    // Reference to the Case document this event relates to. Optional.
    caseId: {
        type:    mongoose.Schema.Types.ObjectId,
        default: null,
        ref:     'Case',
        index:   true
    },

    // Structured payload — contents depend on action type.
    // Stored as Mixed to accommodate varied shapes per action.
    // Must always be serialisable (no circular refs, no class instances).
    payload: {
        type:    mongoose.Schema.Types.Mixed,
        default: {}
    },

    // ── Archival ───────────────────────────────────────────────────────────────
    // Set to true by AuditArchivalJob after auditArchivalMonths have elapsed.
    // Never deleted.
    isArchived: {
        type:    Boolean,
        default: false,
        index:   true
    }

}, {
    // createdAt used as the authoritative event timestamp.
    // updatedAt intentionally omitted — audit records are immutable.
    timestamps: { createdAt: true, updatedAt: false }
});

// ── Indexes ────────────────────────────────────────────────────────────────────
AuditLogSchema.index({ guildId: 1, createdAt: -1 });
AuditLogSchema.index({ guildId: 1, actorId: 1, createdAt: -1 });
AuditLogSchema.index({ guildId: 1, targetId: 1, createdAt: -1 });
AuditLogSchema.index({ guildId: 1, action: 1, createdAt: -1 });
AuditLogSchema.index({ guildId: 1, isArchived: 1, createdAt: 1 }); // Archival job

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

module.exports = { AuditLog, AUDIT_ACTIONS };

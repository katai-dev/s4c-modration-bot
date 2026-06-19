/**
 * @fileoverview PunishmentType Model
 * Defines guild-specific punishment templates (e.g. "Harassment Warn", "Spam Timeout").
 * Each case stores a frozen snapshot of the punishment type at creation time —
 * changes to this document never retroactively affect existing cases.
 *
 * Category 'warn'    → no Discord action, contributes +1 to warn count.
 * Category 'timeout' → Discord timeout applied, duration required.
 *
 * Soft-delete only. Never physically removed.
 * Require directly: const PunishmentType = require('../models/PunishmentType');
 */

'use strict';

const mongoose = require('mongoose');

const PunishmentTypeSchema = new mongoose.Schema({
    guildId: {
        type:     String,
        required: true,
        index:    true
    },

    // ── Identity ───────────────────────────────────────────────────────────────
    name: {
        type:      String,
        required:  true,
        maxlength: 100,
        trim:      true
    },

    description: {
        type:      String,
        default:   null,
        maxlength: 500,
        trim:      true
    },

    // ── Behaviour ──────────────────────────────────────────────────────────────
    // 'warn'    = no Discord action; warn count incremented.
    // 'timeout' = Discord timeout applied; duration must be set.
    category: {
        type:     String,
        required: true,
        enum:     ['warn', 'timeout']
    },

    // Duration in milliseconds. Required when category = 'timeout'. Null for warns.
    duration: {
        type:    Number,
        default: null,
        min:     1
    },

    // ── Escalation ─────────────────────────────────────────────────────────────
    // How many approved cases of THIS type trigger automatic escalation.
    // Null = no automatic escalation for this type.
    warnLimit: {
        type:    Number,
        default: null,
        min:     1
    },

    // The PunishmentType._id to escalate to when warnLimit is hit.
    // Must belong to the same guild. Null = no escalation target.
    escalationTargetId: {
        type:    mongoose.Schema.Types.ObjectId,
        default: null,
        ref:     'PunishmentType'
    },

    // ── State ──────────────────────────────────────────────────────────────────
    isActive: {
        type:    Boolean,
        default: true
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
// Composite index for all per-guild active type lookups.
PunishmentTypeSchema.index({ guildId: 1, isDeleted: 1, isActive: 1 });
PunishmentTypeSchema.index({ guildId: 1, name: 1, isDeleted: 1 });

module.exports = mongoose.model('PunishmentType', PunishmentTypeSchema);

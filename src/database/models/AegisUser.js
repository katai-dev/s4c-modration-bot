/**
 * @fileoverview AegisUser Model
 * Tracks per-user punishment history, cumulative risk score, and risk tier
 * within a single guild. One document per (guildId, userId) pair.
 *
 * Risk score is cumulative and permanent — it never decays.
 * Risk tier is derived from risk score at query time (or updated on each
 * approved case) using the configured weight and threshold tables.
 *
 * warnCount and timeoutCount count Approved cases only.
 * isRepeatOffender is set when the user has 3+ Approved cases in 90 days.
 *
 * Soft-delete only. Never physically removed.
 * Require directly: const AegisUser = require('../models/AegisUser');
 */

'use strict';

const mongoose = require('mongoose');

const AegisUserSchema = new mongoose.Schema({
    guildId: {
        type:     String,
        required: true,
        index:    true
    },

    userId: {
        type:     String,
        required: true,
        index:    true
    },

    // ── Risk ───────────────────────────────────────────────────────────────────
    // Cumulative risk score. Never decays. Cleared only by Manual Override.
    // Weights: Warn = 1pt, Timeout = 3pt (configurable per guild in Phase 5).
    riskScore: {
        type:    Number,
        default: 0,
        min:     0
    },

    // Derived from riskScore. Thresholds: Low 0-2, Medium 3-6, High 7-12, Critical 13+
    riskTier: {
        type:    String,
        default: 'Low',
        enum:    ['Low', 'Medium', 'High', 'Critical']
    },

    // ── Punishment Counts ──────────────────────────────────────────────────────
    // Count of Approved cases by category. Cumulative, permanent.
    warnCount: {
        type:    Number,
        default: 0,
        min:     0
    },

    timeoutCount: {
        type:    Number,
        default: 0,
        min:     0
    },

    // ── Repeat Offender Flag ───────────────────────────────────────────────────
    // True when user has 3+ Approved cases in the last 90 days.
    isRepeatOffender: {
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
AegisUserSchema.index({ guildId: 1, userId: 1 }, { unique: true });
AegisUserSchema.index({ guildId: 1, riskTier: 1, isDeleted: 1 });
AegisUserSchema.index({ guildId: 1, isRepeatOffender: 1, isDeleted: 1 });

module.exports = mongoose.model('AegisUser', AegisUserSchema);

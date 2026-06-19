/**
 * @fileoverview StaffStatistics Model
 * Stores pre-computed or cached rolling statistics for each staff member.
 * One document per (guildId, staffId) pair.
 *
 * Rolling window stats (7-day, 30-day) are computed from Case documents
 * at query time and cached here with a lastComputedAt timestamp.
 * Callers check lastComputedAt to determine if a recompute is needed.
 *
 * Staff evaluation ratings:
 *   Excellent  >= 90% approval rate
 *   Good       75% - 89%
 *   Average    60% - 74%
 *   Needs Review < 60%
 *   Insufficient Data: fewer than 10 resolved cases
 *
 * Require directly: const StaffStatistics = require('../models/StaffStatistics');
 */

'use strict';

const mongoose = require('mongoose');

const StaffStatisticsSchema = new mongoose.Schema({
    guildId: {
        type:     String,
        required: true,
        index:    true
    },

    staffId: {
        type:     String,
        required: true,
        index:    true
    },

    // ── Lifetime Totals ────────────────────────────────────────────────────────
    totalCases: {
        type:    Number,
        default: 0,
        min:     0
    },

    approvedCases: {
        type:    Number,
        default: 0,
        min:     0
    },

    rejectedCases: {
        type:    Number,
        default: 0,
        min:     0
    },

    // Average resolution time in milliseconds across all resolved cases.
    avgResolutionMs: {
        type:    Number,
        default: 0,
        min:     0
    },

    // ── Rolling Window Caches ──────────────────────────────────────────────────
    // These are computed from Case documents and cached here.
    // Null = not yet computed.
    rolling7dayCases: {
        type:    Number,
        default: null
    },

    rolling30dayCases: {
        type:    Number,
        default: null
    },

    rolling7dayApprovalRate: {
        type:    Number,
        default: null
    },

    rolling30dayApprovalRate: {
        type:    Number,
        default: null
    },

    // ── Evaluation ─────────────────────────────────────────────────────────────
    // Derived from approvedCases / totalCases ratio.
    // Null = Insufficient Data (< 10 resolved cases).
    evaluationRating: {
        type:    String,
        default: null,
        enum:    ['Excellent', 'Good', 'Average', 'Needs Review', null]
    },

    // When the rolling stats were last computed.
    lastComputedAt: {
        type:    Date,
        default: null
    }

}, {
    timestamps: true
});

// ── Indexes ────────────────────────────────────────────────────────────────────
StaffStatisticsSchema.index({ guildId: 1, staffId: 1 }, { unique: true });
StaffStatisticsSchema.index({ guildId: 1, approvedCases: -1 }); // Leaderboard
StaffStatisticsSchema.index({ guildId: 1, evaluationRating: 1 });

module.exports = mongoose.model('StaffStatistics', StaffStatisticsSchema);

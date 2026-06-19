/**
 * @fileoverview StaffPoints Model
 * Tracks moderation activity points for each staff member within a guild.
 * One document per (guildId, staffId) pair.
 *
 * Point windows:
 *   Weekly  — floored at 0 on reset (never negative)
 *   Monthly — floored at 0 on reset (never negative)
 *   Lifetime — may go negative (no floor)
 *
 * Resets are performed by StaffPointsResetJob (Phase 7):
 *   weeklyPoints  → reset to 0 every Monday 00:00 UTC
 *   monthlyPoints → reset to 0 on the 1st of each month 00:00 UTC
 *
 * Require directly: const StaffPoints = require('../models/StaffPoints');
 */

'use strict';

const mongoose = require('mongoose');

const StaffPointsSchema = new mongoose.Schema({
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

    // ── Point Balances ─────────────────────────────────────────────────────────
    // Weekly balance. Floored at 0 — never stored below 0.
    weeklyPoints: {
        type:    Number,
        default: 0,
        min:     0
    },

    // Monthly balance. Floored at 0 — never stored below 0.
    monthlyPoints: {
        type:    Number,
        default: 0,
        min:     0
    },

    // Lifetime balance. May go negative.
    lifetimePoints: {
        type:    Number,
        default: 0
    },

    // ── Reset Timestamps ───────────────────────────────────────────────────────
    lastWeeklyResetAt: {
        type:    Date,
        default: null
    },

    lastMonthlyResetAt: {
        type:    Date,
        default: null
    }

}, {
    timestamps: true
});

// ── Indexes ────────────────────────────────────────────────────────────────────
StaffPointsSchema.index({ guildId: 1, staffId: 1 }, { unique: true });
StaffPointsSchema.index({ guildId: 1, weeklyPoints: -1 });   // Weekly leaderboard
StaffPointsSchema.index({ guildId: 1, monthlyPoints: -1 });  // Monthly leaderboard
StaffPointsSchema.index({ guildId: 1, lifetimePoints: -1 }); // Lifetime leaderboard

module.exports = mongoose.model('StaffPoints', StaffPointsSchema);

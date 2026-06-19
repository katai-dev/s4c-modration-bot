/**
 * @fileoverview AegisStaff Model
 * Tracks registered staff members and their assigned Aegis tier within a guild.
 * One document per (guildId, staffId) pair.
 *
 * Tier is the Aegis role tier (1-4):
 *   1 = Moderator
 *   2 = Senior Moderator
 *   3 = Admin
 *   4 = Head Admin
 *
 * Tier is derived at runtime from the role mappings in guild config by
 * AegisPermissionGuard. This document records the last-known tier for
 * leaderboard and statistics purposes.
 *
 * isActive = false when a staff member has left or been removed.
 * Departed staff are excluded from leaderboards but their data is retained
 * and queryable for audit purposes.
 *
 * Soft-delete only. Never physically removed.
 * Require directly: const AegisStaff = require('../models/AegisStaff');
 */

'use strict';

const mongoose = require('mongoose');

const AegisStaffSchema = new mongoose.Schema({
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

    // Last-known Aegis tier (1-4). Updated when tier changes.
    tier: {
        type:    Number,
        default: 1,
        min:     1,
        max:     4
    },

    // False when staff member has departed or been deactivated.
    // Excluded from leaderboards when false.
    isActive: {
        type:    Boolean,
        default: true,
        index:   true
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
AegisStaffSchema.index({ guildId: 1, staffId: 1 }, { unique: true });
AegisStaffSchema.index({ guildId: 1, isActive: 1, isDeleted: 1 });

module.exports = mongoose.model('AegisStaff', AegisStaffSchema);

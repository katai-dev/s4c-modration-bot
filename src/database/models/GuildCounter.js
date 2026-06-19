/**
 * @fileoverview GuildCounter Model
 * Provides atomic, per-guild sequential integer ID generation for cases and notes.
 * Uses MongoDB $inc with upsert to guarantee uniqueness without transactions.
 *
 * Never access this model directly from commands or services.
 * Use GuildCounterRepository.nextCaseId() and nextNoteId().
 *
 * Require directly: const GuildCounter = require('../models/GuildCounter');
 */

'use strict';

const mongoose = require('mongoose');

const GuildCounterSchema = new mongoose.Schema({
    guildId: {
        type:     String,
        required: true,
        unique:   true,
        index:    true
    },

    // Incremented atomically by GuildCounterRepository.nextCaseId()
    caseSequence: {
        type:    Number,
        default: 0,
        min:     0
    },

    // Incremented atomically by GuildCounterRepository.nextNoteId()
    noteSequence: {
        type:    Number,
        default: 0,
        min:     0
    }

}, {
    timestamps: false // Counters don't need timestamps
});

module.exports = mongoose.model('GuildCounter', GuildCounterSchema);

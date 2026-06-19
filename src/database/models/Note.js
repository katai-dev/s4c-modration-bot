/**
 * @fileoverview Note Model
 * Internal staff notes attached to a user within a guild.
 * Notes are not visible to the target user. Visible to Senior Moderator+.
 *
 * noteId is a sequential integer per guild, generated atomically by
 * GuildCounterRepository.nextNoteId().
 *
 * Soft-delete only. Never physically removed.
 * Require directly: const Note = require('../models/Note');
 */

'use strict';

const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    guildId: {
        type:     String,
        required: true,
        index:    true
    },

    // Sequential integer ID within the guild (1, 2, 3...).
    // Generated atomically by GuildCounterRepository.nextNoteId().
    noteId: {
        type:     Number,
        required: true
    },

    // Discord user ID of the user this note is about.
    targetId: {
        type:     String,
        required: true,
        index:    true
    },

    // Discord user ID of the staff member who wrote the note.
    authorId: {
        type:     String,
        required: true
    },

    content: {
        type:      String,
        required:  true,
        maxlength: 1000,
        trim:      true
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
NoteSchema.index({ guildId: 1, noteId: 1 }, { unique: true });
NoteSchema.index({ guildId: 1, targetId: 1, isDeleted: 1 });
NoteSchema.index({ guildId: 1, authorId: 1, isDeleted: 1 });

module.exports = mongoose.model('Note', NoteSchema);

/**
 * @fileoverview NoteRepository
 * All database access for Note documents.
 *
 * All queries are scoped to a guildId. No cross-guild access.
 * Soft-delete pattern: isDeleted flag + deletedAt timestamp.
 * Physical deletion is never performed.
 */

'use strict';

const Note = require('../models/Note');

class NoteRepository {

    /**
     * Create a new note.
     * @param {object} data
     * @param {string} data.guildId
     * @param {number} data.noteId Sequential note ID from GuildCounterRepository
     * @param {string} data.targetId
     * @param {string} data.authorId
     * @param {string} data.content
     * @returns {Promise<import('mongoose').Document>}
     */
    static async create(data) {
        return Note.create(data);
    }

    /**
     * Find a note by its sequential guild-scoped noteId.
     * @param {string} guildId
     * @param {number} noteId
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async findByNoteId(guildId, noteId) {
        return Note.findOne({ guildId, noteId, isDeleted: false });
    }

    /**
     * Find all non-deleted notes for a target user in a guild.
     * @param {string} guildId
     * @param {string} targetId
     * @param {object} [opts]
     * @param {number} [opts.limit=50]
     * @param {number} [opts.skip=0]
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findByTarget(guildId, targetId, opts = {}) {
        return Note.find({ guildId, targetId, isDeleted: false })
            .sort({ createdAt: -1 })
            .skip(opts.skip ?? 0)
            .limit(opts.limit ?? 50);
    }

    /**
     * Find all non-deleted notes written by a staff member.
     * @param {string} guildId
     * @param {string} authorId
     * @returns {Promise<import('mongoose').Document[]>}
     */
    static async findByAuthor(guildId, authorId) {
        return Note.find({ guildId, authorId, isDeleted: false }).sort({ createdAt: -1 });
    }

    /**
     * Soft-delete a note.
     * @param {string} guildId
     * @param {number} noteId
     * @returns {Promise<import('mongoose').Document|null>}
     */
    static async softDelete(guildId, noteId) {
        return Note.findOneAndUpdate(
            { guildId, noteId, isDeleted: false },
            { $set: { isDeleted: true, deletedAt: new Date() } },
            { new: true }
        );
    }

    /**
     * Count non-deleted notes for a target in a guild.
     * @param {string} guildId
     * @param {string} targetId
     * @returns {Promise<number>}
     */
    static async countByTarget(guildId, targetId) {
        return Note.countDocuments({ guildId, targetId, isDeleted: false });
    }
}

module.exports = NoteRepository;

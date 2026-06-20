'use strict';

/**
 * @fileoverview NoteService
 * Handles adding, fetching, and removing internal staff notes.
 */

const NoteRepository = require('../../database/repositories/NoteRepository');
const GuildCounterRepository = require('../../database/repositories/GuildCounterRepository');
const { AUDIT_ACTIONS } = require('../../database/models/AuditLog');

class NoteService {

    /**
     * Add a note to a target user.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {string} targetId
     * @param {string} authorId
     * @param {string} content
     * @returns {Promise<import('mongoose').Document>}
     */
    async addNote(client, guildId, targetId, authorId, content) {
        const noteId = await GuildCounterRepository.nextNoteId(guildId);

        const note = await NoteRepository.create({
            guildId,
            noteId,
            targetId,
            authorId,
            content: content.trim()
        });

        await client.aegis.services.audit.log(client, {
            guildId,
            action: AUDIT_ACTIONS.NOTE_ADDED,
            actorId: authorId,
            targetId,
            payload: { noteId, content: content.trim().slice(0, 100) } // Store snippet in audit
        });

        return note;
    }

    /**
     * Soft-delete a note.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {number} noteId
     * @param {string} removerId
     * @returns {Promise<import('mongoose').Document|null>} The deleted note or null if not found.
     */
    async removeNote(client, guildId, noteId, removerId) {
        const note = await NoteRepository.softDelete(guildId, noteId);
        
        if (note) {
            await client.aegis.services.audit.log(client, {
                guildId,
                action: AUDIT_ACTIONS.NOTE_REMOVED,
                actorId: removerId,
                targetId: note.targetId,
                payload: { noteId }
            });
        }

        return note;
    }

    /**
     * Get all active notes for a user.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {string} targetId
     * @returns {Promise<import('mongoose').Document[]>}
     */
    async getUserNotes(client, guildId, targetId) {
        return NoteRepository.findByTarget(guildId, targetId);
    }
}

module.exports = NoteService;

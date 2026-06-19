/**
 * @fileoverview GuildCounterRepository
 * Atomic sequential ID generation for cases and notes per guild.
 *
 * Uses MongoDB findOneAndUpdate with $inc and upsert:true to guarantee
 * that each call returns a unique, incrementing integer — even under
 * concurrent requests across shards.
 *
 * Never use this model directly. Always call these static methods.
 */

'use strict';

const GuildCounter = require('../models/GuildCounter');

class GuildCounterRepository {

    /**
     * Atomically increment and return the next case ID for a guild.
     * Starts at 1 for new guilds.
     * @param {string} guildId
     * @returns {Promise<number>} The next sequential case ID
     */
    static async nextCaseId(guildId) {
        const doc = await GuildCounter.findOneAndUpdate(
            { guildId },
            { $inc: { caseSequence: 1 } },
            { upsert: true, new: true }
        );
        return doc.caseSequence;
    }

    /**
     * Atomically increment and return the next note ID for a guild.
     * Starts at 1 for new guilds.
     * @param {string} guildId
     * @returns {Promise<number>} The next sequential note ID
     */
    static async nextNoteId(guildId) {
        const doc = await GuildCounter.findOneAndUpdate(
            { guildId },
            { $inc: { noteSequence: 1 } },
            { upsert: true, new: true }
        );
        return doc.noteSequence;
    }
}

module.exports = GuildCounterRepository;

/**
 * @fileoverview Guild Settings Schema
 * Framework-level per-guild configuration stored in MongoDB.
 * Contains only settings that the Galaxy Handler core systems use.
 *
 * For bot-specific settings (welcome messages, moderation, etc.),
 * create a separate model in your own bot project.
 *
 * Access via: client.db.model('GuildSettings')
 *
 * Usage example in a command:
 *   const Settings = client.db.model('GuildSettings');
 *   const settings = await Settings.getOrCreate(interaction.guildId);
 */

const mongoose = require('mongoose');

const GuildSettingsSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    // ── Prefix Commands ────────────────────────────────────────────────────────
    // Used by GalaxyClient._resolvePrefix() to support per-guild prefixes.
    prefix: {
        type: String,
        default: '?',
        maxlength: 5
    },

    // ── Locale/Language ────────────────────────────────────────────────────────
    // Used by LocaleManager if you implement per-guild language switching.
    locale: {
        type: String,
        default: 'en',
        enum: ['en', 'ar'] // Add more as you create locale files
    },

    // ── Log Channel ───────────────────────────────────────────────────────────
    // Optional channel ID for framework-level logs (joins, leaves, errors).
    logChannelId: {
        type: String,
        default: null
    },

    // ── Modules / Plugins ──────────────────────────────────────────────────────
    // Dynamic storage for specific bot features (e.g., tickets, economy)
    // Access via: settings.modules?.get('tickets')
    modules: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: {}
    }

}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

/**
 * Static helper: Get or create settings for a guild.
 * @param {string} guildId
 * @returns {Promise<import('mongoose').Document>}
 */
GuildSettingsSchema.statics.getOrCreate = async function(guildId) {
    let settings = await this.findOne({ guildId });
    if (!settings) {
        settings = await this.create({ guildId });
    }
    return settings;
};

module.exports = mongoose.model('GuildSettings', GuildSettingsSchema);

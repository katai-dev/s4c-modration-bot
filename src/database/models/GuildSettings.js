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
 *
 * Aegis config is stored at modules.get('aegis') on live documents,
 * or modules.aegis on lean() results. Use GuildSettingsRepository
 * for all Aegis config access — never query GuildSettings directly
 * from services or commands.
 */

'use strict';

const mongoose = require('mongoose');

// ── Aegis Module Config Sub-Schema ─────────────────────────────────────────────
// Stored as the 'aegis' key inside GuildSettings.modules (Map).
// Defines all per-guild Aegis configuration with production defaults.
// Access on live document: settings.modules.get('aegis')
// Access on lean result:   settings.modules?.aegis
const aegisRolesSchema = new mongoose.Schema({
    moderator:      { type: String, default: null }, // Discord role ID → Tier 1
    seniorModerator: { type: String, default: null }, // Discord role ID → Tier 2
    admin:          { type: String, default: null }, // Discord role ID → Tier 3
    headAdmin:      { type: String, default: null }  // Discord role ID → Tier 4
}, { _id: false });

const aegisApprovalRequirementsSchema = new mongoose.Schema({
    moderator:       { type: Number, default: 1, min: 1 },
    seniorModerator: { type: Number, default: 1, min: 1 },
    admin:           { type: Number, default: 1, min: 1 }
}, { _id: false });

const aegisRateLimitSchema = new mongoose.Schema({
    maxCases:      { type: Number, default: 3,    min: 1 },
    windowSeconds: { type: Number, default: 3600, min: 60 }
}, { _id: false });

const aegisConfigSchema = new mongoose.Schema({
    enabled:                { type: Boolean, default: false },

    // ── Channels ────────────────────────────────────────────────────────────
    reviewChannelId:        { type: String,  default: null },
    fallbackChannelId:      { type: String,  default: null },

    // ── Risk Scoring Weights ────────────────────────────────────────────────
    // Points added to riskScore per approved case category.
    // Configurable per guild via /config (Phase 5). Defaults are V3 standard.
    riskWeights: {
        type: new mongoose.Schema({
            warn:    { type: Number, default: 1, min: 0 },
            timeout: { type: Number, default: 3, min: 0 }
        }, { _id: false }),
        default: () => ({})
    },

    // ── Role Tier Mappings ──────────────────────────────────────────────────
    roles:                  { type: aegisRolesSchema, default: () => ({}) },

    // ── Review Approval Requirements ────────────────────────────────────────
    // How many approvals required per tier before a case is auto-approved.
    approvalRequirements:   { type: aegisApprovalRequirementsSchema, default: () => ({}) },

    // ── Rate Limiting ───────────────────────────────────────────────────────
    rateLimit:              { type: aegisRateLimitSchema, default: () => ({}) },

    // ── Duplicate Detection ─────────────────────────────────────────────────
    duplicateWindowSeconds: { type: Number,  default: 60,    min: 0 },

    // ── Case Lifecycle ──────────────────────────────────────────────────────
    caseExpiryEnabled:      { type: Boolean, default: true },
    caseExpiryDays:         { type: Number,  default: 7,     min: 1 },
    deadlockHours:          { type: Number,  default: 24,    min: 1 },

    // ── Archival & Retention ────────────────────────────────────────────────
    auditArchivalMonths:    { type: Number,  default: 18,    min: 1 },
    evidenceRetentionMonths: { type: Number, default: 12,    min: 1 },

    // ── Reporting ───────────────────────────────────────────────────────────
    calendarAlignedStats:   { type: Boolean, default: false }
}, { _id: false });

// Export the schema so repositories can reference its defaults if needed.
// Not a standalone model — stored inside GuildSettings.modules map.
// ── Default Aegis Config ───────────────────────────────────────────────────────
// Used by ConfigService.getDefaultConfig() and GuildSettingsRepository.
const AEGIS_DEFAULT_CONFIG = {
    enabled: false,
    reviewChannelId: null,
    fallbackChannelId: null,
    riskWeights: {
        warn:    1,
        timeout: 3
    },
    roles: {
        moderator: null,
        seniorModerator: null,
        admin: null,
        headAdmin: null
    },
    approvalRequirements: {
        moderator: 1,
        seniorModerator: 1,
        admin: 1
    },
    rateLimit: {
        maxCases: 3,
        windowSeconds: 3600
    },
    duplicateWindowSeconds: 60,
    caseExpiryEnabled: true,
    caseExpiryDays: 7,
    deadlockHours: 24,
    auditArchivalMonths: 18,
    evidenceRetentionMonths: 12,
    calendarAlignedStats: false
};

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
module.exports.AEGIS_DEFAULT_CONFIG = AEGIS_DEFAULT_CONFIG;
module.exports.AegisConfigSchema = aegisConfigSchema;

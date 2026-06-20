'use strict';

/**
 * @fileoverview AuditArchivalJob
 * Runs daily to archive audit logs older than the configured threshold.
 * Archived logs are marked `isArchived: true` but are never physically deleted.
 */

const Job = require('../structures/Job');
const GuildSettings = require('../database/models/GuildSettings');
const AuditLogRepository = require('../database/repositories/AuditLogRepository');

module.exports = new Job({
    name: 'aegis-audit-archival',
    interval: 24 * 60 * 60 * 1000, // 24 hours
    runOnStartup: true,

    run: async (client) => {
        const activeGuilds = await GuildSettings.find({ 'modules.aegis.enabled': true }).lean();
        
        for (const settings of activeGuilds) {
            const guildId = settings.guildId;
            const aegisConfig = settings.modules?.aegis;
            if (!aegisConfig) continue;

            const months = aegisConfig.auditArchivalMonths || 18;
            const thresholdDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

            try {
                const count = await AuditLogRepository.markArchived(guildId, thresholdDate);
                if (count > 0) {
                    client.logger.info(`[AuditArchivalJob] Archived ${count} audit logs in guild ${guildId}.`);
                }
            } catch (err) {
                client.logger.error(`[AuditArchivalJob] Failed to archive logs in guild ${guildId}: ${err.message}`);
            }
        }
    }
});

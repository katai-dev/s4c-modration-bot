'use strict';

/**
 * @fileoverview EvidenceArchivalJob
 * Runs weekly to delete evidence files from Cloudinary for cases older than
 * the configured evidenceRetentionMonths.
 * 
 * Modifies the Case to set `evidenceArchived: true` and clear the URLs, 
 * preserving the history that evidence once existed but was purged per policy.
 */

const Job = require('../structures/Job');
const GuildSettings = require('../database/models/GuildSettings');
const CaseRepository = require('../database/repositories/CaseRepository');

module.exports = new Job({
    name: 'aegis-evidence-archival',
    interval: 7 * 24 * 60 * 60 * 1000, // 7 days
    runOnStartup: true,

    run: async (client) => {
        const activeGuilds = await GuildSettings.find({ 'modules.aegis.enabled': true }).lean();
        
        for (const settings of activeGuilds) {
            const guildId = settings.guildId;
            const aegisConfig = settings.modules?.aegis;
            if (!aegisConfig) continue;

            const months = aegisConfig.evidenceRetentionMonths || 12;
            const thresholdDate = new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000);

            try {
                // Find eligible cases
                const cases = await CaseRepository.findForEvidenceArchival(guildId, thresholdDate);
                if (!cases || cases.length === 0) continue;

                let purgedCount = 0;
                for (const caseDoc of cases) {
                    const publicIds = caseDoc.cloudinaryPublicIds || [];
                    if (publicIds.length > 0) {
                        // Delete from Cloudinary
                        await client.aegis.services.evidence.deleteByPublicIds(client, guildId, publicIds);
                    }
                    
                    // Mark as archived in DB (clears arrays, sets evidenceArchived: true)
                    await CaseRepository.markEvidenceArchived(guildId, caseDoc.caseId);
                    purgedCount++;
                }

                if (purgedCount > 0) {
                    client.logger.info(`[EvidenceArchivalJob] Purged evidence for ${purgedCount} cases in guild ${guildId}.`);
                }
            } catch (err) {
                client.logger.error(`[EvidenceArchivalJob] Failed to process guild ${guildId}: ${err.message}`);
            }
        }
    }
});

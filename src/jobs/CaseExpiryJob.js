'use strict';

/**
 * @fileoverview CaseExpiryJob
 * Runs every 15 minutes to find and expire cases that have passed their `expiresAt`
 * limit without receiving an approval or rejection.
 */

const Job = require('../structures/Job');
const CaseRepository = require('../database/repositories/CaseRepository');

module.exports = new Job({
    name: 'aegis-case-expiry',
    interval: 15 * 60 * 1000, // 15 minutes
    runOnStartup: true,

    run: async (client) => {
        // Find all expirable cases across all guilds.
        // Handled entirely by CaseService to ensure timeout revert and audit.
        const expirable = await CaseRepository.findExpirable();
        if (!expirable || expirable.length === 0) return;

        client.logger.info(`[CaseExpiryJob] Found ${expirable.length} expirable case(s). Processing...`);

        let expiredCount = 0;
        for (const caseDoc of expirable) {
            await client.systems.errors.wrap(
                () => client.aegis.services.cases.expireCase(client, caseDoc),
                'CaseExpiryJob.expireCase'
            );
            expiredCount++;
        }

        client.logger.info(`[CaseExpiryJob] Successfully expired ${expiredCount} case(s).`);
    }
});

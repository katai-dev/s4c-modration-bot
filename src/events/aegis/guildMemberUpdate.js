'use strict';

/**
 * @fileoverview guildMemberUpdate
 * Listens for timeout removals (communicationDisabledUntil transitioning to null).
 * 
 * When a timeout is removed natively in Discord (or expires naturally),
 * Aegis updates all 'Approved' timeout cases for that user to 'Completed'.
 * This prevents dead state where a timeout case remains 'Approved' forever.
 */

const Event = require('../../structures/Event');
const CaseRepository = require('../../database/repositories/CaseRepository');

module.exports = new Event({
    name: 'guildMemberUpdate',
    run: async (client, oldMember, newMember) => {
        // We only care if they had a timeout and now they don't.
        if (oldMember.communicationDisabledUntilTimestamp !== null && 
            newMember.communicationDisabledUntilTimestamp === null) {
            
            const guildId  = newMember.guild.id;
            const targetId = newMember.id;

            // Fetch all Approved timeout cases for this user
            const approvedCases = await CaseRepository.findByTarget(guildId, targetId, { status: 'Approved' });
            if (!approvedCases || approvedCases.length === 0) return;

            // Filter for timeout category
            const timeoutCases = approvedCases.filter(c => c.punishmentTypeSnapshot?.category === 'timeout');
            
            for (const caseDoc of timeoutCases) {
                try {
                    await CaseRepository.updateStatus(guildId, caseDoc.caseId, 'Completed');
                    client.logger.info(`[Aegis] Timeout removed natively for ${targetId} in ${guildId} — Case #${caseDoc.caseId} marked Completed.`);
                } catch (err) {
                    client.logger.error(`[Aegis] Failed to mark case #${caseDoc.caseId} Completed for ${targetId}: ${err.message}`);
                }
            }
        }
    }
});

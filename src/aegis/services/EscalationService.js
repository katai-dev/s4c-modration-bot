'use strict';

/**
 * @fileoverview EscalationService
 * Automates the creation of escalation cases.
 * 
 * Called by ReviewService immediately after a warning case is approved.
 * If the user's active (un-escalated) warnings for that specific punishment type
 * reach the configured warnLimit, an escalation case is generated automatically.
 */

const CaseRepository = require('../../database/repositories/CaseRepository');
const PunishmentTypeRepository = require('../../database/repositories/PunishmentTypeRepository');

class EscalationService {

    /**
     * Check if an approved case triggers an escalation, and process it if so.
     * 
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {string} targetId
     * @param {import('mongoose').Document} approvedCaseDoc
     * @returns {Promise<void>}
     */
    async processEscalation(client, guildId, targetId, approvedCaseDoc) {
        // 1. Fetch the exact punishment type to check its limits
        const punishmentTypeId = approvedCaseDoc.punishmentTypeId;
        const punishmentType = await PunishmentTypeRepository.findById(guildId, punishmentTypeId);
        
        if (!punishmentType || !punishmentType.isActive) return;
        if (!punishmentType.warnLimit || !punishmentType.escalationTargetId) return;

        // 2. Fetch all active (Approved, !isEscalated) warnings of this type
        const activeWarnings = await CaseRepository.findActiveWarnings(guildId, targetId, punishmentTypeId);
        const count = activeWarnings.length;

        // 3. Trigger condition: count matches exactly a multiple of warnLimit
        // Using modulo allows re-triggering if the user somehow gets another N warnings,
        // though typically they'd be cleared. However, since we mark them escalated, 
        // the active array is exactly what triggered it.
        if (count > 0 && count >= punishmentType.warnLimit) {
            
            // Fetch the target punishment type
            const targetType = await PunishmentTypeRepository.findById(guildId, punishmentType.escalationTargetId);
            if (!targetType || !targetType.isActive) {
                client.logger.warn(
                    `[EscalationService] Cannot escalate case #${approvedCaseDoc.caseId} in ${guildId}. ` +
                    `Target punishment type missing or inactive.`
                );
                return;
            }

            // Extract ObjectIds of the triggering warnings
            // We take exactly `warnLimit` number of warnings to fulfill the requirement,
            // leaving any excess for the next round.
            const triggeringCases = activeWarnings.slice(0, punishmentType.warnLimit);
            const caseIds = triggeringCases.map(c => c._id);

            // 4. Mark them as escalated immediately so they drop out of the active count
            await CaseRepository.markEscalated(guildId, caseIds);

            // 5. Delegate system case creation to CaseService
            await client.aegis.services.cases.createSystemCase(client, guildId, {
                targetId,
                punishmentType: targetType,
                escalatedFromCaseIds: caseIds
            });

            client.logger.info(`[EscalationService] User ${targetId} hit warn limit for ${punishmentType.name}. Escalation triggered.`);
        }
    }
}

module.exports = EscalationService;

/**
 * @fileoverview CaseValidator
 * Validates case creation inputs before they reach CaseService.
 * All validation is pure — no async calls, no DB access.
 *
 * Commands call this validator before calling any service method.
 * Services may also call it internally as a second line of defence.
 *
 * validateCreate() returns { valid, errors[] } where errors is an array
 * of human-readable error strings. An empty errors array means valid.
 */

'use strict';

class CaseValidator {

    /**
     * Validate inputs for case creation.
     * @param {object} data
     * @param {string} data.guildId
     * @param {string} data.targetId Discord user ID of the target
     * @param {string} data.moderatorId Discord user ID of the submitting moderator
     * @param {string} data.punishmentTypeId MongoDB ObjectId string of the punishment type
     * @param {string[]} [data.evidenceUrls] Array of URL strings (Discord CDN or direct links)
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validateCreate({ guildId, targetId, moderatorId, punishmentTypeId, evidenceUrls = [] }) {
        const errors = [];

        if (!guildId || typeof guildId !== 'string') {
            errors.push('guildId is required.');
        }

        if (!targetId || typeof targetId !== 'string') {
            errors.push('targetId is required.');
        }

        if (!moderatorId || typeof moderatorId !== 'string') {
            errors.push('moderatorId is required.');
        }

        if (!punishmentTypeId || typeof punishmentTypeId !== 'string') {
            errors.push('punishmentTypeId is required.');
        }

        if (!Array.isArray(evidenceUrls)) {
            errors.push('evidenceUrls must be an array.');
        } else {
            for (const url of evidenceUrls) {
                if (typeof url !== 'string' || !url.startsWith('http')) {
                    errors.push(`Invalid evidence URL: ${url}`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Check that a moderator is not submitting a case against themselves.
     * Self-review is blocked at the service layer; self-submission is blocked here.
     * @param {string} moderatorId
     * @param {string} targetId
     * @returns {boolean} true = valid (not self), false = self-submission
     */
    static validateNotSelf(moderatorId, targetId) {
        return moderatorId !== targetId;
    }

    /**
     * Check that the provided punishment type matches the expected category.
     * Used to verify a snapshot is consistent before creating a case.
     * @param {object} punishmentType PunishmentType document or snapshot
     * @param {'warn'|'timeout'} expectedCategory
     * @returns {{ valid: boolean, reason?: string }}
     */
    static validateCategory(punishmentType, expectedCategory) {
        if (!punishmentType) {
            return { valid: false, reason: 'Punishment type not found.' };
        }

        if (!punishmentType.isActive) {
            return { valid: false, reason: 'This punishment type is no longer active.' };
        }

        if (punishmentType.category !== expectedCategory) {
            return {
                valid: false,
                reason: `Expected category '${expectedCategory}' but got '${punishmentType.category}'.`
            };
        }

        if (punishmentType.category === 'timeout' && !punishmentType.duration) {
            return { valid: false, reason: 'Timeout punishment type must have a duration.' };
        }

        return { valid: true };
    }
}

module.exports = CaseValidator;

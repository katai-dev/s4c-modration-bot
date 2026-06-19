/**
 * @fileoverview ConfigValidator
 * Validates Aegis configuration patches before they are written to the database.
 * All validation is pure — no async calls, no DB access.
 *
 * Used by ConfigService and /config command handlers before calling setConfig
 * or patchConfig. Returns { valid, errors[] } where an empty errors array
 * means the input is valid.
 */

'use strict';

class ConfigValidator {

    /**
     * Validate a partial config patch object.
     * Only validates fields that are present in the patch.
     * @param {object} patch Partial Aegis config
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validatePatch(patch) {
        const errors = [];

        if (patch === null || typeof patch !== 'object') {
            return { valid: false, errors: ['Config patch must be an object.'] };
        }

        if ('enabled' in patch && typeof patch.enabled !== 'boolean') {
            errors.push('enabled must be a boolean.');
        }

        if ('reviewChannelId' in patch &&
            patch.reviewChannelId !== null &&
            typeof patch.reviewChannelId !== 'string') {
            errors.push('reviewChannelId must be a string or null.');
        }

        if ('fallbackChannelId' in patch &&
            patch.fallbackChannelId !== null &&
            typeof patch.fallbackChannelId !== 'string') {
            errors.push('fallbackChannelId must be a string or null.');
        }

        if ('roles' in patch) {
            const roleResult = ConfigValidator.validateRoleMapping(patch.roles);
            errors.push(...roleResult.errors);
        }

        if ('approvalRequirements' in patch) {
            const approvalResult = ConfigValidator.validateApprovalRequirements(patch.approvalRequirements);
            errors.push(...approvalResult.errors);
        }

        if ('rateLimit' in patch) {
            const rl = patch.rateLimit;
            if (!rl || typeof rl !== 'object') {
                errors.push('rateLimit must be an object.');
            } else {
                if ('maxCases' in rl && (typeof rl.maxCases !== 'number' || rl.maxCases < 1)) {
                    errors.push('rateLimit.maxCases must be a positive integer.');
                }
                if ('windowSeconds' in rl && (typeof rl.windowSeconds !== 'number' || rl.windowSeconds < 60)) {
                    errors.push('rateLimit.windowSeconds must be at least 60.');
                }
            }
        }

        if ('duplicateWindowSeconds' in patch &&
            (typeof patch.duplicateWindowSeconds !== 'number' || patch.duplicateWindowSeconds < 0)) {
            errors.push('duplicateWindowSeconds must be a non-negative number.');
        }

        if ('caseExpiryEnabled' in patch && typeof patch.caseExpiryEnabled !== 'boolean') {
            errors.push('caseExpiryEnabled must be a boolean.');
        }

        if ('caseExpiryDays' in patch &&
            (typeof patch.caseExpiryDays !== 'number' || patch.caseExpiryDays < 1)) {
            errors.push('caseExpiryDays must be a positive integer.');
        }

        if ('deadlockHours' in patch &&
            (typeof patch.deadlockHours !== 'number' || patch.deadlockHours < 1)) {
            errors.push('deadlockHours must be a positive integer.');
        }

        if ('auditArchivalMonths' in patch &&
            (typeof patch.auditArchivalMonths !== 'number' || patch.auditArchivalMonths < 1)) {
            errors.push('auditArchivalMonths must be a positive integer.');
        }

        if ('evidenceRetentionMonths' in patch &&
            (typeof patch.evidenceRetentionMonths !== 'number' || patch.evidenceRetentionMonths < 1)) {
            errors.push('evidenceRetentionMonths must be a positive integer.');
        }

        if ('calendarAlignedStats' in patch && typeof patch.calendarAlignedStats !== 'boolean') {
            errors.push('calendarAlignedStats must be a boolean.');
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate a role mapping object.
     * All values must be Discord snowflake strings or null.
     * @param {object} roles
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validateRoleMapping(roles) {
        const errors = [];

        if (!roles || typeof roles !== 'object') {
            return { valid: false, errors: ['roles must be an object.'] };
        }

        const validKeys = ['moderator', 'seniorModerator', 'admin', 'headAdmin'];
        for (const key of validKeys) {
            if (key in roles) {
                const val = roles[key];
                if (val !== null && (typeof val !== 'string' || !/^\d{17,20}$/.test(val))) {
                    errors.push(`roles.${key} must be a valid Discord snowflake ID or null.`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate approval requirements object.
     * Each tier's value must be a positive integer.
     * @param {object} req
     * @returns {{ valid: boolean, errors: string[] }}
     */
    static validateApprovalRequirements(req) {
        const errors = [];

        if (!req || typeof req !== 'object') {
            return { valid: false, errors: ['approvalRequirements must be an object.'] };
        }

        const validKeys = ['moderator', 'seniorModerator', 'admin'];
        for (const key of validKeys) {
            if (key in req) {
                const val = req[key];
                if (typeof val !== 'number' || !Number.isInteger(val) || val < 1) {
                    errors.push(`approvalRequirements.${key} must be a positive integer.`);
                }
            }
        }

        return { valid: errors.length === 0, errors };
    }
}

module.exports = ConfigValidator;

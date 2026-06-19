/**
 * @fileoverview AuditService
 * Writes immutable audit log entries for every state change within Aegis.
 *
 * Design principles:
 *   - Fire-and-forget from the caller's perspective.
 *   - AuditService.log() catches all internal errors and logs them via
 *     client.logger.error(). It NEVER throws or propagates failures.
 *   - Audit writes NEVER block or interrupt the primary workflow.
 *   - Audit records are immutable — no update or delete operations.
 *   - AI suggestion and reviewer decision are separate chronological entries.
 *     The AI_SUGGESTION_LOGGED entry is never retroactively updated.
 *
 * Usage in any service:
 *   await client.aegis.services.audit.log(client, {
 *       guildId:  interaction.guildId,
 *       action:   AUDIT_ACTIONS.CASE_CREATED,
 *       actorId:  interaction.user.id,
 *       targetId: targetUser.id,
 *       caseId:   caseDoc._id,
 *       payload:  { caseId: caseDoc.caseId, punishmentType: snapshot.name }
 *   });
 *
 * AUDIT_ACTIONS is re-exported here for convenience so callers only need
 * to import from AuditService.
 */

'use strict';

const AuditLogRepository = require('../../database/repositories/AuditLogRepository');
const { AUDIT_ACTIONS } = require('../../database/models/AuditLog');

class AuditService {

    /**
     * Write an audit log entry.
     * Fire-and-forget: errors are logged but never propagated.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {object} entry
     * @param {string} entry.guildId
     * @param {string} entry.action One of AUDIT_ACTIONS values
     * @param {string} entry.actorId Discord user ID or 'SYSTEM'
     * @param {string|null} [entry.targetId]
     * @param {import('mongoose').Types.ObjectId|string|null} [entry.caseId] Case._id reference
     * @param {object} [entry.payload] Structured context data for this event
     * @returns {Promise<void>}
     */
    async log(client, entry) {
        try {
            await AuditLogRepository.create({
                guildId:  entry.guildId,
                action:   entry.action,
                actorId:  entry.actorId,
                targetId: entry.targetId  ?? null,
                caseId:   entry.caseId    ?? null,
                payload:  entry.payload   ?? {}
            });
        } catch (err) {
            // Audit failure must never interrupt the primary workflow.
            client.logger.error(`[AuditService] Failed to write audit log [${entry.action}] for guild ${entry.guildId}: ${err.message}`);
        }
    }
}

// Re-export AUDIT_ACTIONS so callers only need one import.
module.exports = { AuditService, AUDIT_ACTIONS };

'use strict';

/**
 * @fileoverview EvidenceService
 * Uploads Discord attachments to Cloudinary and returns the resulting URLs
 * and public IDs for storage on Case documents.
 *
 * Cloudinary credentials must be present in client.config.cloudinary:
 *   { cloud_name, api_key, api_secret }
 *
 * Partial failure is handled gracefully: if one upload fails, the remaining
 * uploads continue. The returned `incomplete` flag signals to CaseService
 * that evidenceIncomplete should be set to true on the Case document.
 *
 * This service performs no DB access. It is purely a Cloudinary wrapper.
 * Callers (CaseService) are responsible for persisting the returned data.
 */

const cloudinary = require('cloudinary').v2;

class EvidenceService {

    /**
     * Upload an array of Discord attachments to Cloudinary.
     * Uploads are performed concurrently (Promise.allSettled).
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {import('discord.js').Attachment[]} attachments  May be empty.
     * @returns {Promise<{ urls: string[], publicIds: string[], incomplete: boolean }>}
     */
    async upload(client, guildId, attachments) {
        if (!attachments || attachments.length === 0) {
            return { urls: [], publicIds: [], incomplete: false };
        }

        this._configure(client);

        const folder = `aegis/${guildId}`;
        const results = await Promise.allSettled(
            attachments.map(att =>
                cloudinary.uploader.upload(att.url, {
                    folder,
                    resource_type: 'auto',
                    use_filename:  false
                })
            )
        );

        const urls       = [];
        const publicIds  = [];
        let   incomplete = false;

        for (let i = 0; i < results.length; i++) {
            const result = results[i];
            if (result.status === 'fulfilled') {
                urls.push(result.value.secure_url);
                publicIds.push(result.value.public_id);
            } else {
                incomplete = true;
                client.logger.warn(
                    `[EvidenceService] Upload failed for attachment ${i} in guild ${guildId}: ` +
                    (result.reason?.message ?? String(result.reason))
                );
            }
        }

        return { urls, publicIds, incomplete };
    }

    /**
     * Delete Cloudinary resources by their public IDs.
     * Fire-and-forget — errors are logged but never propagated.
     * Called during archival (Phase 4+).
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {string[]} publicIds
     * @returns {Promise<void>}
     */
    async deleteByPublicIds(client, guildId, publicIds) {
        if (!publicIds || publicIds.length === 0) return;

        this._configure(client);

        try {
            await cloudinary.api.delete_resources(publicIds);
        } catch (err) {
            client.logger.warn(
                `[EvidenceService] Failed to delete ${publicIds.length} resource(s) ` +
                `for guild ${guildId}: ${err.message}`
            );
        }
    }

    /**
     * Configure the Cloudinary SDK from client config.
     * Called before every operation — safe to call multiple times (idempotent).
     * @param {import('../../client/GalaxyClient')} client
     * @private
     */
    _configure(client) {
        const cfg = client.config?.cloudinary ?? {};
        cloudinary.config({
            cloud_name: cfg.cloud_name,
            api_key:    cfg.api_key,
            api_secret: cfg.api_secret,
            secure:     true
        });
    }
}

module.exports = EvidenceService;

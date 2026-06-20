'use strict';

/**
 * @fileoverview StaffService
 * Manages staff active states, rolling statistic calculations, and leaderboards.
 *
 * Exposes methods used by /stats and /points commands.
 */

const AegisStaffRepository = require('../../database/repositories/AegisStaffRepository');
const StaffStatisticsRepository = require('../../database/repositories/StaffStatisticsRepository');
const StaffPointsRepository = require('../../database/repositories/StaffPointsRepository');
const Case = require('../../database/models/Case'); // Used for direct aggregate on rolling stats

class StaffService {

    /**
     * Compute and fetch up-to-date rolling statistics for a staff member.
     * Computes 7-day and 30-day approval rates, updates the evaluation rating,
     * and persists it to StaffStatistics.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @param {string} staffId
     * @returns {Promise<import('mongoose').Document>} Updated StaffStatistics document
     */
    async getStaffStats(client, guildId, staffId) {
        // Fetch current document
        const stats = await StaffStatisticsRepository.getOrCreate(guildId, staffId);

        // Check if we need to recompute (e.g. only recompute if > 1 hour old)
        // For precision and simplicity in this implementation, we recompute on every /stats call
        // since /stats is not an ultra-high frequency command.
        
        const now = new Date();
        const date7DaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const date30DaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Compute 7-day and 30-day stats
        const rolling7dayCases = await this._countStaffApprovals(guildId, staffId, date7DaysAgo);
        const rolling30dayCases = await this._countStaffApprovals(guildId, staffId, date30DaysAgo);

        // Total approvals vs total decisions for evaluation
        // Evaluation logic: Excellent >= 90%, Good 75-89%, Average 60-74%, Needs Review < 60%
        let evaluationRating = null;
        if (stats.totalCases >= 10) {
            const approvalRate = stats.approvedCases / stats.totalCases;
            if (approvalRate >= 0.90) evaluationRating = 'Excellent';
            else if (approvalRate >= 0.75) evaluationRating = 'Good';
            else if (approvalRate >= 0.60) evaluationRating = 'Average';
            else evaluationRating = 'Needs Review';
        }

        // We can optionally compute approval rates for 7-day/30-day if we track total decisions in that window.
        // For now, we only track the raw count of cases they voted on in those windows per the model design.
        
        const patch = {
            rolling7dayCases,
            rolling30dayCases,
            evaluationRating,
            lastComputedAt: now
        };

        return StaffStatisticsRepository.update(guildId, staffId, patch);
    }

    /**
     * Get aggregated point leaderboards for a guild.
     * Returns top 10 for weekly, monthly, and lifetime.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @returns {Promise<{ weekly: any[], monthly: any[], lifetime: any[] }>}
     */
    async getLeaderboards(client, guildId) {
        const [weekly, monthly, lifetime] = await Promise.all([
            StaffPointsRepository.findWeeklyLeaderboard(guildId, 10),
            StaffPointsRepository.findMonthlyLeaderboard(guildId, 10),
            StaffPointsRepository.findLifetimeLeaderboard(guildId, 10)
        ]);

        return { weekly, monthly, lifetime };
    }

    /**
     * Get resolution leaderboard (most approved cases).
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @returns {Promise<any[]>}
     */
    async getResolutionLeaderboard(client, guildId) {
        return StaffStatisticsRepository.findLeaderboard(guildId, 10);
    }

    /**
     * Sync staff active status based on current guild members and configured roles.
     * Members who no longer have an Aegis role or left the guild are marked inactive.
     *
     * @param {import('../../client/GalaxyClient')} client
     * @param {string} guildId
     * @returns {Promise<void>}
     */
    async syncStaffStatus(client, guildId) {
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) return;

        const config = await client.aegis.services.config.getConfig(client, guildId);
        if (!config || !config.enabled) return;

        const allRecordedStaff = await AegisStaffRepository.findAllActive(guildId);
        
        for (const staff of allRecordedStaff) {
            const member = await guild.members.fetch(staff.staffId).catch(() => null);
            let isActive = false;
            
            if (member) {
                const pseudoInteraction = { guild, member };
                const tier = await client.systems.aegisPermissions.getTier(pseudoInteraction);
                if (tier > 0) {
                    isActive = true;
                    if (tier !== staff.tier) {
                        await AegisStaffRepository.setTier(guildId, staff.staffId, tier);
                    }
                }
            }

            if (!isActive) {
                await AegisStaffRepository.setActive(guildId, staff.staffId, false);
                client.logger.info(`[StaffService] Staff ${staff.staffId} marked inactive in ${guildId}.`);
            }
        }
    }

    // ── Private Helpers ────────────────────────────────────────────────────────

    /**
     * Count how many cases a staff member participated in (voted on) since a date.
     * @param {string} guildId
     * @param {string} staffId
     * @param {Date} since
     * @returns {Promise<number>}
     * @private
     */
    async _countStaffApprovals(guildId, staffId, since) {
        // We use aggregate because approvals is an array of sub-documents.
        // We want cases where approvals array contains the staffId with decidedAt >= since.
        return Case.countDocuments({
            guildId,
            isDeleted: false,
            approvals: {
                $elemMatch: {
                    reviewerId: staffId,
                    decidedAt: { $gte: since }
                }
            }
        });
    }
}

module.exports = StaffService;

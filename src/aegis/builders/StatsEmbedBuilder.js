'use strict';

/**
 * @fileoverview StatsEmbedBuilder
 * Builds the embed for the /stats command.
 */

const { EmbedBuilder } = require('discord.js');
const { Colors }       = require('../../utils/EmbedHelper');

class StatsEmbedBuilder {
    /**
     * @param {import('mongoose').Document} stats StaffStatistics document
     * @param {import('mongoose').Document} points StaffPoints document
     * @param {import('discord.js').User} targetUser
     * @returns {EmbedBuilder}
     */
    static build(stats, points, targetUser) {
        const approvalRate = stats.totalCases > 0 
            ? Math.round((stats.approvedCases / stats.totalCases) * 100)
            : 0;

        const avgResolutionMins = stats.totalCases > 0
            ? Math.round(stats.avgResolutionMs / 60000)
            : 0;

        return new EmbedBuilder()
            .setColor(Colors.PRIMARY)
            .setAuthor({ name: `Moderation Stats: ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() })
            .addFields(
                { name: 'Total Decisions',   value: `${stats.totalCases}`, inline: true },
                { name: 'Approved',          value: `${stats.approvedCases} (${approvalRate}%)`, inline: true },
                { name: 'Rejected',          value: `${stats.rejectedCases}`, inline: true },
                { name: 'Rolling 7d / 30d',  value: `${stats.rolling7dayCases || 0} / ${stats.rolling30dayCases || 0}`, inline: true },
                { name: 'Avg Resolution',    value: `${avgResolutionMins} mins`, inline: true },
                { name: 'Evaluation Rating', value: `${stats.evaluationRating || 'Insufficient Data'}`, inline: true },
                { name: 'Points (W/M/L)',    value: `${points?.weeklyPoints || 0} / ${points?.monthlyPoints || 0} / ${points?.lifetimePoints || 0}`, inline: false }
            )
            .setTimestamp();
    }
}

module.exports = StatsEmbedBuilder;

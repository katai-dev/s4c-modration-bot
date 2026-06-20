'use strict';

/**
 * @fileoverview PointsEmbedBuilder
 * Builds the embed for the /points command.
 */

const { EmbedBuilder } = require('discord.js');
const { Colors }       = require('../../utils/EmbedHelper');

class PointsEmbedBuilder {
    /**
     * @param {object} leaderboards
     * @param {import('mongoose').Document[]} leaderboards.weekly
     * @param {import('mongoose').Document[]} leaderboards.monthly
     * @param {import('mongoose').Document[]} leaderboards.lifetime
     * @returns {EmbedBuilder}
     */
    static build(leaderboards) {
        const embed = new EmbedBuilder()
            .setColor(Colors.PRIMARY)
            .setTitle('Moderation Points Leaderboards');

        const formatBoard = (arr, key) => {
            if (!arr || arr.length === 0) return 'No data yet.';
            return arr.map((doc, i) => `**${i + 1}.** <@${doc.staffId}>: ${doc[key]} pts`).join('\n');
        };

        embed.addFields(
            { name: 'Weekly',   value: formatBoard(leaderboards.weekly, 'weeklyPoints'), inline: true },
            { name: 'Monthly',  value: formatBoard(leaderboards.monthly, 'monthlyPoints'), inline: true },
            { name: 'Lifetime', value: formatBoard(leaderboards.lifetime, 'lifetimePoints'), inline: false }
        );

        return embed;
    }
}

module.exports = PointsEmbedBuilder;

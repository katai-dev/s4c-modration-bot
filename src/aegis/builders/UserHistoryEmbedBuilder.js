'use strict';

/**
 * @fileoverview UserHistoryEmbedBuilder
 * Builds the embed for the /user command.
 */

const { EmbedBuilder } = require('discord.js');
const { Colors }       = require('../../utils/EmbedHelper');

const RISK_COLORS = {
    Low:      0x57F287,
    Medium:   0xFEE75C,
    High:     0xED4245,
    Critical: 0x9B59B6
};

class UserHistoryEmbedBuilder {
    /**
     * @param {import('discord.js').User} targetUser
     * @param {import('mongoose').Document} userDoc (AegisUser)
     * @param {import('mongoose').Document[]} activeWarnings
     * @param {import('mongoose').Document[]} recentCases
     * @param {number} noteCount
     * @returns {EmbedBuilder}
     */
    static build(targetUser, userDoc, activeWarnings, recentCases, noteCount) {
        const riskColor = RISK_COLORS[userDoc?.riskTier] ?? Colors.PRIMARY;

        const embed = new EmbedBuilder()
            .setColor(riskColor)
            .setAuthor({ name: `User History: ${targetUser.tag}`, iconURL: targetUser.displayAvatarURL() });

        if (!userDoc) {
            embed.setDescription('No Aegis records found for this user.');
            return embed;
        }

        embed.addFields(
            { name: 'Risk Tier',     value: `${userDoc.riskTier || 'Low'}`, inline: true },
            { name: 'Risk Score',    value: `${userDoc.riskScore || 0}`, inline: true },
            { name: 'Repeat Offender', value: userDoc.isRepeatOffender ? '⚠️ Yes' : 'No', inline: true },
            { name: 'Lifetime Warns',  value: `${userDoc.warnCount || 0}`, inline: true },
            { name: 'Lifetime Timeouts', value: `${userDoc.timeoutCount || 0}`, inline: true },
            { name: 'Staff Notes',   value: `${noteCount} attached`, inline: true }
        );

        if (activeWarnings && activeWarnings.length > 0) {
            const warningStr = activeWarnings.map(c => `• Case \`#${c.caseId}\`: ${c.punishmentTypeSnapshot?.name}`).join('\n');
            embed.addFields({ name: `Active Warnings (${activeWarnings.length})`, value: warningStr.slice(0, 1024), inline: false });
        }

        if (recentCases && recentCases.length > 0) {
            const recentStr = recentCases.map(c => {
                const icon = c.status === 'Approved' ? '✅' : (c.status === 'Rejected' ? '❌' : '🕐');
                return `${icon} Case \`#${c.caseId}\` [${c.status}]: ${c.punishmentTypeSnapshot?.name}`;
            }).join('\n');
            embed.addFields({ name: `Recent Cases (${recentCases.length})`, value: recentStr.slice(0, 1024), inline: false });
        } else {
            embed.addFields({ name: 'Recent Cases', value: 'No case history.', inline: false });
        }

        return embed;
    }
}

module.exports = UserHistoryEmbedBuilder;

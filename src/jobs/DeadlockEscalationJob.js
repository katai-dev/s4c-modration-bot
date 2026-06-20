'use strict';

/**
 * @fileoverview DeadlockEscalationJob
 * Runs every hour to detect cases that have been pending longer than the guild's
 * configured `deadlockHours` limit.
 * 
 * Instead of auto-approving (unsafe), this job posts a summary alert into the 
 * review channel, pinging the Admin and Head Admin roles to draw attention.
 */

const Job = require('../structures/Job');
const GuildSettings = require('../database/models/GuildSettings');
const CaseRepository = require('../database/repositories/CaseRepository');
const { EmbedBuilder } = require('discord.js');
const { Colors } = require('../utils/EmbedHelper');

module.exports = new Job({
    name: 'aegis-deadlock-escalation',
    interval: 60 * 60 * 1000, // 60 minutes
    runOnStartup: true,

    run: async (client) => {
        // Find all active Aegis guilds
        const activeGuilds = await GuildSettings.find({ 'modules.aegis.enabled': true }).lean();
        
        for (const settings of activeGuilds) {
            const guildId = settings.guildId;
            const aegisConfig = settings.modules?.aegis;
            if (!aegisConfig) continue;

            const deadlockHours = aegisConfig.deadlockHours || 24;
            const olderThan = new Date(Date.now() - deadlockHours * 60 * 60 * 1000);

            // Fetch cases that are deadlocked and haven't been pinged yet
            const deadlockedCases = await CaseRepository.findDeadlocked(guildId, olderThan);
            if (!deadlockedCases || deadlockedCases.length === 0) continue;

            // Group by review channel so we send one message per channel
            const grouped = new Map();
            for (const caseDoc of deadlockedCases) {
                // If the case doesn't have a reviewChannelId recorded, fallback to config
                const channelId = caseDoc.reviewChannelId || aegisConfig.reviewChannelId;
                if (!channelId) continue;
                
                if (!grouped.has(channelId)) grouped.set(channelId, []);
                grouped.get(channelId).push(caseDoc);
            }

            for (const [channelId, cases] of grouped.entries()) {
                try {
                    const channel = await client.channels.fetch(channelId).catch(() => null);
                    if (!channel || !channel.isTextBased()) continue;

                    // Build ping string (Admins and Head Admins)
                    const pings = [];
                    if (aegisConfig.roles?.headAdmin) pings.push(`<@&${aegisConfig.roles.headAdmin}>`);
                    if (aegisConfig.roles?.admin)     pings.push(`<@&${aegisConfig.roles.admin}>`);
                    const pingText = pings.length > 0 ? pings.join(' ') : 'Attention Moderation Team';

                    const embed = new EmbedBuilder()
                        .setColor(Colors.ERROR)
                        .setTitle('⚠️ Aegis Deadlock Alert')
                        .setDescription(`There are **${cases.length}** case(s) pending longer than the ${deadlockHours}-hour limit. Immediate review is required.`)
                        .addFields({
                            name: 'Deadlocked Cases',
                            value: cases.map(c => `Case \`#${c.caseId}\` — Target: <@${c.targetId}>`).join('\n').slice(0, 1024)
                        })
                        .setTimestamp();

                    await channel.send({ content: pingText, embeds: [embed] });

                    // Mark pinged to prevent spam on the next run
                    const caseIds = cases.map(c => c._id);
                    await CaseRepository.markDeadlockPinged(guildId, caseIds);

                    client.logger.info(`[DeadlockJob] Sent deadlock alert for ${cases.length} cases in guild ${guildId}.`);
                } catch (err) {
                    client.logger.error(`[DeadlockJob] Failed to send alert in guild ${guildId}: ${err.message}`);
                }
            }
        }
    }
});

/**
 * @fileoverview EmbedBuilder Helper
 * Pre-styled embed builder for consistent branding across all bots.
 * Extend or customize per-bot by overriding defaults.
 */

const { EmbedBuilder } = require('discord.js');

/**
 * Brand colors palette — customize per bot.
 */
const Colors = {
    PRIMARY:  0x5865F2,  // Discord blurple
    SUCCESS:  0x57F287,  // Green
    WARNING:  0xFEE75C,  // Yellow
    ERROR:    0xED4245,  // Red
    INFO:     0x5DADE2,  // Light blue
    NEUTRAL:  0x2F3136   // Dark grey
};

/**
 * Create a pre-styled embed.
 * @param {'primary'|'success'|'warning'|'error'|'info'|'neutral'} [type='primary']
 * @param {import('discord.js').User|import('discord.js').GuildMember} [requestedBy]
 * @returns {EmbedBuilder}
 */
function createEmbed(type = 'primary', requestedBy = null) {
    const color = Colors[type.toUpperCase()] ?? Colors.PRIMARY;
    const embed = new EmbedBuilder()
        .setColor(color)
        .setTimestamp();

    if (requestedBy) {
        const user = requestedBy.user ?? requestedBy;
        embed.setFooter({
            text: `Requested by ${user.displayName}`,
            iconURL: user.displayAvatarURL({ size: 64 })
        });
    }

    return embed;
}

/**
 * Create a quick success embed.
 * @param {string} description
 * @param {import('discord.js').User} [requestedBy]
 */
function successEmbed(description, requestedBy = null) {
    return createEmbed('success', requestedBy).setDescription(`✅ ${description}`);
}

/**
 * Create a quick error embed.
 * @param {string} description
 */
function errorEmbed(description) {
    return createEmbed('error').setDescription(`❌ ${description}`);
}

/**
 * Create a quick warning embed.
 * @param {string} description
 */
function warningEmbed(description) {
    return createEmbed('warning').setDescription(`⚠️ ${description}`);
}

/**
 * Create a quick info embed.
 * @param {string} description
 */
function infoEmbed(description) {
    return createEmbed('info').setDescription(`ℹ️ ${description}`);
}

module.exports = {
    Colors,
    createEmbed,
    successEmbed,
    errorEmbed,
    warningEmbed,
    infoEmbed
};

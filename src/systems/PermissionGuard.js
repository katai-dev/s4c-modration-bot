/**
 * @fileoverview PermissionGuard
 * Centralized permission checks for commands and components.
 * Decoupled from the interaction handler for testability and reuse.
 */

const { PermissionsBitField } = require('discord.js');

class PermissionGuard {
    /**
     * @param {import('../client/GalaxyClient')} client
     */
    constructor(client) {
        this.client = client;
        this.config = client.config;
    }

    /**
     * Run all guards against the given interaction and command definition.
     *
     * @param {import('discord.js').Interaction} interaction
     * @param {object} command  Any structure with guard fields (devOnly, ownerOnly, etc.)
     * @returns {{ passed: boolean, reason?: string, message?: string }}
     */
    check(interaction, command) {
        const { users, messages } = this.config;

        const getMsg = (key) => (interaction._t && interaction._t(key)) || messages[key];

        // ── Guild-Only ────────────────────────────────────────────────────────
        if (command.guildOnly !== false && !interaction.guild) {
            return { passed: false, reason: 'NOT_IN_GUILD', message: getMsg('NOT_IN_GUILD') };
        }

        // ── Owner-Only ────────────────────────────────────────────────────────
        if (command.ownerOnly === true) {
            if (interaction.user?.id !== users.ownerId && interaction.author?.id !== users.ownerId) {
                return { passed: false, reason: 'NOT_BOT_OWNER', message: getMsg('NOT_BOT_OWNER') };
            }
        }

        // ── Dev-Only ──────────────────────────────────────────────────────────
        if (command.devOnly === true) {
            const userId = interaction.user?.id || interaction.author?.id;
            const devs = Array.isArray(users.developers) ? users.developers : [];
            if (!devs.includes(userId)) {
                return { passed: false, reason: 'NOT_BOT_DEVELOPER', message: getMsg('NOT_BOT_DEVELOPER') };
            }
        }

        // ── Guild Owner Only ──────────────────────────────────────────────────
        if (command.guildOwnerOnly === true && interaction.guild) {
            const userId = interaction.user?.id || interaction.author?.id;
            if (userId !== interaction.guild.ownerId) {
                return { passed: false, reason: 'NOT_GUILD_OWNER', message: getMsg('NOT_GUILD_OWNER') };
            }
        }

        // ── NSFW Channel Guard ────────────────────────────────────────────────
        if (command.nsfw === true && interaction.channel) {
            if (!interaction.channel.nsfw) {
                return { passed: false, reason: 'CHANNEL_NOT_NSFW', message: getMsg('NSFW_ONLY') || '❌ This command can only be used in NSFW channels.' };
            }
        }

        // ── Discord Member Permissions ────────────────────────────────────────
        if (Array.isArray(command.permissions) && command.permissions.length > 0 && interaction.guild) {
            const member = interaction.member;
            if (!member) {
                return { passed: false, reason: 'NO_MEMBER', message: getMsg('MISSING_PERMISSIONS') };
            }

            try {
                const resolved = PermissionsBitField.resolve(command.permissions);
                const missing  = member.permissions?.missing(resolved);
                if (missing?.length > 0) {
                    return {
                        passed: false,
                        reason: 'MISSING_PERMISSIONS',
                        message: getMsg('MISSING_PERMISSIONS'),
                        missing
                    };
                }
            } catch {
                return { passed: false, reason: 'INVALID_PERMISSIONS', message: getMsg('MISSING_PERMISSIONS') };
            }
        }

        return { passed: true };
    }

    /**
     * Check if the bot itself has the required permissions in the current channel.
     *
     * @param {import('discord.js').Interaction} interaction
     * @param {import('discord.js').PermissionResolvable[]} permissions
     * @returns {{ passed: boolean, missing?: string[] }}
     */
    checkBot(interaction, permissions) {
        if (!interaction.guild || !permissions?.length) return { passed: true };

        const botMember = interaction.guild.members.me;
        if (!botMember) return { passed: true };

        const missing = botMember.permissionsIn(interaction.channel).missing(permissions);
        if (missing.length > 0) {
            return { passed: false, missing };
        }

        return { passed: true };
    }

    /**
     * Convenience: check if a user is the bot owner.
     * @param {string} userId
     * @returns {boolean}
     */
    isOwner(userId) {
        return userId === this.config.users.ownerId;
    }

    /**
     * Convenience: check if a user is a bot developer.
     * @param {string} userId
     * @returns {boolean}
     */
    isDeveloper(userId) {
        const devs = Array.isArray(this.config.users.developers) ? this.config.users.developers : [];
        return devs.includes(userId);
    }
}

module.exports = PermissionGuard;

/**
 * @fileoverview InteractionHandler
 * The unified interaction dispatcher. Listens to interactionCreate and routes
 * every interaction to the correct handler with full middleware support:
 *  - Permission checking
 *  - Cooldown enforcement
 *  - Author-only component guard
 *  - Error recovery with user feedback
 *  - Deferred reply timeout protection
 */

const { MessageFlags, PermissionsBitField, ChannelType } = require('discord.js');
const { matchesCustomId } = require('../../utils/Validator');

class InteractionHandler {
    /**
     * @param {import('../GalaxyClient')} client
     */
    constructor(client) {
        this.client = client;
        this.logger = client.logger;
        this._register();
    }

    /**
     * Register the single interactionCreate listener.
     * @private
     */
    _register() {
        this.client.on('interactionCreate', async (interaction) => {
            try {
                // ── Autocomplete ──────────────────────────────────────────────
                if (interaction.isAutocomplete()) {
                    return await this._handleAutocomplete(interaction);
                }

                // ── Slash Commands ────────────────────────────────────────────
                if (interaction.isChatInputCommand()) {
                    return await this._handleSlash(interaction);
                }

                // ── Context Menus ─────────────────────────────────────────────
                if (interaction.isContextMenuCommand()) {
                    return await this._handleContext(interaction);
                }

                // ── Buttons ───────────────────────────────────────────────────
                if (interaction.isButton()) {
                    return await this._handleComponent(interaction, this.client.components.buttons);
                }

                // ── Select Menus ──────────────────────────────────────────────
                if (interaction.isAnySelectMenu()) {
                    return await this._handleComponent(interaction, this.client.components.selects);
                }

                // ── Modals ────────────────────────────────────────────────────
                if (interaction.isModalSubmit()) {
                    return await this._handleComponent(interaction, this.client.components.modals);
                }
            } catch (err) {
                this.logger.error(`Unhandled interaction error: ${err.message}`);
                this.logger.error(err.stack);
            }
        });
    }

    // ── HANDLERS ───────────────────────────────────────────────────────────────

    /**
     * Handle autocomplete interactions — no guards needed.
     * @private
     */
    async _handleAutocomplete(interaction) {
        const component = this.client.components.autocomplete.get(interaction.commandName);
        if (!component) return;

        try {
            await component.run(this.client, interaction);
        } catch (err) {
            this.logger.error(`Autocomplete error for "${interaction.commandName}": ${err.message}`);
            // Respond with empty array to prevent Discord "thinking" state
            await interaction.respond([]).catch(() => {});
        }
    }

    /**
     * Handle slash command interactions.
     * @private
     */
    async _handleSlash(interaction) {
        if (!this.client.config.commands.slash.enabled) return;

        const command = this.client.commands.slash.get(interaction.commandName);
        if (!command) return;

        // ── Guards ────────────────────────────────────────────────────────────
        const guardResult = await this._runGuards(interaction, command);
        if (!guardResult) return;

        // ── Execute ───────────────────────────────────────────────────────────
        await this._execute(command, this.client, interaction);
    }

    /**
     * Handle context menu interactions.
     * @private
     */
    async _handleContext(interaction) {
        if (!this.client.config.commands.contextMenus.enabled) return;

        const command = this.client.commands.context.get(interaction.commandName);
        if (!command) return;

        const guardResult = await this._runGuards(interaction, command);
        if (!guardResult) return;

        await this._execute(command, this.client, interaction);
    }

    /**
     * Handle component interactions (buttons, selects, modals).
     * @param {import('discord.js').Interaction} interaction
     * @param {import('discord.js').Collection} collection
     * @private
     */
    async _handleComponent(interaction, collection) {
        // Find component by exact ID or RegExp pattern
        let component = null;

        for (const [key, value] of collection) {
            if (matchesCustomId(value.customId, interaction.customId)) {
                component = value;
                break;
            }
        }

        if (!component) return;

        // ── Author-Only Guard ──────────────────────────────────────────────────
        if (component.authorOnly) {
            const originalUserId =
                interaction.message?.interaction?.user?.id ||
                interaction.message?.interactionMetadata?.user?.id;

            if (originalUserId && interaction.user.id !== originalUserId) {
                return interaction.reply({
                    content: this.client.config.messages.COMPONENT_AUTHOR_ONLY,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }

        // ── Permission Guard ───────────────────────────────────────────────────
        if (component.permissions?.length > 0 && interaction.guild) {
            const missing = interaction.member?.permissions?.missing(
                PermissionsBitField.resolve(component.permissions)
            );
            if (missing?.length > 0) {
                return interaction.reply({
                    content: this.client.config.messages.MISSING_PERMISSIONS,
                    flags: MessageFlags.Ephemeral
                }).catch(() => {});
            }
        }

        // ── Execute ────────────────────────────────────────────────────────────
        await this._execute(component, this.client, interaction);
    }

    // ── MIDDLEWARE ──────────────────────────────────────────────────────────────

    /**
     * Run all guards for a command/context menu.
     * @returns {boolean} true = continue, false = blocked
     * @private
     */
    async _runGuards(interaction, command) {
        const config = this.client.config;

        // Resolve locale early for guard messages
        const locale = await this.client._resolveLocale(interaction);
        const getMsg = (key) => this.client.systems.locale.get(key, locale) || config.messages[key];

        // ── Guild-Only ──────────────────────────────────────────────────────
        if (command.guildOnly && !interaction.guild) {
            await this._reply(interaction, getMsg('NOT_IN_GUILD'));
            return false;
        }

        // ── Owner-Only ──────────────────────────────────────────────────────
        if (command.ownerOnly && interaction.user.id !== config.users.ownerId) {
            await this._reply(interaction, getMsg('NOT_BOT_OWNER'));
            return false;
        }

        // ── Dev-Only ────────────────────────────────────────────────────────
        if (command.devOnly && !config.users.developers.includes(interaction.user.id)) {
            await this._reply(interaction, getMsg('NOT_BOT_DEVELOPER'));
            return false;
        }

        // ── Guild Owner Only ────────────────────────────────────────────────
        if (command.guildOwnerOnly && interaction.guild && interaction.user.id !== interaction.guild.ownerId) {
            await this._reply(interaction, getMsg('NOT_GUILD_OWNER'));
            return false;
        }

        // ── Discord Permissions ─────────────────────────────────────────────
        if (command.permissions?.length > 0 && interaction.guild) {
            const missing = interaction.member?.permissions?.missing(
                PermissionsBitField.resolve(command.permissions)
            );
            if (missing?.length > 0) {
                await this._reply(interaction, getMsg('MISSING_PERMISSIONS'));
                return false;
            }
        }

        // ── Cooldowns ───────────────────────────────────────────────────────
        if (this.client.systems.cooldowns) {
            const cooldownResult = this.client.systems.cooldowns.check(interaction, command);
            if (!cooldownResult.allowed) {
                const msg = this.client.systems.locale.get('COOLDOWN', locale, { time: cooldownResult.remaining })
                            || config.messages.COOLDOWN.replace('{time}', cooldownResult.remaining);
                await this._reply(interaction, msg);
                return false;
            }
            // Start the cooldown after guard passes
            this.client.systems.cooldowns.set(interaction, command);
        }

        return true;
    }

    /**
     * Execute a command/component run function with error handling.
     * @private
     */
    async _execute(handler, client, interaction) {
        try {
            // Inject locale data into the interaction object
            interaction.locale = await client._resolveLocale(interaction);
            interaction._t = (key, vars = {}) => client.systems.locale.get(key, interaction.locale, vars);

            await handler.run(client, interaction);
        } catch (err) {
            this.logger.error(`Execution error: ${err.message}`);
            this.logger.error(err.stack);

            const errorMsg = client.config.messages.COMMAND_ERROR;

            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: errorMsg });
                } else {
                    await interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
                }
            } catch {
                // If we can't reply (interaction expired), just log it
            }
        }
    }

    /**
     * Safe ephemeral reply helper.
     * @private
     */
    async _reply(interaction, content) {
        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content });
            } else {
                await interaction.reply({ content, flags: MessageFlags.Ephemeral });
            }
        } catch {
            // Interaction expired or already responded — ignore
        }
    }
}

module.exports = InteractionHandler;

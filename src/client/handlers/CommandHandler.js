/**
 * @fileoverview CommandHandler
 * Recursively loads slash commands, message commands, and context menus
 * from their respective directories. Handles registration of application
 * commands to Discord's API.
 */

const { REST, Routes, Collection } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { validate } = require('../../utils/Validator');

class CommandHandler {
    /**
     * @param {import('../GalaxyClient')} client
     */
    constructor(client) {
        this.client = client;
        this.logger = client.logger;
    }

    /**
     * Recursively read all .js files from a directory.
     * @param {string} dir
     * @returns {string[]} Absolute file paths
     * @private
     */
    _readFiles(dir) {
        if (!fs.existsSync(dir)) return [];
        const results = [];

        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...this._readFiles(fullPath));
            } else if (entry.name.endsWith('.js') && !entry.name.startsWith('_')) { // Ignore non-js files and those starting with '_'
                results.push(fullPath);
            }
        }

        return results;
    }

    /**
     * Load all commands from the commands directories.
     */
    load() {
        const base = path.join(__dirname, '../../commands');
        this.client.restCommandsBody = [];

        // ── Slash Commands ──────────────────────────────────────────────────
        const slashDir = path.join(base, 'slash');
        let slashCount = 0;

        for (const file of this._readFiles(slashDir)) {
            try {
                // Clear require cache for hot-reload support
                delete require.cache[require.resolve(file)];
                const cmd = require(file);

                const { valid, reason } = validate(cmd, file);
                if (!valid) { this.logger.warn(reason); continue; }

                const name = typeof cmd.data?.name === 'string'
                    ? cmd.data.name
                    : (typeof cmd.data?.toJSON === 'function' ? cmd.data.toJSON().name : null);

                if (!name) { this.logger.warn(`Could not determine command name from: ${file}`); continue; }

                this.client.commands.slash.set(name, cmd);
                this.client.restCommandsBody.push(
                    typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data
                );

                this.logger.debug(`Loaded slash command: ${name}`);
                slashCount++;
            } catch (err) {
                this.logger.error(`Failed to load slash command from ${file}: ${err.message}`);
            }
        }

        // ── Message/Prefix Commands ─────────────────────────────────────────
        const prefixDir = path.join(base, 'prefix');
        let prefixCount = 0;

        if (this.client.config.commands.prefix.enabled) {
            for (const file of this._readFiles(prefixDir)) {
                try {
                    delete require.cache[require.resolve(file)];
                    const cmd = require(file);

                    const { valid, reason } = validate(cmd, file);
                    if (!valid) { this.logger.warn(reason); continue; }

                    this.client.commands.prefix.set(cmd.name, cmd);

                    if (Array.isArray(cmd.aliases)) {
                        for (const alias of cmd.aliases) {
                            this.client.commands.aliases.set(alias, cmd.name);
                        }
                    }

                    this.logger.debug(`Loaded prefix command: ${cmd.name}`);
                    prefixCount++;
                } catch (err) {
                    this.logger.error(`Failed to load prefix command from ${file}: ${err.message}`);
                }
            }
        }

        // ── Context Menu Commands ───────────────────────────────────────────
        const contextDir = path.join(base, 'context');
        let contextCount = 0;

        if (this.client.config.commands.contextMenus.enabled) {
            for (const file of this._readFiles(contextDir)) {
                try {
                    delete require.cache[require.resolve(file)];
                    const cmd = require(file);

                    const { valid, reason } = validate(cmd, file);
                    if (!valid) { this.logger.warn(reason); continue; }

                    const name = typeof cmd.data?.name === 'string'
                        ? cmd.data.name
                        : (typeof cmd.data?.toJSON === 'function' ? cmd.data.toJSON().name : null);

                    if (!name) { this.logger.warn(`Could not determine context menu name from: ${file}`); continue; }

                    this.client.commands.context.set(name, cmd);
                    this.client.restCommandsBody.push(
                        typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON() : cmd.data
                    );

                    this.logger.debug(`Loaded context menu: ${name}`);
                    contextCount++;
                } catch (err) {
                    this.logger.error(`Failed to load context menu from ${file}: ${err.message}`);
                }
            }
        }

        this.logger.success(
            `Commands loaded — Slash: ${slashCount} | Prefix: ${prefixCount} | Context: ${contextCount}`
        );
    }

    /**
     * Reload all commands (hot-reload support).
     */
    reload() {
        this.client.commands.slash.clear();
        this.client.commands.prefix.clear();
        this.client.commands.aliases.clear();
        this.client.commands.context.clear();
        this.client.restCommandsBody = [];
        this.load();
    }

    /**
     * Register application commands to Discord API.
     * @param {{ enabled: boolean, guildId: string }} devConfig
     */
    async register(devConfig) {
        const rest = new REST({ version: '10' }).setToken(this.client.token);
        
        // Remove duplicate commands by name
        const uniqueCommands = new Map();
        for (const cmd of this.client.restCommandsBody) {
            uniqueCommands.set(cmd.name, cmd);
        }
        const body = Array.from(uniqueCommands.values());

        if (devConfig.enabled && devConfig.guildId) {
            await rest.put(
                Routes.applicationGuildCommands(this.client.user.id, devConfig.guildId),
                { body }
            );
            this.logger.success(`Registered ${body.length} commands to guild: ${devConfig.guildId}`);
        } else {
            await rest.put(
                Routes.applicationCommands(this.client.user.id),
                { body }
            );
            this.logger.success(`Registered ${body.length} commands globally.`);
        }
    }
}

module.exports = CommandHandler;

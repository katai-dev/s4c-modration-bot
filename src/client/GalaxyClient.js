/**
 * @fileoverview GalaxyClient
 * The core Discord bot client extended from discord.js Client.
 * Initializes all handlers, systems, and collections in one place.
 * Every bot in the Galaxy ecosystem uses this as its base.
 */

const {
    Client,
    Collection,
    GatewayIntentBits,
    Partials
} = require('discord.js');

const path = require('path');
const fs = require('fs');

const Logger = require('../utils/Logger');
const Database = require('./Database');
const CommandHandler = require('./handlers/CommandHandler');
const ComponentHandler = require('./handlers/ComponentHandler');
const EventHandler = require('./handlers/EventHandler');
const InteractionHandler = require('./handlers/InteractionHandler');
const CooldownManager = require('../systems/CooldownManager');
const PermissionGuard = require('../systems/PermissionGuard');
const ErrorHandler = require('../systems/ErrorHandler');
const LocaleManager = require('../systems/LocaleManager');

class GalaxyClient extends Client {

    /**
     * @param {object} config  The loaded config object from src/config.js
     */
    constructor(config) {
        // Resolve intent flags from string names
        const intents = (config.bot?.intents || ['Guilds']).map(
            (name) => GatewayIntentBits[name]
        ).filter(Boolean);

        // Resolve partial flags from string names
        const partials = (config.bot?.partials || []).map(
            (name) => Partials[name]
        ).filter(Boolean);

        super({
            intents,
            partials,
            presence: config.bot?.presence ?? {}
        });

        // ── Config ─────────────────────────────────────────────────────────────
        /** @type {object} */
        this.config = config;

        // ── Logger ─────────────────────────────────────────────────────────────
        /** @type {Logger} */
        this.logger = new Logger({
            fileEnabled: config.systems?.logging?.file?.enabled ?? true,
            logDir: config.systems?.logging?.file?.dir ?? './logs',
            webhookUrl: config.systems?.logging?.webhook?.enabled
                ? config.systems?.logging?.webhook?.url
                : null
        });

        // ── Collections ────────────────────────────────────────────────────────
        /** Stores all loaded commands, organized by type */
        this.commands = {
            slash: new Collection(), // name → SlashCommand instance
            prefix: new Collection(), // name → MessageCommand instance
            aliases: new Collection(), // alias → command name
            context: new Collection()  // name → ContextMenu instance
        };

        /** In-memory cache to prevent spamming DB on every message/interaction */
        this.cache = {
            prefixes: new Collection(),
            locales: new Collection()
        };

        /** Stores all loaded components, organized by type */
        this.components = {
            buttons: new Collection(), // customId → Button instance
            selects: new Collection(), // customId → SelectMenu instance
            modals: new Collection(), // customId → Modal instance
            autocomplete: new Collection()  // commandName → Autocomplete instance
        };

        /** REST body array for application command registration */
        this.restCommandsBody = [];

        /** Timestamp of when login was initiated (used for startup logging) */
        this.loginTimestamp = 0;

        /** Number of login attempts (for retry logic) */
        this.loginAttempts = 0;

        // ── Database ───────────────────────────────────────────────────────────
        /**
         * MongoDB database manager. Available as `client.db` anywhere.
         * @type {Database}
         */
        this.db = new Database(this);

        // ── Systems ────────────────────────────────────────────────────────────
        this.systems = {
            /** @type {CooldownManager} */
            cooldowns: new CooldownManager(),
            /** @type {PermissionGuard} */
            permissions: new PermissionGuard(this),
            /** @type {ErrorHandler} */
            errors: new ErrorHandler(this),
            /** @type {LocaleManager} */
            locale: new LocaleManager({
                default: config.systems?.locale?.default ?? 'en',
                fallback: config.systems?.locale?.fallback ?? 'en'
            })
        };

        // ── Handlers ───────────────────────────────────────────────────────────
        this._commandHandler = new CommandHandler(this);
        this._componentHandler = new ComponentHandler(this);
        this._eventHandler = new EventHandler(this);

        // InteractionHandler self-registers its listener in constructor
        this._interactionHandler = new InteractionHandler(this);

        // Register prefix (message) command listener
        this._registerPrefixListener();
    }

    /**
     * Register the messageCreate listener for prefix commands.
     * Only active if prefix commands are enabled in config.
     * @private
     */
    _registerPrefixListener() {
        if (!this.config.commands?.prefix?.enabled) return;

        this.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            if (!message.guild) return; // DM guard (can be made configurable)

            // Support per-guild prefix via cache/DB
            const prefix = await this._resolvePrefix(message);

            // ── Bot Mention Fallback ──────────────────────────────────────────
            // If someone mentions the bot without any command, tell them the prefix.
            const mentionRegex = new RegExp(`^<@!?${this.user.id}>$`);
            if (message.content.match(mentionRegex)) {
                return message.reply({
                    content: `👋 My prefix here is \`${prefix}\`\nUse \`${prefix}help\` to see my commands!`
                }).catch(() => { });
            }

            if (!message.content.startsWith(prefix)) return;

            const args = message.content.slice(prefix.length).trim().split(/\s+/g);
            const commandName = args.shift()?.toLowerCase();
            if (!commandName) return;

            // Resolve command or alias
            const command = this.commands.prefix.get(commandName)
                ?? this.commands.prefix.get(this.commands.aliases.get(commandName));

            if (!command) return;

            try {
                // Inject locale data into the message object
                message.locale = await this._resolveLocale(message);
                message._t = (key, vars = {}) => this.systems.locale.get(key, message.locale, vars);

                const getMsg = (key) => message._t(key) || this.config.messages[key];

                // ── Permission Guard ──────────────────────────────────────────
                const guard = this.systems.permissions.check(message, command);
                if (!guard.passed) {
                    return message.reply({ content: guard.message }).catch(() => { });
                }

                // ── Cooldowns ─────────────────────────────────────────────────
                const cooldown = this.systems.cooldowns.check(message, command, this);
                if (!cooldown.allowed) {
                    const msg = this.systems.locale.get('COOLDOWN', message.locale, { time: cooldown.remaining })
                        || this.config.messages.COOLDOWN.replace('{time}', cooldown.remaining);
                    return message.reply({ content: msg }).catch(() => { });
                }
                this.systems.cooldowns.set(message, command, this);

                // ── Execute ───────────────────────────────────────────────────
                await command.run(this, message, args);
            } catch (err) {
                this.logger.error(`Prefix command error "${commandName}": ${err.message}`);
                this.logger.error(err.stack);
                message.reply({ content: message._t ? message._t('COMMAND_ERROR') : this.config.messages.COMMAND_ERROR }).catch(() => { });
            }
        });
    }

    /**
     * Automatically require all model files from src/models/.
     * This registers all Mongoose schemas before any queries run.
     * @private
     */
    _loadModels() {
        const modelsDir = path.join(__dirname, '../models');
        if (!fs.existsSync(modelsDir)) return;

        let count = 0;
        for (const file of fs.readdirSync(modelsDir)) {
            if (!file.endsWith('.js')) continue;
            try {
                require(path.join(modelsDir, file));
                count++;
            } catch (err) {
                this.logger.error(`Failed to load model "${file}": ${err.message}`);
            }
        }

        if (count > 0) this.logger.debug(`Loaded ${count} database model(s).`);
    }

    /**
     * Resolve the prefix for the current message.
     * Checks the memory cache first, then the database, then falls back to config.
     *
     * @param {import('discord.js').Message} message
     * @returns {Promise<string>|string}
     */
    async _resolvePrefix(message) {
        if (!message.guild) return this.config.commands.prefix.symbol ?? '?';

        // 1. Check in-memory cache
        if (this.cache.prefixes.has(message.guild.id)) {
            return this.cache.prefixes.get(message.guild.id);
        }

        // 2. Check Database
        if (this.db.isConnected) {
            try {
                const GuildSettings = this.db.model('GuildSettings');
                const settings = await GuildSettings.findOne(
                    { guildId: message.guild.id },
                    { prefix: 1 }
                ).lean();

                if (settings?.prefix) {
                    this.cache.prefixes.set(message.guild.id, settings.prefix);
                    return settings.prefix;
                }
            } catch {
                // Fall back silently
            }
        }

        // 3. Fallback to Config
        const defaultPrefix = this.config.commands.prefix.symbol ?? '?';
        this.cache.prefixes.set(message.guild.id, defaultPrefix);
        return defaultPrefix;
    }

    /**
     * Resolve the preferred locale for the current interaction/message.
     * Checks memory cache first, then database, then falls back to config.
     *
     * @param {import('discord.js').Interaction|import('discord.js').Message} context
     * @returns {Promise<string>|string}
     */
    async _resolveLocale(context) {
        if (!context.guild) return this.config.systems?.locale?.default ?? 'en';

        // 1. Check in-memory cache
        if (this.cache.locales.has(context.guild.id)) {
            return this.cache.locales.get(context.guild.id);
        }

        // 2. Check Database
        if (this.db.isConnected) {
            try {
                const GuildSettings = this.db.model('GuildSettings');
                const settings = await GuildSettings.findOne(
                    { guildId: context.guild.id },
                    { locale: 1 }
                ).lean();

                if (settings?.locale) {
                    this.cache.locales.set(context.guild.id, settings.locale);
                    return settings.locale;
                }
            } catch {
                // Fall back silently
            }
        }

        // 3. Fallback to Config
        const defaultLocale = this.config.systems?.locale?.default ?? 'en';
        this.cache.locales.set(context.guild.id, defaultLocale);
        return defaultLocale;
    }

    /**
     * Connect to Discord and load all handlers.
     * Includes exponential backoff retry on failure.
     */
    async connect() {
        this.loginTimestamp = Date.now();
        this.logger.warn(`Connecting to Discord... (attempt ${this.loginAttempts + 1})`);

        // ── Connect to MongoDB (if URI is provided) ────────────────────────────
        const mongoUri = process.env.MONGODB_URI;
        if (mongoUri) {
            this._loadModels(); // Register all schemas before connecting
            await this.db.connect(mongoUri);
        } else {
            this.logger.warn('MONGODB_URI not set — running without database.');
        }

        try {
            await this.login(process.env.CLIENT_TOKEN);

            // Load all handlers after successful login
            this._commandHandler.load();
            this._componentHandler.load();
            this._eventHandler.load();

            // Register application commands
            this.logger.warn('Registering application commands...');
            await this._commandHandler.register(this.config.development);

        } catch (err) {
            this.loginAttempts++;
            const delay = Math.min(5000 * this.loginAttempts, 30000); // exponential, max 30s
            this.logger.error(`Failed to connect: ${err.message}. Retrying in ${delay / 1000}s...`);
            setTimeout(() => this.connect(), delay);
        }
    }

    /**
     * Graceful shutdown — disconnect DB and destroy Discord client.
     * Called automatically by ErrorHandler on SIGINT/SIGTERM.
     */
    async shutdown() {
        this.logger.warn('Shutting down gracefully...');
        await this.db.disconnect();
        this.logger.destroy();
        this.destroy();
    }

    /**
     * Reload all commands and components without restarting the bot.
     */
    async reload() {
        this.logger.warn('Reloading commands and components...');
        this._commandHandler.reload();
        this._componentHandler.reload();
        await this._commandHandler.register(this.config.development);
        this.logger.success('Reload complete.');
    }
}

module.exports = GalaxyClient;

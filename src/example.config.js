/**
 * @fileoverview Galaxy Handler — Configuration Template
 * Copy this file to `src/config.js` and fill in your values.
 * `src/config.js` is gitignored for security.
 */

const config = {

    // ─── Bot Settings ─────────────────────────────────────────────────────────
    bot: {
        /**
         * Discord.js GatewayIntentBits names.
         * Only enable what your bot actually needs.
         * @see https://discord.com/developers/docs/topics/gateway#gateway-intents
         */
        intents: [
            'Guilds',
            'GuildMembers',
            'GuildMessages',
            'GuildMessageReactions',
            'MessageContent',
            'DirectMessages'
        ],

        /**
         * Discord.js Partials names.
         */
        partials: [
            'Channel',
            'GuildMember',
            'Message',
            'Reaction',
            'User'
        ],

        /**
         * Bot presence shown in Discord.
         * Types: 0=Playing, 1=Streaming, 2=Listening, 3=Watching, 4=Custom, 5=Competing
         */
        presence: {
            status: 'online', // online | idle | dnd | invisible
            activities: [
                { name: 'Galaxy Handler v1', type: 4 }
            ]
        }
    },

    // ─── Development Settings ──────────────────────────────────────────────────
    development: {
        /**
         * If true, slash commands register to a specific guild (instant).
         * If false, registers globally (takes up to 1 hour).
         */
        enabled: true,
        guildId: process.env.DEV_GUILD_ID || ''
    },

    // ─── Command Settings ──────────────────────────────────────────────────────
    commands: {
        prefix: {
            /** Enable or disable message/prefix commands entirely */
            enabled: true,
            /** Default prefix symbol. Can be overridden per-guild via database. */
            symbol: '?'
        },
        slash: {
            /** Enable or disable slash command handling */
            enabled: true
        },
        contextMenus: {
            /** Enable or disable context menu handling (user + message) */
            enabled: true
        }
    },

    // ─── System Settings ──────────────────────────────────────────────────────
    systems: {
        cooldowns: {
            /**
             * Default cooldown in SECONDS if a command doesn't specify one.
             * Set to 0 to disable default cooldowns.
             */
            defaultSeconds: 3,

            /**
             * Cooldown scope:
             *  'user'    - Each user has their own cooldown (default)
             *  'guild'   - Cooldown is shared per guild
             *  'channel' - Cooldown is shared per channel
             */
            defaultScope: 'user'
        },

        locale: {
            /**
             * Default locale to use for messages.
             * Must match a file in src/locales/<locale>.json
             */
            default: 'en',
            /** Fallback if the requested locale doesn't have the key */
            fallback: 'en'
        },

        logging: {
            file: {
                /** Enable writing logs to files in the logDir directory */
                enabled: true,
                /** Directory where log files will be written */
                dir: './logs'
            },
            webhook: {
                /** Enable sending error/warn logs to a Discord webhook */
                enabled: false,
                /** Discord webhook URL */
                url: process.env.LOG_WEBHOOK_URL || ''
            }
        }
    },

    // ─── Users ────────────────────────────────────────────────────────────────
    users: {
        /** The Discord ID of the bot owner */
        ownerId: process.env.OWNER_ID || '',

        /** Array of Discord IDs of bot developers/staff */
        developers: (process.env.DEV_IDS || '').split(',').filter(Boolean)
    },

    // ─── System Messages ──────────────────────────────────────────────────────
    // These are fallback messages. Prefer using locales for multi-lang support.
    messages: {
        NOT_BOT_OWNER:       '❌ This command can only be used by the bot owner.',
        NOT_BOT_DEVELOPER:   '❌ This command can only be used by bot developers.',
        NOT_GUILD_OWNER:     '❌ This command can only be used by the server owner.',
        MISSING_PERMISSIONS: '❌ You do not have the required permissions to use this command.',
        COMPONENT_AUTHOR_ONLY: '❌ This interaction is not for you.',
        COOLDOWN:            '⏳ Please wait **{time}s** before using this command again.',
        COMMAND_ERROR:       '⚠️ An unexpected error occurred while running this command.',
        NOT_IN_GUILD:        '❌ This command can only be used in a server.'
    }
};

module.exports = config;
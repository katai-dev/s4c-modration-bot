/**
 * @fileoverview ErrorHandler
 * Global error handler for the bot process.
 * Catches unhandledRejection, uncaughtException, and SIGINT/SIGTERM.
 * Provides a structured way to handle Discord API errors gracefully.
 */

const { DiscordAPIError, RESTJSONErrorCodes } = require('discord.js');

/** Discord API error codes we can safely ignore (user-facing, not bugs) */
const IGNORABLE_CODES = new Set([
    RESTJSONErrorCodes.UnknownMessage,
    RESTJSONErrorCodes.UnknownChannel,
    RESTJSONErrorCodes.UnknownGuild,
    RESTJSONErrorCodes.UnknownInteraction,
    RESTJSONErrorCodes.CannotSendMessagesToThisUser,
    RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged
]);

class ErrorHandler {
    /**
     * @param {import('../client/GalaxyClient')} client
     */
    constructor(client) {
        this.client = client;
        this.logger = client.logger;
    }

    /**
     * Register global process error listeners.
     * Call this once from index.js.
     */
    register() {
        process.on('unhandledRejection', (reason) => {
            if (reason instanceof DiscordAPIError && IGNORABLE_CODES.has(reason.code)) {
                this.logger.debug(`Ignored Discord API error [${reason.code}]: ${reason.message}`);
                return;
            }
            this.logger.error(`Unhandled Rejection: ${reason}`);
            if (reason?.stack) this.logger.error(reason.stack);
        });

        process.on('uncaughtException', (err) => {
            this.logger.error(`Uncaught Exception: ${err.message}`);
            this.logger.error(err.stack);
            // Give logger time to flush before exiting
            setTimeout(() => process.exit(1), 500);
        });

        process.on('SIGINT', async () => {
            this.logger.warn('SIGINT received — shutting down gracefully...');
            await this.client.shutdown();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            this.logger.warn('SIGTERM received — shutting down gracefully...');
            await this.client.shutdown();
            process.exit(0);
        });
    }

    /**
     * Determine if a Discord API error should be ignored.
     * @param {Error} err
     * @returns {boolean}
     */
    isIgnorable(err) {
        return err instanceof DiscordAPIError && IGNORABLE_CODES.has(err.code);
    }

    /**
     * Safe wrapper around any async function.
     * Logs errors without crashing.
     *
     * @template T
     * @param {() => Promise<T>} fn
     * @param {string} [context]  Context label for logging.
     * @returns {Promise<T|null>}
     */
    async wrap(fn, context = 'unknown') {
        try {
            return await fn();
        } catch (err) {
            if (!this.isIgnorable(err)) {
                this.logger.error(`[${context}] ${err.message}`);
                if (err.stack) this.logger.error(err.stack);
            }
            return null;
        }
    }
}

module.exports = ErrorHandler;

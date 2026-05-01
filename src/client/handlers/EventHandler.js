/**
 * @fileoverview EventHandler
 * Recursively loads all event files from the events directory
 * and registers them on the Discord client.
 */

const path = require('path');
const fs   = require('fs');
const { validate } = require('../../utils/Validator');

class EventHandler {
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
     * @returns {string[]}
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
     * Load and register all events.
     */
    load() {
        const eventsDir = path.join(__dirname, '../../events');
        let count = 0;

        for (const file of this._readFiles(eventsDir)) {
            try {
                delete require.cache[require.resolve(file)];
                const event = require(file);

                const { valid, reason } = validate(event, file);
                if (!valid) { this.logger.warn(reason); continue; }

                // Wrap run in error boundary so one bad event never crashes the bot
                const safeRun = async (...args) => {
                    try {
                        await event.run(this.client, ...args);
                    } catch (err) {
                        this.logger.error(`Error in event "${event.name}": ${err.message}`);
                        this.logger.error(err.stack);
                    }
                };

                if (event.once) {
                    this.client.once(event.name, safeRun);
                } else {
                    this.client.on(event.name, safeRun);
                }

                this.logger.debug(`Loaded event: ${event.name} (once: ${event.once})`);
                count++;
            } catch (err) {
                this.logger.error(`Failed to load event from ${file}: ${err.message}`);
            }
        }

        this.logger.success(`Events loaded — Total: ${count}`);
    }
}

module.exports = EventHandler;

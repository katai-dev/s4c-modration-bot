const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

/**
 * @class Logger
 * @description Async, non-blocking logger with console, file, and webhook support.
 *              Replaces the old synchronous Console.js utility.
 */
class Logger {
    /** @type {string} */
    #logDir;
    /** @type {string} */
    #logFile;
    /** @type {string|null} */
    #webhookUrl;
    /** @type {boolean} */
    #fileEnabled;
    /** @type {fs.WriteStream|null} */
    #writeStream;

    /**
     * @param {object} [options]
     * @param {boolean} [options.fileEnabled=true]
     * @param {string}  [options.logDir='./logs']
     * @param {string|null} [options.webhookUrl=null]
     */
    constructor(options = {}) {
        this.#fileEnabled = options.fileEnabled ?? true;
        this.#logDir = options.logDir || './logs';
        this.#webhookUrl = options.webhookUrl || null;
        this.#writeStream = null;

        if (this.#fileEnabled) {
            this._initFileStream();
        }
    }

    /**
     * Initialize the file write stream for async logging.
     * @private
     */
    _initFileStream() {
        try {
            if (!fs.existsSync(this.#logDir)) {
                fs.mkdirSync(this.#logDir, { recursive: true });
            }

            // Clean old logs before starting new stream
            this._cleanOldLogs();

            const date = new Date().toISOString().split('T')[0];
            this.#logFile = path.join(this.#logDir, `${date}.log`);
            this.#writeStream = fs.createWriteStream(this.#logFile, { flags: 'a' });
        } catch (err) {
            console.error('Failed to initialize log file stream:', err.message);
            this.#fileEnabled = false;
        }
    }

    /**
     * Deletes log files older than 7 days to save space.
     * @private
     */
    _cleanOldLogs() {
        if (!fs.existsSync(this.#logDir)) return;

        const files = fs.readdirSync(this.#logDir);
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

        for (const file of files) {
            if (!file.endsWith('.log')) continue;
            
            const filePath = path.join(this.#logDir, file);
            const stats = fs.statSync(filePath);
            
            if (now - stats.mtimeMs > maxAge) {
                try {
                    fs.unlinkSync(filePath);
                    // Use console.log directly since writeStream might not be ready
                    console.log(chalk.gray(`[System] Deleted old log file: ${file}`));
                } catch (err) {
                    // Silently fail if file is locked
                }
            }
        }
    }

    /**
     * Get formatted timestamp.
     * @returns {string}
     * @private
     */
    _timestamp() {
        return new Date().toLocaleTimeString('en-US', { hour12: false });
    }

    /**
     * Get ISO timestamp for file logging.
     * @returns {string}
     * @private
     */
    _isoTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Write to log file asynchronously.
     * @param {string} level
     * @param {string} message
     * @private
     */
    _writeToFile(level, message) {
        if (!this.#fileEnabled || !this.#writeStream) return;

        const line = `[${this._isoTimestamp()}] [${level.toUpperCase()}] ${message}\n`;
        this.#writeStream.write(line);
    }

    /**
     * Send log to Discord webhook (fire-and-forget).
     * @param {string} level
     * @param {string} message
     * @private
     */
    async _sendWebhook(level, message) {
        if (!this.#webhookUrl) return;

        const colors = { debug: 0x808080, info: 0x3498db, success: 0x2ecc71, warn: 0xf39c12, error: 0xe74c3c };

        try {
            await fetch(this.#webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: `📋 ${level.toUpperCase()}`,
                        description: `\`\`\`\n${message.substring(0, 4000)}\n\`\`\``,
                        color: colors[level] || 0xffffff,
                        timestamp: new Date().toISOString()
                    }]
                })
            });
        } catch {
            // Silently fail — don't log webhook errors to avoid loops
        }
    }

    /**
     * Core log method.
     * @param {'debug'|'info'|'success'|'warn'|'error'} level
     * @param {string[]} args
     * @private
     */
    _log(level, args) {
        const time = this._timestamp();
        const message = args.map(a => typeof a === 'string' ? a : String(a)).join(' ');

        const prefixes = {
            debug:   chalk.gray(`[${time}]`) + ' ' + chalk.magenta('[DEBUG]'),
            info:    chalk.gray(`[${time}]`) + ' ' + chalk.blue('[INFO]'),
            success: chalk.gray(`[${time}]`) + ' ' + chalk.green('[OK]'),
            warn:    chalk.gray(`[${time}]`) + ' ' + chalk.yellow('[WARN]'),
            error:   chalk.gray(`[${time}]`) + ' ' + chalk.red('[ERROR]')
        };

        console.log(prefixes[level], message);

        this._writeToFile(level, message);

        if (level === 'error' || level === 'warn') {
            this._sendWebhook(level, message);
        }
    }

    /** @param {...any} args */
    debug(...args) { this._log('debug', args); }

    /** @param {...any} args */
    info(...args) { this._log('info', args); }

    /** @param {...any} args */
    success(...args) { this._log('success', args); }

    /** @param {...any} args */
    warn(...args) { this._log('warn', args); }

    /** @param {...any} args */
    error(...args) { this._log('error', args); }

    /**
     * Close the file stream gracefully.
     */
    destroy() {
        if (this.#writeStream) {
            this.#writeStream.end();
            this.#writeStream = null;
        }
    }
}

module.exports = Logger;

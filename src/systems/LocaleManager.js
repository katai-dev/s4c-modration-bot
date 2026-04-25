/**
 * @fileoverview LocaleManager
 * Multi-language support system. Loads JSON locale files from src/locales/
 * and resolves translation strings with template variable replacement.
 *
 * @example
 * // In a command:
 * const msg = client.systems.locale.get('COOLDOWN', 'en', { time: 5 });
 * // Returns: "Please wait 5s before using this command again."
 */

const fs   = require('fs');
const path = require('path');

class LocaleManager {
    /**
     * @param {object} options
     * @param {string} [options.default='en']   Default locale key.
     * @param {string} [options.fallback='en']  Fallback locale if key not found.
     * @param {string} [options.dir]            Custom directory for locale files.
     */
    constructor(options = {}) {
        this._default  = options.default  || 'en';
        this._fallback = options.fallback || 'en';
        this._dir      = options.dir      || path.join(__dirname, '../locales');

        /** @type {Map<string, object>} locale key → translations object */
        this._locales = new Map();

        this._load();
    }

    /**
     * Load all JSON files from the locales directory.
     * @private
     */
    _load() {
        if (!fs.existsSync(this._dir)) {
            fs.mkdirSync(this._dir, { recursive: true });
            return;
        }

        for (const file of fs.readdirSync(this._dir)) {
            if (!file.endsWith('.json')) continue;

            const locale = file.replace('.json', '');
            try {
                const data = JSON.parse(fs.readFileSync(path.join(this._dir, file), 'utf-8'));
                this._locales.set(locale, data);
            } catch (err) {
                console.error(`[LocaleManager] Failed to load locale "${locale}": ${err.message}`);
            }
        }
    }

    /**
     * Get a translated string.
     *
     * @param {string} key         The translation key (e.g. 'COOLDOWN', 'NOT_BOT_OWNER').
     * @param {string} [locale]    The locale to use (defaults to configured default).
     * @param {object} [vars={}]   Variables to replace — {time: 5} replaces `{time}` in the string.
     * @returns {string}           The translated string, or the key itself if not found.
     */
    get(key, locale, vars = {}) {
        const langToTry = [
            locale        || this._default,
            this._default,
            this._fallback
        ];

        let result = null;

        for (const lang of langToTry) {
            const data = this._locales.get(lang);
            if (data && data[key] !== undefined) {
                result = data[key];
                break;
            }
        }

        if (result === null) return key;

        // Replace template variables: {varName}
        return result.replace(/\{(\w+)\}/g, (_, name) => {
            return vars[name] !== undefined ? String(vars[name]) : `{${name}}`;
        });
    }

    /**
     * Check if a locale is loaded.
     * @param {string} locale
     * @returns {boolean}
     */
    has(locale) {
        return this._locales.has(locale);
    }

    /**
     * Get all loaded locale keys.
     * @returns {string[]}
     */
    getAvailable() {
        return [...this._locales.keys()];
    }

    /**
     * Reload all locale files (hot-reload support).
     */
    reload() {
        this._locales.clear();
        this._load();
    }
}

module.exports = LocaleManager;

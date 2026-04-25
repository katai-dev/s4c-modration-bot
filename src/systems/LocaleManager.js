/**
 * @fileoverview LocaleManager
 * Professional multi-language support system.
 * Loads nested JSON locale files from src/locales/ using dot notation.
 *
 * @example
 * // In a command:
 * interaction.t('commands.color.result', { color: 'Red' });
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

        /** @type {Map<string, Map<string, string>>} locale key -> (key -> string) */
        this._locales = new Map();

        this._load();
    }

    /**
     * Recursively read all .json files from a directory.
     * @private
     */
    _readFiles(dir) {
        if (!fs.existsSync(dir)) return [];
        const results = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...this._readFiles(fullPath));
            } else if (entry.name.endsWith('.json')) {
                results.push(fullPath);
            }
        }
        return results;
    }

    /**
     * Flatten a nested object into a Map of dot-notation keys.
     * @private
     */
    _flatten(obj, prefix = '', map = new Map()) {
        for (const key in obj) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                this._flatten(obj[key], newKey, map);
            } else {
                map.set(newKey, String(obj[key]));
            }
        }
        return map;
    }

    /**
     * Load all JSON files from the locales directory structure.
     * Expected structure: locales/<lang>/[namespace/]<file>.json
     * @private
     */
    _load() {
        if (!fs.existsSync(this._dir)) {
            fs.mkdirSync(this._dir, { recursive: true });
        }

        const langs = fs.readdirSync(this._dir, { withFileTypes: true })
            .filter(dir => dir.isDirectory());

        let totalKeys = 0;

        for (const langDir of langs) {
            const lang = langDir.name;
            const langPath = path.join(this._dir, lang);
            const flatData = new Map();

            const files = this._readFiles(langPath);
            for (const file of files) {
                try {
                    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
                    
                    // Determine namespace based on path relative to lang directory
                    const relPath = path.relative(langPath, file);
                    // Remove .json and convert path separators to dots
                    const namespace = relPath.replace(/\.json$/, '').split(path.sep).join('.');
                    
                    this._flatten(data, namespace, flatData);
                } catch (err) {
                    console.error(`[LocaleManager] Failed to load locale file "${file}": ${err.message}`);
                }
            }

            this._locales.set(lang, flatData);
            totalKeys += flatData.size;
        }
    }

    /**
     * Get a translated string with dot notation.
     *
     * @param {string} locale      The locale to use (e.g. 'en', 'ar').
     * @param {string} key         The translation key (e.g. 'commands.color.result').
     * @param {object} [vars={}]   Variables to replace — {name: "Ali"} replaces `{name}`.
     * @returns {string}           The translated string, or the key itself if not found.
     */
    t(locale, key, vars = {}) {
        const langsToTry = [
            locale || this._default,
            this._default,
            this._fallback
        ];

        let result = null;

        for (const lang of langsToTry) {
            const data = this._locales.get(lang);
            if (data && data.has(key)) {
                result = data.get(key);
                break;
            }
        }

        // Return key if completely missing
        if (result === null) {
            // Optional: Log missing keys during development
            // console.warn(`[I18n] Missing translation key "${key}" for locale "${locale}"`);
            return key;
        }

        // Replace template variables: {varName}
        return result.replace(/\{(\w+)\}/g, (_, name) => {
            return vars[name] !== undefined ? String(vars[name]) : `{${name}}`;
        });
    }

    /**
     * Alias for `t` to maintain backward compatibility if used internally elsewhere.
     */
    get(key, locale, vars = {}) {
        return this.t(locale, key, vars);
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

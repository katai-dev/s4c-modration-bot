/**
 * @fileoverview ComponentHandler
 * Recursively loads buttons, select menus, modals, and autocomplete handlers
 * from the components directory. Supports dynamic/wildcard customId matching via RegExp.
 */

const path = require('path');
const fs   = require('fs');
const { validate } = require('../../utils/Validator');

class ComponentHandler {
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
     * Load all components from the components directory.
     */
    load() {
        const base = path.join(__dirname, '../../components');
        const counts = { buttons: 0, selects: 0, modals: 0, autocomplete: 0 };

        const typeMap = {
            button:       { collection: this.client.components.buttons,      key: 'customId' },
            select:       { collection: this.client.components.selects,      key: 'customId' },
            modal:        { collection: this.client.components.modals,       key: 'customId' },
            autocomplete: { collection: this.client.components.autocomplete, key: 'commandName' }
        };

        const countMap = {
            button: 'buttons', select: 'selects', modal: 'modals', autocomplete: 'autocomplete'
        };

        for (const file of this._readFiles(base)) {
            try {
                delete require.cache[require.resolve(file)];
                const component = require(file);

                const { valid, reason } = validate(component, file);
                if (!valid) { this.logger.warn(reason); continue; }

                const typeEntry = typeMap[component.__type];
                if (!typeEntry) { this.logger.warn(`Unknown component type "${component.__type}" in: ${file}`); continue; }

                const key = component[typeEntry.key];
                if (!key) { this.logger.warn(`Missing key "${typeEntry.key}" in: ${file}`); continue; }

                // Use key.toString() as Map key — works for both strings and RegExps
                typeEntry.collection.set(key.toString(), component);
                counts[countMap[component.__type]]++;

                this.logger.debug(`Loaded ${component.__type}: ${key.toString()}`);
            } catch (err) {
                this.logger.error(`Failed to load component from ${file}: ${err.message}`);
            }
        }

        this.logger.success(
            `Components loaded — Buttons: ${counts.buttons} | Selects: ${counts.selects} | Modals: ${counts.modals} | Autocomplete: ${counts.autocomplete}`
        );
    }

    /**
     * Reload all components.
     */
    reload() {
        this.client.components.buttons.clear();
        this.client.components.selects.clear();
        this.client.components.modals.clear();
        this.client.components.autocomplete.clear();
        this.load();
    }
}

module.exports = ComponentHandler;

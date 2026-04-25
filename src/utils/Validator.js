/**
 * @fileoverview Validator
 * Validates that command/component/event structures have the required fields
 * before they are registered. Provides clear error messages to developers.
 */

const REQUIRED = {
    slash:        ['data', 'run'],
    message:      ['name', 'run'],
    context:      ['data', 'run'],
    button:       ['customId', 'run'],
    select:       ['customId', 'run'],
    modal:        ['customId', 'run'],
    autocomplete: ['commandName', 'run'],
    event:        ['name', 'run']
};

/**
 * Validate a loaded module structure.
 * @param {object} module   The loaded module object.
 * @param {string} filePath The file path (for error messages).
 * @returns {{ valid: boolean, reason?: string }}
 */
function validate(module, filePath) {
    if (!module || typeof module !== 'object') {
        return { valid: false, reason: `Module is not an object in: ${filePath}` };
    }

    const type = module.__type;

    if (!type) {
        return { valid: false, reason: `Missing __type in: ${filePath}. Did you forget to use a structure class?` };
    }

    const required = REQUIRED[type];

    if (!required) {
        return { valid: false, reason: `Unknown __type "${type}" in: ${filePath}` };
    }

    for (const field of required) {
        if (module[field] === undefined || module[field] === null) {
            return { valid: false, reason: `Missing required field "${field}" (type: ${type}) in: ${filePath}` };
        }
    }

    if (typeof module.run !== 'function') {
        return { valid: false, reason: `"run" must be a function in: ${filePath}` };
    }

    if ((type === 'button' || type === 'select' || type === 'modal') && module.customId) {
        if (typeof module.customId !== 'string' && !(module.customId instanceof RegExp)) {
            return { valid: false, reason: `"customId" must be a string or RegExp in: ${filePath}` };
        }
    }

    return { valid: true };
}

/**
 * Check if a component's customId matches an interaction's customId.
 * Supports both exact string matching and RegExp patterns.
 *
 * @param {string|RegExp} componentCustomId  The component's defined customId.
 * @param {string} interactionCustomId       The customId from the interaction.
 * @returns {boolean}
 */
function matchesCustomId(componentCustomId, interactionCustomId) {
    if (componentCustomId instanceof RegExp) {
        return componentCustomId.test(interactionCustomId);
    }
    return componentCustomId === interactionCustomId;
}

module.exports = { validate, matchesCustomId };

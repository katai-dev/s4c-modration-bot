/**
 * @fileoverview Modal Structure
 * Use this to handle modal submit interactions.
 *
 * The `customId` supports exact strings and RegExp patterns.
 *
 * @example
 * module.exports = new Modal({
 *     customId: 'feedback-modal',
 *     run: async (client, interaction) => {
 *         const text = interaction.fields.getTextInputValue('feedback-field');
 *         // ...
 *     }
 * });
 */

class Modal {
    /**
     * @param {object} options
     * @param {string|RegExp} options.customId   Exact customId string OR RegExp pattern.
     * @param {function(import('./GalaxyClient'), import('discord.js').ModalSubmitInteraction): Promise<void>} options.run
     */
    constructor(options) {
        this.customId = options.customId;
        this.run      = options.run;

        /** @internal */
        this.__type = 'modal';
    }
}

module.exports = Modal;

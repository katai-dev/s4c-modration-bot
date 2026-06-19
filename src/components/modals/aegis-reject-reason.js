'use strict';

/**
 * @fileoverview aegis-reject-reason Modal
 * Handles the submission of the rejection reason modal.
 */

const Modal = require('../../structures/Modal');
const CaseRepository = require('../../database/repositories/CaseRepository');

module.exports = new Modal({
    // Matches dynamic IDs like "aegis-reject-reason-1"
    customId: /^aegis-reject-reason-\d+$/,
    
    run: async (client, interaction) => {
        const caseIdStr = interaction.customId.replace('aegis-reject-reason-', '');
        const caseId = parseInt(caseIdStr, 10);

        if (isNaN(caseId)) {
            return interaction.reply({
                content: 'Invalid case ID in modal.',
                flags:   64
            });
        }

        const reason = interaction.fields.getTextInputValue('reason');

        const caseDoc = await CaseRepository.findByCaseId(interaction.guildId, caseId);
        if (!caseDoc) {
            return interaction.reply({
                content: `Case #${caseId} could not be found.`,
                flags:   64
            });
        }

        // Delegate entire business logic to ReviewService
        await client.aegis.services.review.recordRejection(client, interaction, caseDoc, reason);
    }
});

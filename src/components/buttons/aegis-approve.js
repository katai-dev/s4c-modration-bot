'use strict';

/**
 * @fileoverview aegis-approve Button
 * Handles clicks on the "Approve" button attached to Review embeds.
 */

const Button = require('../../structures/Button');
const CaseRepository = require('../../database/repositories/CaseRepository');

module.exports = new Button({
    // Matches dynamic IDs like "aegis-approve-1", "aegis-approve-42"
    customId: /^aegis-approve-\d+$/,
    
    run: async (client, interaction) => {
        // Extract the caseId (integer) from the customId string
        const caseIdStr = interaction.customId.replace('aegis-approve-', '');
        const caseId = parseInt(caseIdStr, 10);

        if (isNaN(caseId)) {
            return interaction.reply({
                content: 'Invalid case ID in button.',
                flags:   64
            });
        }

        const caseDoc = await CaseRepository.findByCaseId(interaction.guildId, caseId);
        if (!caseDoc) {
            return interaction.reply({
                content: `Case #${caseId} could not be found. It may have been deleted or archived.`,
                flags:   64
            });
        }

        const config = await client.aegis.services.config.getConfig(client, interaction.guildId);

        // Delegate entire business logic to ReviewService
        await client.aegis.services.review.recordApproval(client, interaction, caseDoc, config);
    }
});

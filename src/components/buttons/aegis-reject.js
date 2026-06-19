'use strict';

/**
 * @fileoverview aegis-reject Button
 * Handles clicks on the "Reject" button attached to Review embeds.
 * Pops up the rejection reason modal.
 */

const {
    ActionRowBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const Button = require('../../structures/Button');
const CaseRepository = require('../../database/repositories/CaseRepository');

module.exports = new Button({
    // Matches dynamic IDs like "aegis-reject-1", "aegis-reject-42"
    customId: /^aegis-reject-\d+$/,
    
    run: async (client, interaction) => {
        const caseIdStr = interaction.customId.replace('aegis-reject-', '');
        const caseId = parseInt(caseIdStr, 10);

        if (isNaN(caseId)) {
            return interaction.reply({
                content: 'Invalid case ID in button.',
                flags:   64
            });
        }

        // Fast-fail checks before showing the modal
        const caseDoc = await CaseRepository.findByCaseId(interaction.guildId, caseId);
        if (!caseDoc) {
            return interaction.reply({
                content: `Case #${caseId} could not be found.`,
                flags:   64
            });
        }

        if (caseDoc.status !== 'Pending') {
            return interaction.reply({
                content: `This case is no longer pending (status: **${caseDoc.status}**).`,
                flags:   64
            });
        }

        const guardResult = await client.systems.aegisPermissions.check(interaction, 1);
        if (!guardResult.passed) {
            return interaction.reply({
                content: `Insufficient permissions. Required: Moderator (Tier 1). Your tier: ${guardResult.tierName}.`,
                flags:   64
            });
        }

        // Build and show the modal
        const modal = new ModalBuilder()
            .setCustomId(`aegis-reject-reason-${caseId}`)
            .setTitle(`Reject Case #${caseId}`);

        const reasonInput = new TextInputBuilder()
            .setCustomId('reason')
            .setLabel('Reason for Rejection')
            .setPlaceholder('Explain why this action is being overturned...')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMinLength(10)
            .setMaxLength(1000);

        const row = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
    }
});

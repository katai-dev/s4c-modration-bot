'use strict';

/**
 * @fileoverview timeout command
 * Aegis V3: Submits a timeout case for review.
 * Timeout is applied IMMEDIATELY by the CaseService.
 */

const { SlashCommandBuilder } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');
const PunishmentTypeRepository = require('../../../database/repositories/PunishmentTypeRepository');
const CaseValidator = require('../../../aegis/validators/CaseValidator');
const CaseServiceError = require('../../../aegis/services/CaseServiceError');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Apply a timeout and submit it for review (Aegis V3).')
        .addUserOption(opt => 
            opt.setName('target')
               .setDescription('The user to timeout.')
               .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('type_id')
               .setDescription('The ID of the punishment type (must be category: timeout).')
               .setRequired(true)
        )
        .addAttachmentOption(opt =>
            opt.setName('evidence')
               .setDescription('Optional evidence screenshot.')
               .setRequired(false)
        ),
        
    permissions: [], 
    
    run: async (client, interaction) => {
        const guard = await client.systems.aegisPermissions.check(interaction, 1);
        if (!guard.passed) {
            return interaction.reply({
                content: `❌ **Aegis V3**\nInsufficient permissions. Required: Moderator (Tier 1). Your tier: ${guard.tierName}.`,
                flags:   64
            });
        }

        const targetUser = interaction.options.getUser('target');
        const typeId     = interaction.options.getString('type_id');
        const attachment = interaction.options.getAttachment('evidence');

        const punishmentType = await PunishmentTypeRepository.findById(interaction.guildId, typeId).catch(() => null);
        const catVal = CaseValidator.validateCategory(punishmentType, 'timeout');
        if (!catVal.valid) {
            return interaction.reply({
                content: `❌ **Invalid Punishment Type**\n${catVal.reason}`,
                flags:   64
            });
        }

        await interaction.deferReply({ flags: 64 });

        try {
            const caseDoc = await client.aegis.services.cases.createCase(client, interaction, {
                targetUser,
                punishmentType,
                attachments: attachment ? [attachment] : []
            });

            await interaction.editReply({
                content: `✅ **Timeout Applied & Submitted**\nCase \`#${caseDoc.caseId}\` for ${targetUser.tag} has been sent to the review channel. The timeout is now active.`
            });

        } catch (err) {
            if (err instanceof CaseServiceError) {
                await interaction.editReply({
                    content: `❌ **Case Submission Failed**\n${err.message}`
                });
            } else {
                client.logger.error(`[TimeoutCommand] Unexpected error in ${interaction.guildId}: ${err.message}`);
                await interaction.editReply({
                    content: `⚠️ **System Error**\nAn unexpected error occurred while processing this case.`
                });
            }
        }
    }
});

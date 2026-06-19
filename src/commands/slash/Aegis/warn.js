'use strict';

/**
 * @fileoverview warn command
 * Aegis V3: Submits a warning case for review.
 * 
 * Command contains no business logic. Validation, rate limits, duplicate
 * detection, and DB interaction are fully orchestrated by CaseService.
 */

const { SlashCommandBuilder } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');
const PunishmentTypeRepository = require('../../../database/repositories/PunishmentTypeRepository');
const CaseValidator = require('../../../aegis/validators/CaseValidator');
const CaseServiceError = require('../../../aegis/services/CaseServiceError');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Submit a warning case for review (Aegis V3).')
        .addUserOption(opt => 
            opt.setName('target')
               .setDescription('The user to warn.')
               .setRequired(true)
        )
        // Autocomplete omitted for now to keep implementation simple. 
        // In a real bot, we would use Autocomplete to fetch active warn types.
        // We'll use a string ID here which the moderator gets from the /config menu.
        .addStringOption(opt =>
            opt.setName('type_id')
               .setDescription('The ID of the punishment type (must be category: warn).')
               .setRequired(true)
        )
        .addAttachmentOption(opt =>
            opt.setName('evidence')
               .setDescription('Optional evidence screenshot.')
               .setRequired(false)
        ),
        
    // Base tier checked. Finer checks inside service if needed.
    permissions: [], 
    
    run: async (client, interaction) => {
        // 1. Base tier check
        const guard = await client.systems.aegisPermissions.check(interaction, 1);
        if (!guard.passed) {
            return interaction.reply({
                content: `❌ **Aegis V3**\nInsufficient permissions. Required: Moderator (Tier 1). Your tier: ${guard.tierName}.`,
                flags:   64
            });
        }

        // 2. Extract inputs
        const targetUser = interaction.options.getUser('target');
        const typeId     = interaction.options.getString('type_id');
        const attachment = interaction.options.getAttachment('evidence');

        // 3. Fetch and validate punishment type locally before hitting the heavy service
        const punishmentType = await PunishmentTypeRepository.findById(interaction.guildId, typeId).catch(() => null);
        const catVal = CaseValidator.validateCategory(punishmentType, 'warn');
        if (!catVal.valid) {
            return interaction.reply({
                content: `❌ **Invalid Punishment Type**\n${catVal.reason}`,
                flags:   64
            });
        }

        await interaction.deferReply({ flags: 64 });

        // 4. Delegate to CaseService
        try {
            const caseDoc = await client.aegis.services.cases.createCase(client, interaction, {
                targetUser,
                punishmentType,
                attachments: attachment ? [attachment] : []
            });

            await interaction.editReply({
                content: `✅ **Case Submitted**\nCase \`#${caseDoc.caseId}\` for ${targetUser.tag} has been sent to the review channel.`
            });

        } catch (err) {
            if (err instanceof CaseServiceError) {
                await interaction.editReply({
                    content: `❌ **Case Submission Failed**\n${err.message}`
                });
            } else {
                client.logger.error(`[WarnCommand] Unexpected error in ${interaction.guildId}: ${err.message}`);
                await interaction.editReply({
                    content: `⚠️ **System Error**\nAn unexpected error occurred while processing this case.`
                });
            }
        }
    }
});

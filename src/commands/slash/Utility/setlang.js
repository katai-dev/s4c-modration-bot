const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('setlang')
        .setDescription('Set the bot language for this server.')
        .addStringOption(option =>
            option.setName('language')
                .setDescription('The language to set.')
                .setRequired(true)
                .addChoices(
                    { name: 'English', value: 'en' },
                    { name: 'Arabic (العربية)', value: 'ar' }
                )
        ),
    guildOwnerOnly: true, // Optional: Only let server owners change it
    permissions: ['ManageGuild'],
    run: async (client, interaction) => {
        const lang = interaction.options.getString('language');

        if (!client.db.isConnected) {
            return interaction.reply({
                content: interaction.t('errors.DB_ERROR'),
                flags: MessageFlags.Ephemeral
            });
        }

        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const GuildSettings = client.db.model('GuildSettings');
            await GuildSettings.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { locale: lang },
                { upsert: true }
            );

            // Update interaction locale immediately so next translations in this flow use it
            interaction.locale = lang;

            // Update memory cache
            client.cache.locales.set(interaction.guild.id, lang);
            
            const langName = lang === 'en' ? 'English' : 'Arabic (العربية)';
            await interaction.editReply({
                content: interaction.t('common.LANG_SET_SUCCESS', { lang: langName })
            });

        } catch (error) {
            client.logger.error(`Error setting language for guild ${interaction.guild.id}: ${error.message}`);
            await interaction.editReply({
                content: interaction.t('errors.COMMAND_ERROR')
            });
        }
    }
});

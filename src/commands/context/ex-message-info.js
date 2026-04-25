const { ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const ContextMenu = require('../../structures/ContextMenu');

module.exports = new ContextMenu({
    data: new ContextMenuCommandBuilder()
        .setName('ex-Message Info')
        .setType(ApplicationCommandType.Message),
    cooldown: 5,
    run: async (client, interaction) => {
        const msg = interaction.targetMessage;

        const embed = new EmbedBuilder()
            .setTitle('📨 Message Info')
            .setColor(0x5865F2)
            .addFields(
                { name: 'Author', value: `<@${msg.author.id}>`, inline: true },
                { name: 'Channel', value: `<#${msg.channelId}>`, inline: true },
                { name: 'ID', value: msg.id, inline: true },
                { name: 'Created', value: `<t:${Math.floor(msg.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Attachments', value: String(msg.attachments.size), inline: true },
                { name: 'Embeds', value: String(msg.embeds.length), inline: true }
            )
            .setTimestamp();

        if (msg.content) {
            embed.addFields({
                name: 'Content',
                value: msg.content.substring(0, 1024)
            });
        }

        if (msg.attachments.size > 0) {
            const first = msg.attachments.first();
            if (first.contentType?.startsWith('image/')) {
                embed.setImage(first.url);
            }
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
});

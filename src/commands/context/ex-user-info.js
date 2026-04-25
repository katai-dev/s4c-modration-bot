const { ApplicationCommandType, ContextMenuCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const ContextMenu = require('../../structures/ContextMenu');

module.exports = new ContextMenu({
    data: new ContextMenuCommandBuilder()
        .setName('ex-User Info')
        .setType(ApplicationCommandType.User),
    cooldown: 5,
    run: async (client, interaction) => {
        const member = interaction.targetMember;
        const user   = interaction.targetUser;

        const embed = new EmbedBuilder()
            .setTitle(`👤 ${user.displayName}`)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .setColor(member?.displayColor || 0x5865F2)
            .addFields(
                { name: 'Username',    value: user.username,                                     inline: true },
                { name: 'ID',          value: user.id,                                           inline: true },
                { name: 'Bot?',        value: user.bot ? 'Yes' : 'No',                           inline: true },
                { name: 'Guild Owner', value: user.id === interaction.guild?.ownerId ? 'Yes' : 'No', inline: true },
                { name: 'Joined Discord', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Joined Server',  value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'N/A', inline: true }
            )
            .setTimestamp();

        if (member?.roles?.cache?.size > 1) {
            const roles = [...member.roles.cache.values()]
                .filter(r => r.id !== interaction.guild.id)
                .slice(0, 10)
                .map(r => `<@&${r.id}>`)
                .join(', ');
            embed.addFields({ name: `Roles (${member.roles.cache.size - 1})`, value: roles });
        }

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
});

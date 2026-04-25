const { EmbedBuilder } = require('discord.js');
const MessageCommand = require('../../../structures/MessageCommand');

module.exports = new MessageCommand({
    name: 'help',
    description: 'List all available commands.',
    aliases: ['h', 'commands'],
    cooldown: 10,
    run: async (client, message, args) => {
        const prefix         = client.config.commands.prefix.symbol;
        const slashCommands  = [...client.commands.slash.values()];
        const prefixCommands = [...client.commands.prefix.values()];

        const embed = new EmbedBuilder()
            .setTitle('📖 Command List')
            .setColor(0x5865F2)
            .setFooter({ text: `Total: ${slashCommands.length} slash | ${prefixCommands.length} prefix` })
            .setTimestamp();

        if (slashCommands.length > 0) {
            embed.addFields({
                name: '⚡ Slash Commands',
                value: slashCommands
                    .map(cmd => {
                        const name = typeof cmd.data?.name === 'string'
                            ? cmd.data.name
                            : cmd.data?.toJSON?.()?.name ?? 'unknown';
                        const desc = cmd.data?.description ?? cmd.data?.toJSON?.()?.description ?? 'No description.';
                        return `\`/${name}\` — ${desc}`;
                    })
                    .join('\n')
                    .substring(0, 1024)
            });
        }

        if (prefixCommands.length > 0) {
            embed.addFields({
                name: '💬 Prefix Commands',
                value: prefixCommands
                    .map(cmd => `\`${prefix}${cmd.name}\` — ${cmd.description}`)
                    .join('\n')
                    .substring(0, 1024)
            });
        }

        await message.reply({ embeds: [embed] });
    }
});

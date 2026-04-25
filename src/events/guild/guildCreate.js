const Event = require('../../structures/Event');

module.exports = new Event({
    name: 'guildCreate',
    run: async (client, guild) => {
        client.logger.info(`Joined new guild: ${guild.name} (${guild.id}) — Members: ${guild.memberCount}`);
    }
});

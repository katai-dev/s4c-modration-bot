# 📂 `src/commands/slash` Directory

## 📖 Purpose
This folder contains all standard Discord Slash Commands (Chat Input Commands). This is the modern, highly recommended method for interacting with Discord bots.

## 🧩 Role of Files Here
Every `.js` file here must export a `SlashCommand` structure. These files declare the UI requirements (options, choices) and the execution logic.

## 🔗 Connection to the System
Loaded by the `CommandHandler` and executed via the `InteractionHandler`. Automatically registered globally or to a dev guild.

## 🛠️ How to Use
Create a file (e.g., `ping.js`) and export a `SlashCommand`:
```javascript
const SlashCommand = require('../../structures/SlashCommand');
const { SlashCommandBuilder } = require('discord.js');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    cooldown: 5,
    run: async (client, interaction) => {
        await interaction.reply('Pong!');
    }
});
```

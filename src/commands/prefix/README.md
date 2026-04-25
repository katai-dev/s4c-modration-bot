# 📂 `src/commands/prefix` Directory

## 📖 Purpose
This folder contains traditional text-based prefix commands (e.g., `!help`, `?ban`). These are useful for rapid execution, administrative shortcuts, and fallback commands.

## 🧩 Role of Files Here
Every `.js` file here must export a `MessageCommand` structure.
These commands rely entirely on parsing message content rather than Discord's slash command UI.

## 🔗 Connection to the System
Loaded by the `CommandHandler`. Executed via the `messageCreate` event listener built directly into the `GalaxyClient`.

## 🛠️ How to Use
Create a file (e.g., `ping.js`) and export a `MessageCommand`:
```javascript
const MessageCommand = require('../../structures/MessageCommand');

module.exports = new MessageCommand({
    name: 'ping',
    description: 'Ping the bot',
    aliases: ['p'],
    run: async (client, message, args) => {
        message.reply('Pong!');
    }
});
```

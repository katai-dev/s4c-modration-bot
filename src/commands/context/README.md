# 📂 `src/commands/context` Directory

## 📖 Purpose
This folder is dedicated to Discord Context Menu commands. These are commands activated by right-clicking a User or a Message and selecting "Apps > [Command Name]".

## 🧩 Role of Files Here
Every `.js` file here must export a `ContextMenu` structure.
These files define the action taken when a user executes a right-click command.

## 🔗 Connection to the System
Loaded by the `CommandHandler`. They are synchronized to the Discord API alongside standard Slash commands.

## 🛠️ How to Use
Create a file (e.g., `userInfo.js`) and export a `ContextMenu`:
```javascript
const ContextMenu = require('../../structures/ContextMenu');
const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

module.exports = new ContextMenu({
    data: new ContextMenuCommandBuilder()
        .setName('User Info')
        .setType(ApplicationCommandType.User),
    run: async (client, interaction) => {
        // Logic here
    }
});
```

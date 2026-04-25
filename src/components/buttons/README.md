# 📂 `src/components/buttons` Directory

## 📖 Purpose
Handles click events for Discord Message Buttons.

## 🧩 Role of Files Here
Files must export a `Button` structure. They define what happens when a button with a specific `customId` is clicked.

## 🔗 Connection to the System
Loaded by `ComponentHandler` and executed via `InteractionHandler`. Supports powerful middleware like `authorOnly`.

## 🛠️ How to Use
Create a file (e.g., `ticketClose.js`):
```javascript
const Button = require('../../structures/Button');

module.exports = new Button({
    customId: 'ticket-close', // Can also be a RegExp: /^ticket-close-\d+$/
    authorOnly: true, // Only the person who ran the command can click it
    run: async (client, interaction) => {
        await interaction.reply('Closing ticket...');
    }
});
```

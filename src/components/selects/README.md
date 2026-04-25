# 📂 `src/components/selects` Directory

## 📖 Purpose
Handles selection events for Discord Select Menus (Dropdowns). This includes String, User, Role, Channel, and Mentionable select menus.

## 🧩 Role of Files Here
Files must export a `SelectMenu` structure.

## 🔗 Connection to the System
Loaded by `ComponentHandler` and executed via `InteractionHandler`.

## 🛠️ How to Use
Create a file (e.g., `roleSelector.js`):
```javascript
const SelectMenu = require('../../structures/SelectMenu');

module.exports = new SelectMenu({
    customId: 'role-select',
    authorOnly: true,
    run: async (client, interaction) => {
        const selected = interaction.values[0];
        await interaction.reply(`You selected: ${selected}`);
    }
});
```

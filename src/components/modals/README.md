# 📂 `src/components/modals` Directory

## 📖 Purpose
Handles submission events for Discord Modals (popup forms).

## 🧩 Role of Files Here
Files must export a `Modal` structure. When a user submits a modal, this code extracts the field values and acts on them.

## 🔗 Connection to the System
Loaded by `ComponentHandler` and executed via `InteractionHandler`.

## 🛠️ How to Use
Create a file (e.g., `applicationForm.js`):
```javascript
const Modal = require('../../structures/Modal');

module.exports = new Modal({
    customId: 'apply-form',
    run: async (client, interaction) => {
        const answer = interaction.fields.getTextInputValue('age-input');
        await interaction.reply(`You are ${answer} years old.`);
    }
});
```

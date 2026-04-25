# 📂 `src/components/autocomplete` Directory

## 📖 Purpose
Handles autocomplete logic for Slash Commands. When a user begins typing in an autocomplete-enabled option, Discord queries the bot for suggestions. This folder holds the logic to supply those suggestions.

## 🧩 Role of Files Here
Files must export an `Autocomplete` structure. They take the user's partial input and return an array of up to 25 choices.

## 🔗 Connection to the System
Loaded by `ComponentHandler` and routed via `InteractionHandler`.

## 🛠️ How to Use
Create a file matching the base **command name** (e.g., `play.js` for the `/play` command):
```javascript
const Autocomplete = require('../../structures/Autocomplete');

module.exports = new Autocomplete({
    commandName: 'play',
    run: async (client, interaction) => {
        const focusedValue = interaction.options.getFocused();
        // Return suggestions based on focusedValue
        await interaction.respond([{ name: 'Song 1', value: 'url1' }]);
    }
});
```

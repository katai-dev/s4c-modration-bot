# 📂 `src/events/guild` Directory

## 📖 Purpose
Contains event listeners for guild-specific actions: messages, members joining, channels being created, etc.

## 🧩 Role of Files Here
Each file must export an `Event` structure.

## 🔗 Connection to the System
Automatically loaded by `EventHandler`.

## 🛠️ How to Use
Create a file (e.g., `guildMemberAdd.js`):
```javascript
const Event = require('../../structures/Event');

module.exports = new Event({
    name: 'guildMemberAdd',
    once: false,
    run: async (client, member) => {
        // Welcome logic
    }
});
```

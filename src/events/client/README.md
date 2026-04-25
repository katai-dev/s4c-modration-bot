# 📂 `src/events/client` Directory

## 📖 Purpose
Contains event listeners for base client actions, such as when the bot boots up, disconnects, or encounters WebSocket warnings.

## 🧩 Role of Files Here
Each file must export an `Event` structure. 
Example: `ready.js` runs when the bot successfully logs into Discord.

## 🔗 Connection to the System
Automatically loaded by `EventHandler`.

## 🛠️ How to Use
Create a file (e.g., `ready.js`):
```javascript
const Event = require('../../structures/Event');

module.exports = new Event({
    name: 'ready',
    once: true,
    run: async (client) => {
        client.logger.success(`Logged in as ${client.user.tag}!`);
    }
});
```

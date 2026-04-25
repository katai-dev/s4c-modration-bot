# 📂 `src/structures` Directory

## 📖 Purpose
Contains the core Class definitions used to structure commands, events, and components. They act as "blueprints" for developers.

## 🧩 Role of Files Here
Files like `SlashCommand.js`, `Event.js`, and `Button.js` define what parameters are allowed when creating a new module. They enforce consistency and provide IntelliSense (autocomplete) in modern IDEs.

## 🔗 Connection to the System
Every command or component you create must be instantiated using one of these classes. The handlers rely on internal properties (like `__type`) set by these structures to organize them properly.

## 🛠️ How to Use
You do not modify these files unless you are expanding the framework's capabilities (e.g., adding a new `subscriptionOnly` property to all commands).

When making a command, you import from here:
```javascript
const SlashCommand = require('../../structures/SlashCommand');
```

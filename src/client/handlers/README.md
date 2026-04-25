# 📂 `src/client/handlers` Directory

## 📖 Purpose
This folder contains the core automated loaders and dispatchers (handlers) for the Galaxy framework. They are responsible for traversing your project folders, validating your code, and linking your commands/events to Discord's API.

## 🧩 Role of Files Here
- **`CommandHandler.js`**: Recursively scans `src/commands`, validates syntax, caches them in `GalaxyClient`, and registers Slash and Context Menu commands to the Discord API.
- **`ComponentHandler.js`**: Scans `src/components`, validating custom IDs (even RegExp ones), and caching them.
- **`EventHandler.js`**: Reads `src/events`, wrapping run methods in safe boundaries so errors don't crash the bot, and attaches them to `client.on()`.
- **`InteractionHandler.js`**: The unified interaction listener. Captures `interactionCreate` and routes it to the correct command/component, running extensive middleware (permissions, cooldowns, dev-only checks) before execution.

## 🔗 Connection to the System
These handlers are instantiated inside `GalaxyClient`. They do the heavy lifting so developers never have to manually `require()` commands or use `client.on('message', ...)` anywhere else.

## 🛠️ How to Use
Developers rarely need to touch these files unless adding support for entirely new Discord features. The handlers automatically pick up any changes you make in the `commands/`, `components/`, and `events/` folders.

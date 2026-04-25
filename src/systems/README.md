# 📂 `src/systems` Directory

## 📖 Purpose
Houses the background "engines" that enforce the framework's features. These are not commands or events; they are managers that handle logic globally.

## 🧩 Role of Files Here
- **`CooldownManager.js`**: Tracks timestamps for users/guilds to prevent command spam.
- **`ErrorHandler.js`**: Captures unhandled promise rejections and fatal exceptions to prevent bot crashes. It also ensures graceful database shutdowns.
- **`LocaleManager.js`**: Loads the JSON files from `src/locales` and handles variable injection (`{user}`) and fallback translations.
- **`PermissionGuard.js`**: Used by prefix commands to verify Discord permissions before execution.

## 🔗 Connection to the System
These classes are instantiated inside the `GalaxyClient` constructor and attached to `client.systems`. The `InteractionHandler` utilizes them heavily before allowing any command to run.

## 🛠️ How to Use
Do not modify these unless you are fundamentally changing how the framework handles security or data parsing. To add a new system (like an Economy Manager), create it here and instantiate it inside `GalaxyClient.js`.

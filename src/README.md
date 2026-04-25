# 📂 `src` Directory

## 📖 Purpose
This is the root directory for the Galaxy Handler framework's source code. It contains the entire bot application, including its core engine, configuration, database models, utilities, and all modules used by developers (commands, events, etc.).

## 🧩 Role of Files Here
- **`index.js`**: The standard entry point for running the bot without sharding (ideal for development or small bots under 2,500 servers).
- **`shard.js`**: The production entry point. Spawns multiple shards using `ShardingManager` for high-scale, large server count deployments.
- **`example.config.js`**: The configuration template for the framework. Provides customizable settings for intents, bot activity, caching, systems, and IDs. Developers must copy this to `config.js` to run the bot.

## 🔗 Connection to the System
This is the foundation. `index.js` and `shard.js` initialize the `GalaxyClient`, inject the `config`, and launch the framework. The subfolders encapsulate specific features.

## 🛠️ How to Use
Developers should:
1. Copy `example.config.js` and rename it to `config.js`.
2. Populate `config.js` and `.env` with actual bot tokens and database URIs.
3. Start the bot using `node src/index.js` for development or `node src/shard.js` for production deployments.

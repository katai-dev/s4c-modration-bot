# 📂 `src/client` Directory

## 📖 Purpose
This folder encapsulates the custom `GalaxyClient` extension of Discord.js's native `Client`, along with the `Database` manager. This acts as the centralized brain of the bot where all internal states, caches, and connections are held.

## 🧩 Role of Files Here
- **`GalaxyClient.js`**: Extends the base `Client`. Initializes all collections, cache, database connection, systems (cooldowns, locales), and starts the Discord connection loop. Also handles prefix-command message listening.
- **`Database.js`**: Manages the connection to MongoDB using Mongoose. Attaches to `GalaxyClient` and loads models seamlessly so `client.db.model('...')` is available everywhere.
- **`handlers/`**: A subfolder containing the core dispatchers that load modules.

## 🔗 Connection to the System
`GalaxyClient` is passed down to nearly every single run function in the entire framework (events, commands, components). This provides developers with instant access to `.logger`, `.config`, `.db`, and `.systems` via `client`.

## 🛠️ How to Use
- **Do not modify** `GalaxyClient.js` unless you are adding new global systems (like an economy cache manager or a Redis client). 
- If you need to access the database from any command, simply use `client.db.model('ModelName')`.

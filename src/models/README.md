# 📂 `src/models` Directory

## 📖 Purpose
Stores Mongoose Database Schemas. This is where you define the structure of the data saved to MongoDB.

## 🧩 Role of Files Here
Each file exports a compiled Mongoose model (e.g., `GuildSettings.js`). 

## 🔗 Connection to the System
`GalaxyClient` scans this folder upon booting and registers all models *before* connecting to MongoDB. This guarantees that schemas are loaded and available globally via `client.db.model('ModelName')`.

## 🛠️ How to Use
Create a file (e.g., `UserStats.js`):
```javascript
const { Schema, model } = require('mongoose');

const userStatsSchema = new Schema({
    userId: { type: String, required: true },
    xp: { type: Number, default: 0 }
});

module.exports = model('UserStats', userStatsSchema);
```

Then access it anywhere in a command:
```javascript
const UserStats = client.db.model('UserStats');
const stats = await UserStats.findOne({ userId: interaction.user.id });
```

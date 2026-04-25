# Galaxy Handler

> A production-grade, universal Discord bot handler framework built with **Discord.js v14**.
> Designed to power multiple independent bots with the same consistent architecture.

---

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Create your config
```bash
cp src/example.config.js src/config.js
```
Edit `src/config.js` with your settings (intents, prefix, owner ID, etc.)

### 3. Create your `.env`
```bash
cp .env.example .env
```
Fill in your bot token and IDs.

### 4. Start the bot

| Mode | Command | When to use |
|---|---|---|
| Development | `npm start` or `npm run dev` | < 2,500 servers |
| Production (Sharding) | `npm run shard` | 2,500+ servers |
| Dev + watch (shard) | `npm run dev:shard` | Sharding with hot reload |

---

## 🔀 Sharding

Galaxy Handler ships with a ready-to-use `src/shard.js` that wraps your bot in Discord.js's `ShardingManager`.

**You do not need to change any commands or events.** Sharding is transparent — just start with `npm run shard` instead of `npm start`.

```
node src/shard.js
# or:
npm run shard
```

### When do I need sharding?
Discord **requires** sharding once your bot is in **2,500+ servers**. Without it, a single process handles everything, leading to slowdowns and crashes. Each shard is a separate Node.js process handling a portion of your guilds.

### Shard configuration
In `src/shard.js`, you can change `TOTAL_SHARDS`:
```js
const TOTAL_SHARDS = 'auto'; // Let Discord decide (recommended)
// const TOTAL_SHARDS = 4;   // Or specify a fixed number
```

---

## 📁 Folder Structure

```
src/
├── index.js                        Entry point (single process / dev)
├── shard.js                        Entry point (production sharding)
├── example.config.js               Config template → copy to config.js
│
├── client/
│   ├── GalaxyClient.js             Extended Discord Client (core)
│   ├── Database.js                 MongoDB connection manager
│   └── handlers/
│       ├── CommandHandler.js       Loads slash, prefix & context commands
│       ├── ComponentHandler.js     Loads buttons, selects, modals, autocomplete
│       ├── EventHandler.js         Loads event listeners
│       └── InteractionHandler.js   Unified interaction dispatcher
│
├── structures/                     Base classes for all file types
│   ├── SlashCommand.js
│   ├── MessageCommand.js
│   ├── ContextMenu.js
│   ├── Button.js
│   ├── SelectMenu.js
│   ├── Modal.js
│   ├── Autocomplete.js
│   └── Event.js
│
├── commands/
│   ├── slash/                      Slash commands (by category folder)
│   │   ├── Developer/              eval, reload, components
│   │   ├── Information/            help
│   │   └── Utility/                ping, feedback, color
│   ├── prefix/                     Prefix/message commands
│   │   ├── Developer/              eval
│   │   ├── Information/            help
│   │   └── Utility/                ping, setprefix
│   └── context/                    User & Message context menus
│       ├── user-info.js
│       └── message-info.js
│
├── components/
│   ├── buttons/
│   ├── selects/
│   ├── modals/
│   └── autocomplete/
│
├── events/
│   ├── client/                     e.g. ready
│   └── guild/                      e.g. guildCreate
│
├── models/                         Mongoose schemas (auto-loaded on startup)
│   └── GuildSettings.js            Example: per-guild settings schema
│
├── systems/
│   ├── CooldownManager.js          Per-user/guild/channel cooldowns
│   ├── PermissionGuard.js          Centralized permission checks
│   ├── ErrorHandler.js             Global error handling + graceful shutdown
│   └── LocaleManager.js            Multi-language i18n support
│
├── locales/
│   ├── en.json                     English strings
│   └── ar.json                     Arabic strings
│
└── utils/
    ├── Logger.js                   Async logger (console + file + webhook)
    ├── Validator.js                Structure validation
    ├── EmbedHelper.js              Pre-styled embed factories
    └── helpers.js                  General utility functions
```

---

## 🗄️ MongoDB / Database

Galaxy Handler has built-in MongoDB support via [Mongoose](https://mongoosejs.com/).

### Setup
Set `MONGODB_URI` in your `.env`:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mybot
```

If `MONGODB_URI` is not set, the bot starts without a database (all DB-dependent features are skipped gracefully).

### Creating a model
Drop any `.js` file in `src/models/` — it's auto-loaded on startup:

```js
// src/models/UserProfile.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    userId:   { type: String, required: true, unique: true },
    xp:       { type: Number, default: 0 },
    level:    { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('UserProfile', schema);
```

### Using a model in a command
```js
run: async (client, interaction) => {
    const UserProfile = client.db.model('UserProfile');
    const profile = await UserProfile.findOne({ userId: interaction.user.id })
                 ?? await UserProfile.create({ userId: interaction.user.id });

    await interaction.reply({ content: `Your XP: ${profile.xp}` });
}
```

### Per-guild prefix (built-in)
`GalaxyClient._resolvePrefix()` automatically reads the prefix from `GuildSettings` in MongoDB when the DB is connected. Use `?setprefix <symbol>` to change it per server.

---

## 📝 Creating a Slash Command

```js
// src/commands/slash/Utility/my-command.js
const { SlashCommandBuilder } = require('discord.js');
const SlashCommand = require('../../../structures/SlashCommand');

module.exports = new SlashCommand({
    data: new SlashCommandBuilder()
        .setName('greet')
        .setDescription('Say hello!'),
    cooldown: 5,          // seconds
    devOnly: false,
    ownerOnly: false,
    permissions: [],       // e.g. ['ManageMessages']
    run: async (client, interaction) => {
        await interaction.reply({ content: `Hello, ${interaction.user.displayName}! 👋` });
    }
});
```

---

## 📝 Creating a Prefix Command

```js
// src/commands/prefix/Utility/greet.js
const MessageCommand = require('../../../structures/MessageCommand');

module.exports = new MessageCommand({
    name: 'greet',
    description: 'Say hello!',
    aliases: ['hi', 'hello'],
    cooldown: 5,
    run: async (client, message, args) => {
        await message.reply(`Hello, ${message.author.displayName}! 👋`);
    }
});
```

---

## 📝 Creating a Button

```js
// src/components/buttons/my-button.js
const { MessageFlags } = require('discord.js');
const Button = require('../../structures/Button');

module.exports = new Button({
    customId: 'my-button',        // Also accepts RegExp: /^ticket-close-\d+$/
    authorOnly: false,
    run: async (client, interaction) => {
        await interaction.reply({ content: '✅ Button clicked!', flags: MessageFlags.Ephemeral });
    }
});
```

---

## 📝 Creating an Autocomplete Handler

```js
// src/components/autocomplete/my-autocomplete.js
const Autocomplete = require('../../../structures/Autocomplete');

module.exports = new Autocomplete({
    commandName: 'my-command', // Must match the slash command name
    run: async (client, interaction) => {
        const focused = interaction.options.getFocused().toLowerCase();
        const choices = ['option1', 'option2', 'option3']
            .filter(c => c.startsWith(focused))
            .map(c => ({ name: c, value: c }));
        await interaction.respond(choices);
    }
});
```

---

## 📝 Creating a Context Menu

```js
// src/commands/context/my-context.js
const { ApplicationCommandType, ContextMenuCommandBuilder } = require('discord.js');
const ContextMenu = require('../../../structures/ContextMenu');

module.exports = new ContextMenu({
    data: new ContextMenuCommandBuilder()
        .setName('My Context Menu')
        .setType(ApplicationCommandType.User),
    run: async (client, interaction) => {
        await interaction.reply({ content: `Target: ${interaction.targetUser.tag}` });
    }
});
```

---

## ⚙️ Systems

### Cooldowns
```js
// In a command:
// cooldown: 10             → 10 second cooldown
// cooldownScope: 'guild'   → shared per guild (instead of per user)
```

### Localization
```js
// In any command:
const msg = client.systems.locale.get('COOLDOWN', 'ar', { time: 5 });
// → "انتظر **5** ثوانٍ قبل استخدام هذا الأمر مجدداً."
```

### Permission Guard (manual check)
```js
const { passed, message } = client.systems.permissions.check(interaction, command);
if (!passed) return interaction.reply({ content: message });

const isOwner = client.systems.permissions.isOwner(interaction.user.id);
const isDev   = client.systems.permissions.isDeveloper(interaction.user.id);
```

### EmbedHelper
```js
const { successEmbed, errorEmbed, createEmbed } = require('../utils/EmbedHelper');

await interaction.reply({ embeds: [successEmbed('Action completed!', interaction.user)] });
await interaction.reply({ embeds: [errorEmbed('Something went wrong.')] });
```

### Helpers
```js
const { sleep, formatDuration, truncate, chunkArray } = require('../utils/helpers');

await sleep(1000);                         // Wait 1 second
formatDuration(90000);                     // → "1m 30s"
truncate('Very long string...', 50);       // Truncates to 50 chars
chunkArray([1,2,3,4,5], 2);               // → [[1,2], [3,4], [5]]
```

---

## 🔧 Environment Variables

| Variable | Description | Required |
|---|---|---|
| `CLIENT_TOKEN` | Bot token | ✅ |
| `OWNER_ID` | Your Discord user ID | ✅ |
| `DEV_IDS` | Comma-separated developer IDs | ⬜ |
| `DEV_GUILD_ID` | Guild ID for dev command registration | ⬜ |
| `MONGODB_URI` | MongoDB connection string | ⬜ |
| `LOG_WEBHOOK_URL` | Discord webhook for remote error logging | ⬜ |

---

## 🌐 Multi-Language Support

Add new locales by creating `src/locales/<lang>.json`:
```json
{
    "COOLDOWN": "Bitte warte **{time}s** bevor du das erneut verwendest."
}
```

Access it:
```js
client.systems.locale.get('COOLDOWN', 'de', { time: 5 });
```

---

## 🤝 Extending for a New Bot

1. Clone this repository into your new bot project
2. Copy `src/example.config.js` → `src/config.js`
3. Copy `.env.example` → `.env`
4. Add your commands to `src/commands/`, components to `src/components/`, events to `src/events/`
5. Add Mongoose models to `src/models/` — they are auto-loaded
6. For production (2,500+ servers): run with `npm run shard`

> The handler discovers all files automatically — just drop them in the right folder.

---

## 📦 Dependencies

| Package | Purpose |
|---|---|
| `discord.js` | Discord API wrapper |
| `dotenv` | Environment variable loading |
| `chalk` | Terminal color output |
| `mongoose` | MongoDB ODM |

---

*Built by Galaxy Dev — production-grade, framework-ready.*

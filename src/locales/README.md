# 📂 `src/locales` Directory

## 📖 Purpose
Stores translation files for the framework's professional **internationalization (i18n) system**. This allows the bot to support multiple languages seamlessly on a per-guild or per-user basis.

## 🧩 Role of Files & Folders
The system uses a **folder-based namespacing** approach:
- Each top-level folder name corresponds to a locale code (e.g., `en`, `ar`).
- Any `.json` file inside a locale folder becomes a **namespace**.
- Subfolders are supported and will be reflected in the translation key using dot notation.

### Example Structure:
```text
locales/
├── en/
│   ├── common.json         // Key: common.xxx
│   ├── errors.json         // Key: errors.xxx
│   └── commands/
│       └── color.json      // Key: commands.color.xxx
```

## 🔗 Connection to the System
Loaded by the `LocaleManager` inside `GalaxyClient`. The manager flattens these files into a high-performance in-memory Map. During interactions, the `InteractionHandler` or `GalaxyClient` resolves the preferred locale and injects the `interaction.t()` or `message.t()` function.

## 🛠️ How to Use

### 1. Define Translations
In `src/locales/en/commands/color.json`:
```json
{
    "result": "You selected the color: **{color}** ({hex})"
}
```

### 2. Call in Code
In a command or component:
```javascript
run: async (client, interaction) => {
    // .t() automatically resolves the correct language and variables!
    const msg = interaction.t('commands.color.result', { 
        color: 'Blue', 
        hex: '#0000FF' 
    });
    
    await interaction.reply(msg);
}
```

## ⚡ Features
- **Nested Objects**: Supports nested JSON structures.
- **Dot Notation**: Easy access to keys like `errors.NOT_FOUND`.
- **Variables**: Use `{varName}` for dynamic values.
- **Fallback System**: If a key is missing in the target language, it falls back to the default language, then the fallback language, and finally returns the key itself.

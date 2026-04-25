# 📂 `src/commands` Directory

## 📖 Purpose
This is the root folder for all command categories. The handler dynamically loads everything placed here.

## 🧩 Role of Folders Here
- **`slash/`**: For standard Discord slash commands (`/ping`).
- **`prefix/`**: For legacy or fast-action text commands (`!ping`).
- **`context/`**: For right-click context menu actions on Users or Messages.

## 🔗 Connection to the System
The `CommandHandler` scans these subfolders upon startup. Every valid file here is cached in memory and (if applicable) synchronized with the Discord API.

## 🛠️ How to Use
- Organize your code! You can create subfolders inside `slash/`, `prefix/`, or `context/` (e.g., `slash/moderation/ban.js`). The handler reads subdirectories recursively.
- Ensure every file exports a corresponding `Structure` (e.g., `new SlashCommand(...)`).

# 📂 `src/events` Directory

## 📖 Purpose
This is the root folder for all Discord client events (e.g., `ready`, `messageCreate`, `guildMemberAdd`).

## 🧩 Role of Folders Here
- **`client/`**: Client-specific lifecycle events (ready, warn, error).
- **`guild/`**: Guild-related events (member join/leave, role updates).

## 🔗 Connection to the System
Loaded dynamically by the `EventHandler`. Every file acts as a listener attached to `GalaxyClient`.

## 🛠️ How to Use
Organize your events logically across subfolders. The handler automatically recurses through all of them.

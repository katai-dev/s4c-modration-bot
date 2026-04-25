# 📂 `src/utils` Directory

## 📖 Purpose
Contains standalone helper functions, formatting tools, and validators used throughout the framework. 

## 🧩 Role of Files Here
- **`EmbedHelper.js`**: Standardizes the creation of Message Embeds (success, error, warning) so all bots share a consistent aesthetic.
- **`Logger.js`**: A powerful CLI logger with color coding, file-writing capabilities, and Discord webhook support for critical errors.
- **`Validator.js`**: Checks the syntax of commands/components during startup. If a developer forgets a `run` function, this catches it.
- **`helpers.js`**: Miscellaneous utilities (e.g., waiting, random number generation).

## 🔗 Connection to the System
Imported directly wherever needed. `Logger.js` is attached globally via `client.logger`.

## 🛠️ How to Use
If you find yourself writing the same piece of code (like calculating time differences or formatting strings) in multiple commands, put it in `helpers.js` and export it so it can be shared easily.

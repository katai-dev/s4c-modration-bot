# 📂 `src/components` Directory

## 📖 Purpose
This is the root directory for all interaction components: Buttons, Select Menus, Modals, and Autocomplete handlers. 

## 🧩 Role of Folders Here
- **`buttons/`**: Handlers for clicked buttons.
- **`selects/`**: Handlers for dropdown menu selections.
- **`modals/`**: Handlers for submitted form modals.
- **`autocomplete/`**: Handlers for dynamic slash command autocomplete typing.

## 🔗 Connection to the System
The `ComponentHandler` traverses these directories, validating and caching each component. When a component interaction is received, the `InteractionHandler` routes it here.

## 🛠️ How to Use
Place your component handlers in the appropriate subdirectories. Remember that button, select, and modal handlers can use **RegExp custom IDs** to match dynamic inputs (like `ticket-close-123`).

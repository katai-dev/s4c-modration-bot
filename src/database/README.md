# Database Directory Structure

This folder contains everything related to the MongoDB database for the GalaxyHandlerV1 framework.
By keeping models and functions in one isolated folder, your codebase remains clean and easy to maintain.

## Structure

- `/models/`: Contains all Mongoose schemas.
- `/Functions/`: Contains wrapper classes and methods to interact with the models.

## Best Practices

1. **Do not use `client.db.model('Name')`**. Always require the model directly where you need it (e.g., inside `/Functions/` or inside your commands).
2. **Keep logic isolated**. Try to put heavy database queries inside the `Functions/` folder and call those functions from your Commands or Events.
3. **Environments**. `Database.js` will automatically switch between the `test` and `prod` databases based on `IS_DEV` (or `config.development.enabled`). You don't need to change connection strings manually.

## Examples

We've included `ex-UserModel.js` and `ex-UserFunctions.js` as references. You can delete them when you're ready to build your own bot!

/**
 * @fileoverview Database Manager
 * Handles MongoDB connection using Mongoose.
 * Attach to the client via `client.db` for access anywhere.
 *
 * Usage in any command/event:
 *   const data = await client.db.model('GuildSettings').findOne({ guildId: '...' });
 */

const mongoose = require('mongoose');
const path     = require('path');
const fs       = require('fs');

class Database {
    /**
     * @param {import('../client/GalaxyClient')} client
     */
    constructor(client) {
        this.client    = client;
        this.logger    = client.logger;
        this.mongoose  = mongoose;

        /** @type {mongoose.Connection} */
        this.connection = mongoose.connection;

        this._registerEvents();
    }

    /**
     * Register mongoose connection lifecycle events.
     * @private
     */
    _registerEvents() {
        this.connection.on('connected', () => {
            this.logger.success('MongoDB connected successfully.');
        });

        this.connection.on('disconnected', () => {
            this.logger.warn('MongoDB disconnected.');
        });

        this.connection.on('error', (err) => {
            this.logger.error(`MongoDB error: ${err.message}`);
        });

        this.connection.on('reconnected', () => {
            this.logger.success('MongoDB reconnected.');
        });
    }

    /**
     * Connect to MongoDB.
     * @param {string} uri MongoDB connection URI (from env or config)
     * @returns {Promise<void>}
     */
    async connect(uri) {
        if (!uri) {
            this.logger.warn('No MONGODB_URI provided — skipping database connection.');
            return;
        }

        try {
            const dbName = this.client.config.development?.enabled ? 'test' : 'prod';
            await mongoose.connect(uri, {
                serverSelectionTimeoutMS: 5000, // Timeout if can't connect in 5s
                dbName: dbName
            });
            this._loadModels();
            this.logger.info(`MongoDB connecting to database: ${dbName}`);
        } catch (err) {
            this.logger.error(`MongoDB connection failed: ${err.message}`);
            this.logger.warn('Bot will continue running without a database connection.');
        }
    }

    /**
     * Disconnect from MongoDB gracefully.
     * Called automatically on SIGINT/SIGTERM via ErrorHandler.
     */
    async disconnect() {
        if (this.connection.readyState !== 0) {
            await mongoose.disconnect();
            this.logger.info('MongoDB disconnected gracefully.');
        }
    }

    /**
     * Check if currently connected.
     * @returns {boolean}
     */
    get isConnected() {
        return this.connection.readyState === 1; // 1 = connected
    }

    /**
     * Auto-require every .js file in src/database/models so Mongoose
     * registers all schemas before any command/event calls model().
     * @private
     */
    _loadModels() {
        const modelsDir = path.join(__dirname, '../database/models');
        if (!fs.existsSync(modelsDir)) return;
        for (const file of fs.readdirSync(modelsDir)) {
            if (!file.endsWith('.js')) continue;
            require(path.join(modelsDir, file));
        }
        this.logger.debug(`Models loaded from ${modelsDir}`);
    }

    /**
     * Get a registered Mongoose model by name.
     * Use this to access your schemas anywhere via client.db.model('Name').
     *
     * @param {string} name
     * @returns {mongoose.Model}
     */
    model(name) {
        return mongoose.model(name);
    }
}

module.exports = Database;

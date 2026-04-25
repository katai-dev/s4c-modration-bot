/**
 * @fileoverview Redis Manager
 * Handles the Redis connection for distributed caching across shards.
 * Attach to the client via `client.redis` for access anywhere.
 */

const Redis = require('ioredis');

class RedisManager {
    /**
     * @param {import('../client/GalaxyClient')} client
     */
    constructor(client) {
        this.client = client;
        this.logger = client.logger;

        /** @type {Redis} */
        this.connection = null;
    }

    /**
     * Connect to Redis.
     * @param {string} uri Redis connection URI (from env)
     * @returns {Promise<void>}
     */
    async connect(uri) {
        if (!uri) {
            this.logger.warn('No REDIS_URI provided — Redis caching is disabled. Falling back to local memory if applicable.');
            return;
        }

        try {
            this.connection = new Redis(uri, {
                retryStrategy(times) {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                },
                maxRetriesPerRequest: 3
            });

            this._registerEvents();

            // Test connection
            await this.connection.ping();
        } catch (err) {
            this.logger.error(`Redis connection failed: ${err.message}`);
            this.connection = null;
        }
    }

    /**
     * Register Redis connection lifecycle events.
     * @private
     */
    _registerEvents() {
        if (!this.connection) return;

        this.connection.on('connect', () => {
            this.logger.success('Redis connected successfully.');
        });

        this.connection.on('error', (err) => {
            this.logger.error(`Redis error: ${err.message}`);
        });

        this.connection.on('close', () => {
            this.logger.warn('Redis disconnected.');
        });
    }

    /**
     * Disconnect gracefully.
     */
    async disconnect() {
        if (this.connection) {
            await this.connection.quit();
            this.logger.info('Redis disconnected gracefully.');
        }
    }

    /**
     * Check if connected.
     * @returns {boolean}
     */
    get isConnected() {
        return this.connection && this.connection.status === 'ready';
    }
}

module.exports = RedisManager;

/**
 * @fileoverview Sharding Manager Entry Point
 * Use THIS file to start the bot when it's in production and serving many servers.
 *
 * ── When do you need Sharding? ────────────────────────────────────────────────
 * Discord forces you to use sharding once your bot is in 2,500+ servers.
 * Without sharding, one process handles everything → it slows down and crashes.
 * With sharding, Discord.js automatically splits the bot into multiple processes
 * (called "shards"), each handling a portion of the servers. They all share
 * the same code — you just start them from this file instead of index.js.
 *
 * ── How to use ────────────────────────────────────────────────────────────────
 * For development (< 2500 servers):  node src/index.js  (or: npm start)
 * For production  (2500+ servers):   node src/shard.js  (or: npm run shard)
 *
 * ── What changes in your commands/events? ─────────────────────────────────────
 * NOTHING. All your commands and events stay the same.
 * The ShardingManager handles everything behind the scenes.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { ShardingManager } = require('discord.js');
const chalk = require('chalk');

// How many shards do you want?
// 'auto' = let Discord decide the optimal number (recommended)
const TOTAL_SHARDS = 'auto';

const manager = new ShardingManager(
    path.join(__dirname, 'index.js'), // This is what each shard will run
    {
        token: process.env.CLIENT_TOKEN,
        totalShards: TOTAL_SHARDS,
        respawn: true // Automatically restart crashed shards
    }
);

// ── Events ────────────────────────────────────────────────────────────────────

manager.on('shardCreate', (shard) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    console.log(
        chalk.gray(`[${time}]`),
        chalk.cyan('[Sharding]'),
        `Launched Shard #${shard.id}`
    );

    shard.on('ready', () => {
        console.log(
            chalk.gray(`[${time}]`),
            chalk.green('[Sharding]'),
            `Shard #${shard.id} is ready.`
        );
    });

    shard.on('disconnect', () => {
        console.log(
            chalk.gray(`[${time}]`),
            chalk.yellow('[Sharding]'),
            `Shard #${shard.id} disconnected.`
        );
    });

    shard.on('reconnecting', () => {
        console.log(
            chalk.gray(`[${time}]`),
            chalk.yellow('[Sharding]'),
            `Shard #${shard.id} reconnecting...`
        );
    });

    shard.on('death', (process) => {
        console.log(
            chalk.gray(`[${time}]`),
            chalk.red('[Sharding]'),
            `Shard #${shard.id} died (exit code: ${process.exitCode}). Respawning...`
        );
    });
});

// ── Spawn All Shards ──────────────────────────────────────────────────────────
const time = new Date().toLocaleTimeString('en-US', { hour12: false });
console.log(
    chalk.gray(`[${time}]`),
    chalk.cyan('[Sharding]'),
    `Starting ShardingManager with totalShards: ${TOTAL_SHARDS}...`
);

manager.spawn({ timeout: 30000 })
    .then(() => {
        console.log(chalk.green(`[Sharding] All shards launched successfully!`));
    })
    .catch((err) => {
        console.error(chalk.red(`[Sharding] Failed to spawn shards: ${err.message}`));
        process.exit(1);
    });

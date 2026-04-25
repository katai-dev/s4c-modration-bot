/**
 * @fileoverview General Helpers / Utilities
 * Reusable helper functions for use across all bots.
 */

/**
 * Sleep for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Truncate a string to a maximum length, adding an ellipsis.
 * @param {string} str
 * @param {number} [maxLength=100]
 * @returns {string}
 */
const truncate = (str, maxLength = 100) => {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
};

/**
 * Format milliseconds into a human-readable duration string.
 * @param {number} ms
 * @returns {string} e.g. "2h 30m 15s"
 */
const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours   = Math.floor(minutes / 60);
    const days    = Math.floor(hours / 24);

    const parts = [];
    if (days    > 0) parts.push(`${days}d`);
    if (hours   % 24 > 0) parts.push(`${hours % 24}h`);
    if (minutes % 60 > 0) parts.push(`${minutes % 60}m`);
    if (seconds % 60 > 0 || parts.length === 0) parts.push(`${seconds % 60}s`);

    return parts.join(' ');
};

/**
 * Capitalize the first letter of a string.
 * @param {string} str
 * @returns {string}
 */
const capitalize = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Chunk an array into groups of a given size.
 * @template T
 * @param {T[]} arr
 * @param {number} size
 * @returns {T[][]}
 */
const chunkArray = (arr, size) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
};

/**
 * Pick a random element from an array.
 * @template T
 * @param {T[]} arr
 * @returns {T}
 */
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * Convert a Discord snowflake ID to a Date object.
 * @param {string} snowflake
 * @returns {Date}
 */
const snowflakeToDate = (snowflake) => {
    const ms = BigInt(snowflake) >> 22n;
    return new Date(Number(ms) + 1420070400000);
};

/**
 * Check if a string is a valid Discord snowflake ID.
 * @param {string} id
 * @returns {boolean}
 */
const isSnowflake = (id) => /^\d{17,20}$/.test(id);

/**
 * Format a number with comma separators.
 * @param {number} num
 * @returns {string}
 */
const formatNumber = (num) => num.toLocaleString('en-US');

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

module.exports = {
    sleep,
    truncate,
    formatDuration,
    capitalize,
    chunkArray,
    randomFrom,
    snowflakeToDate,
    isSnowflake,
    formatNumber,
    clamp
};

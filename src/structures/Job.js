/**
 * @fileoverview Job Structure
 * Base class for interval-based tasks or background jobs.
 */

class Job {
    /**
     * @param {object} options
     * @param {string} options.name Name of the job
     * @param {number} options.interval Interval in milliseconds
     * @param {boolean} [options.runOnStartup=false] Whether to run immediately on load
     * @param {Function} options.run The execution function: async (client) => {}
     */
    constructor(options) {
        this.name = options.name;
        this.interval = options.interval;
        this.runOnStartup = options.runOnStartup || false;
        this.run = options.run;
    }
}

module.exports = Job;

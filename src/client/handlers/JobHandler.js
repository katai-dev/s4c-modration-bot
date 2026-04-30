/**
 * @fileoverview JobHandler
 * Recursively loads all job files from the jobs directory
 * and registers their intervals.
 */

const path = require('path');
const fs   = require('fs');

class JobHandler {
    /**
     * @param {import('../GalaxyClient')} client
     */
    constructor(client) {
        this.client = client;
        this.logger = client.logger;
        this.intervals = new Map();
    }

    /**
     * Recursively read all .js files from a directory.
     * @param {string} dir
     * @returns {string[]}
     * @private
     */
    _readFiles(dir) {
        if (!fs.existsSync(dir)) return [];
        const results = [];

        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...this._readFiles(fullPath));
            } else if (entry.name.endsWith('.js')) {
                results.push(fullPath);
            }
        }

        return results;
    }

    /**
     * Load and register all jobs.
     */
    load() {
        const jobsDir = path.join(__dirname, '../../jobs');
        let count = 0;

        for (const file of this._readFiles(jobsDir)) {
            try {
                delete require.cache[require.resolve(file)];
                const job = require(file);

                if (!job.name || !job.interval || typeof job.run !== 'function') {
                    this.logger.warn(`Invalid job structure in ${file}`);
                    continue;
                }

                // Wrap run in centralized error boundary
                const safeRun = async () => {
                    await this.client.systems.errors.wrap(
                        async () => await job.run(this.client),
                        `Job:${job.name}`
                    );
                };

                if (job.runOnStartup) {
                    safeRun();
                }

                const intervalId = setInterval(safeRun, job.interval);
                this.intervals.set(job.name, intervalId);

                this.logger.debug(`Loaded job: ${job.name} (interval: ${job.interval}ms)`);
                count++;
            } catch (err) {
                this.logger.error(`Failed to load job from ${file}: ${err.message}`);
            }
        }

        if (count > 0) {
            this.logger.success(`Jobs loaded — Total: ${count}`);
        }
    }
    
    /**
     * Stop all jobs.
     */
    stopAll() {
        for (const [name, intervalId] of this.intervals.entries()) {
            clearInterval(intervalId);
            this.logger.debug(`Stopped job: ${name}`);
        }
        this.intervals.clear();
    }
}

module.exports = JobHandler;

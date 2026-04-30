const Job = require('../structures/Job');

module.exports = new Job({
    name: 'ExampleJob',
    interval: 60 * 60 * 1000, // 1 hour
    runOnStartup: false,
    run: async (client) => {
        client.logger.info('[ExampleJob] This is a background job running every hour!');
    }
});

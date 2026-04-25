const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const GalaxyClient = require('./client/GalaxyClient');
const config       = require('./config');

const client = new GalaxyClient(config);

// Register global error handlers before connecting
client.systems.errors.register();

// Connect to Discord
client.connect();
// Import knex
const knex = require('knex');
// Import the logger
const logger = require('../config/logger'); // Make sure this path is correct

// Create the connection config
const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  },
  // --- UPDATED POOL CONFIGURATION ---
  pool: { 
    min: 0, // Set to 0 for dev, 2 is fine for production
    max: 10,
    // This tells Knex to destroy idle connections after 10 seconds
    idleTimeoutMillis: 10000, 
    // This ensures connections don't hang forever
    acquireTimeoutMillis: 30000,
  } 
};

// Create the knex instance
const db = knex(dbConfig);

// (Optional but Recommended) Add a listener to log pool errors
db.client.pool.on("error", (err) => {
  logger.error("Knex pool error:", err);
});

// Export the instance
module.exports = db;
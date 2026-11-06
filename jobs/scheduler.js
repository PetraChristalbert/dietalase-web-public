const cron = require('node-cron');
const logger = require('../config/logger');
const knex = require('../db/knex');

/**
 * Converted from App\Jobs\RekapProductVisitStats.php
 * This function runs daily to summarize the previous day's product visits.
 */
const rekapVisitStats = async () => {
  logger.info('Running RekapProductVisitStats job...');
  try {
    // 1. Get yesterday's date (replaces now()->subDay())
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDateString = yesterday.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    // 2. Run the query (replaces DB::table(...)->get())
    const results = await knex('visits')
      .select(
        'pid', 
        'sid', 
        knex.raw('DATE(timestamp) as visit_date'), 
        knex.raw('COUNT(*) as total')
      )
      .whereRaw('DATE(timestamp) = ?', [yesterdayDateString])
      .groupBy('pid', 'sid', knex.raw('DATE(timestamp)'));

    logger.info(`Found ${results.length} visit stats to rekap for ${yesterdayDateString}.`);
    
    // 3. Loop and updateOrInsert (replaces foreach)
    for (const row of results) {
      // Knex's .onConflict().merge() is the equivalent of updateOrInsert
      await knex('product_visit_stats')
        .insert({
          pid: row.pid,
          sid: row.sid,
          // Format date just in case it's a JS Date object
          visit_date: new Date(row.visit_date).toISOString().split('T')[0],
          visit_count: row.total
        })
        .onConflict(['pid', 'sid', 'visit_date']) // Assumes a unique key on these 3
        .merge({ // On conflict, update this column
          visit_count: row.total
        });
    }
    logger.info('RekapProductVisitStats job complete.');

  } catch (error) {
    logger.error('Error in RekapProductVisitStats job', { error: error.message });
  }
};

/**
 * Initializes all scheduled jobs for the application.
 */
const scheduleJobs = () => {
  // 4. Schedule the job
  // This cron string '0 0 * * *' means "at minute 0 of hour 0 (midnight) every day"
  cron.schedule('0 0 * * *', () => {
    rekapVisitStats();
  }, {
    timezone: "Asia/Jakarta" // IMPORTANT: Set to your server's timezone (WIB)
  });

  logger.info('Cron job for RekapVisitStats scheduled to run daily at midnight (WIB).');
};

// Export the function that starts the scheduler
module.exports = { scheduleJobs };
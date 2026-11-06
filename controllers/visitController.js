const knex = require('../db/knex');
const logger = require('../config/logger');

/*
 * Converts: public function logProductVisit(Request $request)
 */
const batchLogVisits = async (req, res) => {
  const { visits } = req.body; // Array of { eid, pid, sid, source }

  if (!visits || !Array.isArray(visits) || visits.length === 0) {
    return res.status(400).json({ status: false, message: 'visits array is required' });
  }

  try {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const validInserts = [];

    // Group visits by eid + pid to avoid duplicate DB checks for the same product in a single batch
    const uniqueVisits = new Map();
    for (const v of visits) {
      if (v.eid && v.pid && v.sid) {
        uniqueVisits.set(`${v.eid}-${v.pid}`, v);
      }
    }

    for (const [key, v] of uniqueVisits) {
      // Check recent visits in the correct table (raw_visits)
      const recent = await knex('raw_visits')
        .where({ eid: v.eid, pid: v.pid })
        .where('created_at', '>=', sixHoursAgo)
        .first();

      if (!recent) {
        validInserts.push({
          eid: v.eid,
          pid: v.pid,
          sid: v.sid,
          source: v.source || 'direct',
          created_at: now
        });
      }
    }

    if (validInserts.length > 0) {
      await knex('raw_visits').insert(validInserts);
    }
    
    return res.json({ status: 'logged', count: validInserts.length });

  } catch (error) {
    logger.error('Error in batchLogVisits', { error: error.message });
    return res.status(500).json({ status: false, message: 'Database error' });
  }
};

module.exports = {
  batchLogVisits
};
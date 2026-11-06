const knex = require('../db/knex');
const logger = require('../config/logger');

/*
 * Converts: public function pendingMessages()
 */
const pendingMessages = async (req, res) => {
  try {
    const messages = await knex('whatsapp_messages')
      .where('sent', false)
      .orderBy('scheduled_at', 'asc')
      .limit(10);
    
    return res.json(messages);

  } catch (error) {
    logger.error('Error fetching pending messages', { error: error.message });
    return res.status(500).json({ status: false, message: 'Database error' });
  }
};

/*
 * Converts: public function markMessageSent(Request $request)
 */
const markMessageSent = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ success: false, message: 'ID is required' });
  }

  try {
    await knex('whatsapp_messages')
      .where('id', id)
      .update({
        sent: true,
        sent_at: new Date() // JS equivalent of now()
      });
    
    return res.json({ success: true });

  } catch (error) {
    logger.error('Error in markMessageSent', { error: error.message });
    return res.status(500).json({ status: false, message: 'Database error' });
  }
};

// Export all the functions
module.exports = {
  pendingMessages,
  markMessageSent
};
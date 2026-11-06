const knex = require("../db/knex");
const logger = require("../config/logger");

/**
 * Real-time Chat Controller (v2)
 * Handles both Human-to-Human and Human-to-AI threads.
 */

const getOrCreateThread = async (req, res) => {
  const { user_eid, store_sid, is_ai_chat = false } = req.body;

  if (!user_eid || !store_sid) {
    return res.status(400).json({ error: "user_eid and store_sid are required" });
  }

  try {
    // Try to find existing thread
    let thread = await knex("chat_threads")
      .where({ user_eid, store_sid, is_ai_chat })
      .first();

    if (!thread) {
      // Create new thread
      const newThread = await knex("chat_threads")
        .insert({
          user_eid,
          store_sid,
          is_ai_chat,
          last_message: ""
        })
        .returning("*");
      thread = newThread[0];
    }

    return res.json(thread);
  } catch (error) {
    logger.error("Error in getOrCreateThread:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getThreads = async (req, res) => {
  const { eid, sid } = req.query;

  try {
    let query = knex("chat_threads")
      .select(
        "chat_threads.*",
        "etalovers.name as user_name",
        "etalovers.image as user_image",
        knex.raw("COALESCE(stores.name, 'Digital Concierge') as store_name"),
        knex.raw("COALESCE(stores.image, 'ai_avatar_url') as store_image")
      )
      .leftJoin("etalovers", "chat_threads.user_eid", "etalovers.eid")
      .leftJoin("stores", "chat_threads.store_sid", "stores.sid");

    if (eid) {
      query = query.where("user_eid", eid);
    } else if (sid) {
      query = query.where("store_sid", sid);
    } else {
      return res.status(400).json({ error: "eid or sid is required" });
    }

    const threads = await query.orderBy("updated_at", "desc");
    return res.json(threads);
  } catch (error) {
    logger.error("Error in getThreads:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getMessages = async (req, res) => {
  const { threadId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  try {
    const messages = await knex("chat_messages")
      .where("thread_id", threadId)
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    return res.json(messages.reverse());
  } catch (error) {
    logger.error("Error in getMessages:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const aiChatService = require("../services/aiChatService");
const notificationService = require("../services/notificationService");

const sendMessage = async (req, res) => {
  const { thread_id, sender_type, sender_id, message_type, content, metadata } = req.body;

  if (!thread_id || !sender_type || !sender_id || !content) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [message] = await knex("chat_messages")
      .insert({
        thread_id,
        sender_type,
        sender_id,
        message_type,
        content,
        metadata: metadata ? JSON.stringify(metadata) : "{}",
      })
      .returning("*");

    // Get thread info
    const thread = await knex("chat_threads").where("id", thread_id).first();

    // Update thread's last message
    await knex("chat_threads")
      .where("id", thread_id)
      .update({
        last_message: message_type === "text" ? content : `[${message_type}]`,
        updated_at: knex.fn.now(),
      });

    // Emit via Socket.io
    const io = req.app.get("socketio");
    if (io) {
      io.to(`thread_${thread_id}`).emit("new_message", message);
      io.to(`user_${thread.user_eid}`).emit("inbox_update", message);
      io.to(`store_${thread.store_sid}`).emit("inbox_update", message);
    }

    // --- PUSH NOTIFICATION ---
    const targetType = sender_type === 'user' ? 'store' : 'user';
    const targetId = sender_type === 'user' ? thread.store_sid : thread.user_eid;
    const notificationTitle = sender_type === 'user' ? 'Pesan Baru dari Pelanggan' : 'Pesan Baru dari Toko';
    
    notificationService.sendPushNotification(
      targetType,
      targetId,
      notificationTitle,
      message_type === 'text' ? content : `[${message_type}]`,
      { thread_id: thread_id.toString(), type: 'chat' }
    );

    // --- AI RESPONSE TRIGGER ---
    if (thread.is_ai_chat && sender_type === 'user') {
      // 1. Check if store is official concierge (SID 1000) or has Legend subscription
      let shouldRespond = thread.store_sid === 1000;
      
      if (!shouldRespond) {
        const store = await knex("stores").where("sid", thread.store_sid).first();
        if (store && store.subscription_status === 'legend') {
          shouldRespond = true;
        }
      }

      if (shouldRespond) {
        // Run AI logic in background
        (async () => {
          try {
            const aiResponse = await aiChatService.getAiResponse(thread_id, content, metadata);
            
            const [aiMsg] = await knex("chat_messages")
              .insert({
                thread_id,
                sender_type: 'ai',
                sender_id: 1000, 
                message_type: 'text',
                content: aiResponse.responseText,
                metadata: JSON.stringify(aiResponse.resultData || {}),
              })
              .returning("*");

            if (io) io.to(`thread_${thread_id}`).emit("new_message", aiMsg);
            
            // Notify User of AI Response
            notificationService.sendPushNotification(
              'user',
              thread.user_eid,
              'Digital Concierge',
              aiResponse.responseText,
              { thread_id: thread_id.toString(), type: 'ai_chat' }
            );

            // Update thread again for AI's last message
            await knex("chat_threads").where("id", thread_id).update({
              last_message: aiResponse.responseText,
              updated_at: knex.fn.now(),
            });
          } catch (aiErr) {
            logger.error("Failed to trigger AI response:", aiErr);
          }
        })();
      }
    }

    return res.json(message);
  } catch (error) {
    logger.error("Error in sendMessage:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const markAsRead = async (req, res) => {
  const { threadId, readerType } = req.body; // readerType = 'user' or 'store'

  if (!threadId || !readerType) {
    return res.status(400).json({ error: "threadId and readerType are required" });
  }

  try {
    // If the reader is 'user', mark messages sent by 'store' or 'ai' as read.
    // If the reader is 'store', mark messages sent by 'user' as read.
    const opposingTypes = readerType === 'user' ? ['store', 'ai'] : ['user'];

    await knex("chat_messages")
      .where({ thread_id: threadId, is_read: false })
      .whereIn("sender_type", opposingTypes)
      .update({ is_read: true });

    // Emit via Socket.io to trigger instant double-check receipt updates
    const io = req.app.get("socketio");
    if (io) {
      io.to(`thread_${threadId}`).emit("messages_read", { threadId, readerType });
    }

    return res.json({ status: true, message: "Messages marked as read." });
  } catch (error) {
    logger.error("Error in markAsRead:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getOrCreateThread,
  getThreads,
  getMessages,
  sendMessage,
  markAsRead,
};

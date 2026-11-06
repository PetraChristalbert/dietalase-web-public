const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");
const logger = require("../config/logger");

const serviceAccountPath = path.join(__dirname, "../service-account.json");
if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = require(serviceAccountPath);
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (err) {
    logger.warn("Failed to initialize Firebase Admin with service-account.json: " + err.message);
  }
} else {
  logger.warn("Firebase service-account.json not found. Push notifications will be disabled.");
}

const sendPushNotification = async (targetType, targetId, title, body, data = {}) => {
  try {
    const knex = require("../db/knex");
    
    // Find FCM token from database
    let token;
    if (targetType === 'user') {
      const user = await knex("etalovers").where("eid", targetId).first();
      token = user?.fcm_token;
    } else {
      const store = await knex("stores").where("sid", targetId).first();
      token = store?.fcm_token;
    }

    if (!token) {
      logger.info(`No FCM token found for ${targetType} ${targetId}, skipping push.`);
      return;
    }

    const message = {
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        click_action: "FLUTTER_NOTIFICATION_CLICK",
      },
      token: token,
    };

    const response = await admin.messaging().send(message);
    logger.info(`Successfully sent push notification to ${targetType} ${targetId}:`, response);
    return response;
  } catch (error) {
    logger.error(`Error sending push notification to ${targetType} ${targetId}:`, error);
  }
};

module.exports = {
  sendPushNotification,
};

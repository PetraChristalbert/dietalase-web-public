const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const knex = require('../db/db');
const logger = require('../config/logger');

const MAX_NEWS_ITEMS = 5;

exports.addNews = async (req, res) => {
  try {
    const { sid, text } = req.body;
    const file = req.file;

    if (!sid) {
      return res.status(400).json({ success: false, message: "Store ID (sid) is required." });
    }

    if (!file || !text) {
      return res.status(400).json({ success: false, message: "Image and text are required." });
    }

    // Verify Subscription Tier
    const store = await knex("stores").where({ sid: sid }).first();
    if (!store) {
      return res.status(404).json({ success: false, message: "Store not found." });
    }

    if (store.subscription_status === 'starter') {
      return res.status(403).json({ success: false, message: "Feature locked for starter tier." });
    }

    // Compress Image
    const compressedFilename = `${uuidv4()}.webp`;
    const outputPath = path.join(file.destination, compressedFilename);
    
    await sharp(file.path)
      .resize(800, null, { withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Remove the original uncompressed file uploaded by multer
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    const newImageUrl = `storage/Assets/Store_News/${compressedFilename}`;

    // Manage JSON array
    let newsFeed = store.news_feed;
    if (typeof newsFeed === 'string') {
        try { newsFeed = JSON.parse(newsFeed); } catch(e) { newsFeed = []; }
    }
    if (!Array.isArray(newsFeed)) {
      newsFeed = [];
    }

    // If max reached, delete the oldest physical file and remove it from array
    while (newsFeed.length >= MAX_NEWS_ITEMS) {
      const oldest = newsFeed.shift();
      if (oldest.image) {
        // e.g. "storage/Assets/Store_News/xxxx.webp"
        const relativePath = oldest.image.replace('storage/', '');
        const oldFilePath = path.join(__dirname, '..', 'storage', relativePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
    }

    // Add new item
    const newItem = {
      id: uuidv4(),
      text: text,
      image: newImageUrl,
      created_at: new Date().toISOString()
    };
    newsFeed.push(newItem);

    // Save to DB
    await knex("stores").where({ sid: sid }).update({
      news_feed: JSON.stringify(newsFeed)
    });

    res.json({ success: true, message: "News added successfully.", data: newItem });
  } catch (error) {
    logger.error("Error adding store news:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

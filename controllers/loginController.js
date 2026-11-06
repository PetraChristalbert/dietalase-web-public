const knex = require("../db/knex");
const logger = require("../config/logger");
const whatsappService = require("../services/whatsapp");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || 'dietalase_secret_key_2026';

// Helper function to generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000);
};

// Helper function to sanitize contact numbers end-to-end
const sanitizeInputNumber = (number) => {
  let formatted = number.toString().replace(/\D/g, ""); // Remove non-digits
  if (formatted.startsWith("08")) {
    formatted = "62" + formatted.slice(1);
  } else if (formatted.startsWith("8")) {
    formatted = "62" + formatted;
  }
  return formatted;
};

/*
 * Converts: getPendingLogins
 */
const getPendingLogins = async (req, res) => {
  try {
    const pending = await knex("login")
      .where("sent", "false")
      .select("contact", "code");
    return res.json(pending);
  } catch (error) {
    logger.error("Error fetching pending logins", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: markLoginSent
 */
const markLoginSent = async (req, res) => {
  const { contact } = req.body;
  if (!contact) {
    return res.status(400).json({ message: "Contact is required" });
  }

  const sanitizedContact = sanitizeInputNumber(contact);

  try {
    await knex("login").where("contact", sanitizedContact).update({ sent: "true" });
    return res.json({ success: true });
  } catch (error) {
    logger.error("Error marking login sent", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: loginRequest
 */
const loginRequest = async (req, res) => {
  const { contact } = req.body;
  if (!contact) {
    return res.status(400).json({ message: "Contact is required" });
  }

  const sanitizedContact = sanitizeInputNumber(contact);
  const otp = generateOtp();
  
  const message = `🔑 *DiEtalase - Masuk Akun* 🔑

Halo! Berikut adalah kode verifikasi OTP WhatsApp untuk masuk ke akun toko Anda:

📝 *KODE OTP:* *${otp}*

Gunakan kode ini untuk mengakses Dashboard Toko Anda di aplikasi DiEtalase.

⚠️ *PENTING:* Demi keamanan akun Anda, jangan pernah memberikan kode OTP ini kepada siapapun, termasuk pihak yang mengaku dari DiEtalase.

Terima kasih,
*Tim DiEtalase*`;

  try {
    // Send WhatsApp Message
    let sent = "false";
    try {
      await whatsappService.sendMessage(sanitizedContact, message);
      sent = "true";
    } catch (waError) {
      logger.error("Failed to send WhatsApp OTP", { error: waError.message });
      // Continue to save to DB even if sending fails, or handle as needed.
      // For now, we mark sent as false.
    }

    // We can use a transaction to be safe
    await knex.transaction(async (trx) => {
      await trx("login").where("contact", sanitizedContact).delete();
      await trx("login").insert({
        contact: sanitizedContact,
        code: otp,
        sent: sent,
        created_at: new Date(), // JS equivalent of now()
      });
    });
    return res.json({ status: "success", sent: sent === "true" });
  } catch (error) {
    logger.error("Error in loginRequest", { error: error.message });
    return res.status(500).json({ status: "error", message: error.message });
  }
};

/*
 * Converts: checkContactExists
 */
const checkContactExists = async (req, res) => {
  const { contact } = req.body;
  if (!contact) {
    return res.status(400).json({ message: "Contact is required" });
  }

  const sanitizedContact = sanitizeInputNumber(contact);

  try {
    // .first() is more efficient than .exists() in Knex
    const store = await knex("stores").where("contact", sanitizedContact).first();
    // !!store converts the result (or 'undefined') to a true/false boolean
    return res.json({ exists: !!store });
  } catch (error) {
    logger.error("Error in checkContactExists", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: verifyOTP
 */
const verifyOTP = async (req, res) => {
  const { contact, code } = req.body;
  if (!contact || !code) {
    return res.status(400).json({ message: "Contact and code are required" });
  }

  const sanitizedContact = sanitizeInputNumber(contact);

  try {
    const found = await knex("login")
      .where({
        contact: sanitizedContact,
        code: code,
      })
      .first();
    return res.json({ valid: !!found });
  } catch (error) {
    logger.error("Error in verifyOTP", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: loginVerify
 */
const loginVerify = async (req, res) => {
  const { contact, code, android_id } = req.body;
  if (!contact || !code || !android_id) {
    return res
      .status(400)
      .json({ message: "Contact, code, and android_id are required" });
  }

  const sanitizedContact = sanitizeInputNumber(contact);

  try {
    // 1) Check OTP
    const exists = await knex("login")
      .where({ contact: sanitizedContact, code: code })
      .first();

    if (!exists) {
      return res.json({ valid: false });
    }

    // 2 & 3) Use a transaction to update and fetch
    const store = await knex.transaction(async (trx) => {
      await trx("stores")
        .where("contact", sanitizedContact)
        .update({ android_id: android_id });

      // DB::raw('ST_Y(location)') becomes knex.raw(...)
      const storeData = await trx("stores")
        .select(
          "*",
          knex.raw("ST_Y(location) as latitude"),
          knex.raw("ST_X(location) as longitude")
        )
        .where("contact", sanitizedContact)
        .first();

      // unset($store->location) becomes delete store.location
      if (storeData) {
        delete storeData.location;
      }

      return storeData; // This commits the transaction and returns storeData
    });

    const token = jwt.sign(
      { sid: store.sid, contact: store.contact, role: 'store' },
      JWT_SECRET,
      { expiresIn: '30d' } 
    );

    return res.json({
      valid: true,
      store: store,
      token: token,
    });
  } catch (error) {
    // The transaction will automatically roll back on error
    logger.error("Error in loginVerify", { error: error.message });
    return res.status(500).json({ valid: false, message: error.message });
  }
};

// Export all the functions
module.exports = {
  getPendingLogins,
  markLoginSent,
  loginRequest,
  checkContactExists,
  verifyOTP,
  loginVerify,
};

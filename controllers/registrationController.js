const knex = require("../db/knex");
const logger = require("../config/logger");
const whatsappService = require("../services/whatsapp");

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
 * Converts: getPendingRegistrations
 */
const getPendingRegistrations = async (req, res) => {
  try {
    const pending = await knex("registration")
      .where("sent", "false")
      .select("contact", "code");
    return res.json(pending);
  } catch (error) {
    logger.error("Error fetching pending registrations", {
      error: error.message,
    });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: markRegistrationSent
 */
const markRegistrationSent = async (req, res) => {
  const { contact } = req.body;
  if (!contact) {
    return res.status(400).json({ message: "Contact is required" });
  }

  const sanitizedContact = sanitizeInputNumber(contact);

  try {
    await knex("registration")
      .where("contact", sanitizedContact)
      .update({ sent: "true" });
    return res.json({ success: true });
  } catch (error) {
    logger.error("Error marking registration sent", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: registerRequest
 */
const registerRequest = async (req, res) => {
  const { contact } = req.body;
  if (!contact) {
    return res.status(400).json({ message: "Contact is required" });
  }

  const sanitizedContact = sanitizeInputNumber(contact);
  const otp = generateOtp();
  
  const message = `🌿 *DiEtalase - Pendaftaran Toko* 🌿

Halo! Berikut adalah kode verifikasi OTP WhatsApp Anda:

📝 *KODE OTP:* *${otp}*

Gunakan kode ini untuk menyelesaikan pendaftaran toko Anda di platform DiEtalase. 

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
      logger.error("Failed to send WhatsApp OTP (Registration)", {
        error: waError.message,
      });
      // Continue to save to DB
    }

    // Use a transaction to safely delete old and insert new
    await knex.transaction(async (trx) => {
      await trx("registration").where("contact", sanitizedContact).delete();
      await trx("registration").insert({
        contact: sanitizedContact,
        code: otp,
        sent: sent,
        created_at: new Date(),
      });
    });
    return res.json({ status: "success", sent: sent === "true" });
  } catch (error) {
    logger.error("Error in registerRequest", { error: error.message });
    return res.status(500).json({ status: "error", message: error.message });
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
    const found = await knex("registration")
      .where({
        contact: sanitizedContact,
        code: code,
      })
      .first(); // .first() is more efficient

    // !!found converts the result (or undefined) to a true/false boolean
    return res.json({ valid: !!found });
  } catch (error) {
    logger.error("Error in verifyOTP", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: checkPendingStore
 */
const checkPendingStore = async (req, res) => {
  const { android_id } = req.body;
  if (!android_id) {
    return res.status(400).json({ message: "android_id is required" });
  }

  try {
    const found = await knex("pending_stores")
      .where("android_id", android_id)
      .first();
    return res.json({ pending: !!found });
  } catch (error) {
    logger.error("Error in checkPendingStore", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

// Export all the functions
module.exports = {
  getPendingRegistrations,
  markRegistrationSent,
  registerRequest,
  verifyOTP,
  checkPendingStore,
};

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const logger = require("../config/logger");

let sock = null;

/**
 * Sanitize phone number to WhatsApp format for Baileys
 * @param {string} number
 * @returns {string} formatted number
 */
const sanitizeNumber = (number) => {
  let formatted = number.toString().replace(/\D/g, ""); // Remove non-digits

  if (formatted.startsWith("08")) {
    formatted = "62" + formatted.slice(1);
  } else if (formatted.startsWith("8")) {
    formatted = "62" + formatted;
  }

  if (!formatted.endsWith("@s.whatsapp.net")) {
    formatted += "@s.whatsapp.net";
  }

  return formatted;
};

/**
 * Initialize WhatsApp connection and handle events
 */
const connectToWhatsApp = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // We print it ourselves using qrcode-terminal for small size
      logger: pino({ level: "silent" }), // Keep pino logs silent to avoid console clutter
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        logger.info("QR RECEIVED");
        console.log("\n==================================================");
        console.log("Scan this QR code with your WhatsApp to login:");
        qrcode.generate(qr, { small: true });
        console.log("==================================================\n");
      }

      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        logger.error("WhatsApp Connection closed due to error", { error: lastDisconnect?.error });
        console.log("WhatsApp Connection closed. Reconnecting...", shouldReconnect);
        if (shouldReconnect) {
          connectToWhatsApp();
        }
      } else if (connection === "open") {
        logger.info("WhatsApp Client (Baileys) is ready!");
        console.log("WhatsApp Client (Baileys) is ready!");
      }
    });
  } catch (err) {
    logger.error("Error in connectToWhatsApp", { error: err.message });
  }
};

/**
 * Send a message to a specific number
 * @param {string} number
 * @param {string} text
 * @returns {Promise<any>}
 */
const sendMessage = async (number, text) => {
  if (!sock) {
    throw new Error("WhatsApp client not initialized yet.");
  }
  try {
    const formattedNumber = sanitizeNumber(number);
    
    // Verify number exists on WhatsApp before sending
    const [result] = await sock.onWhatsApp(formattedNumber);
    if (!result || !result.exists) {
      throw new Error(`Number ${formattedNumber} is not registered on WhatsApp.`);
    }

    const response = await sock.sendMessage(result.jid, { text: text });
    logger.info(`Message sent to ${result.jid}`);
    return response;
  } catch (error) {
    logger.error("Error sending WhatsApp message via Baileys", {
      error: error.message,
      number,
    });
    throw error;
  }
};

module.exports = {
  client: {
    initialize: connectToWhatsApp,
  },
  sendMessage,
};

const knex = require("../db/knex");
const logger = require("../config/logger");
// Import our new Midtrans clients
const { snap, coreApi } = require("../config/midtrans");
const whatsappService = require("../services/whatsapp");

// Helper function to add days to a date (replaces Carbon::addDays)
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

/*
 * Converts: public function handleCallback(Request $request)
 */
const handleCallback = async (req, res) => {
  const notificationJson = req.body;

  try {
    // 1. Validate notification from Midtrans
    // This replaces `new Notification()` and checks the signature
    const statusResponse = await coreApi.transaction.notification(
      notificationJson
    );

    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const grossAmount = statusResponse.gross_amount;
    const transactionId = statusResponse.transaction_id;
    const orderPrefix = orderId.split("-")[0];

    logger.info(
      `Midtrans notification received for ${orderId}, status: ${transactionStatus}`
    );

    // [NEW] Check if already processed to avoid double triggers
    const isAlreadySettled = await knex("store_subscription_settlement").where("order_id", orderId).first() || 
                             await knex("chatgpt_order").where("order_id", orderId).first();
    
    if (isAlreadySettled) {
      logger.info(`Order ${orderId} already settled. Skipping callback logic.`);
      return res.json({ status: "ok", message: "Already processed" });
    }

    // 2. Handle 'settlement' (successful payment)
    if (transactionStatus === "settlement") {
      // [A] DiEtalase Store Subscription (ID: 88)
      if (orderPrefix === "88") {
        await knex.transaction(async (trx) => {
          const pending = await trx("store_subscription_pending")
            .where("order_id", orderId)
            .first();
          if (!pending) {
            logger.warn(`Pending store order not found: ${orderId}`);
            return;
          }

          // Transfer to settlement table
          await trx("store_subscription_settlement").insert({
            order_id: pending.order_id,
            sid: pending.sid,
            product: pending.product,
            subscription_type: pending.subscription_type,
            price: pending.price,
            transaction_id: transactionId,
            settled_at: new Date(),
            subscription_end: addDays(new Date(), 30), // 30-day subscription
          });

          // Check and update store's subscription
          const store = await trx("stores").where("sid", pending.sid).first();
          if (
            store &&
            Number(store.subscription) !== Number(pending.subscription_type)
          ) {
            await trx("stores")
              .where("sid", pending.sid)
              .update({ subscription: pending.subscription_type });
          } else if (store) {
            logger.info(
              `Store ${pending.sid} already has subscription type ${pending.subscription_type}, no update needed.`
            );
          }

          // [NEW] WhatsApp for Merchant
          const merchantMsg = `
✨ *PEMBAYARAN BERHASIL* ✨

Halo, Artisan! Pembayaran untuk paket *${pending.product}* telah kami terima.
Status toko Anda kini telah diperbarui ke *Tier ${pending.subscription_type}*.

Silakan cek Dashboard Admin Anda untuk melihat fitur-fitur baru yang telah terbuka.

Terima kasih telah berkarya bersama DiEtalase! 🏺
          `;
          try {
            const storePhone = store.phone || store.contact;
            if (storePhone) {
              await whatsappService.sendMessage(storePhone, merchantMsg.trim());
            }
          } catch (waError) {
            logger.warn("Failed to notify merchant via WhatsApp", { error: waError.message });
          }

          // Remove from pending
          await trx("store_subscription_pending")
            .where("order_id", orderId)
            .delete();
          logger.info(
            `Store subscription settled: order_id=${orderId}, sid=${pending.sid}`
          );
        });
      }

      // [B] ChatGPT Personal Subscription (ID: 125)
      else if (orderPrefix === "125") {
        await knex.transaction(async (trx) => {
          const pending = await trx("chatgpt_pending")
            .where("order_id", orderId)
            .first();
          if (!pending) {
            logger.warn(`Pending order not found for order_id: ${orderId}`);
            return;
          }

          // Transfer to chatgpt_order
          await trx("chatgpt_order").insert({
            order_id: pending.order_id,
            variant: pending.variant,
            price: pending.price,
            status: "Progress",
            phone_number: pending.phone_number,
            email_address: pending.email_address,
            order_date: new Date(),
            referral_code: pending.referral_code,
            referral_paid: pending.referral_paid,
          });

          // Remove from chatgpt_pending
          await trx("chatgpt_pending").where("order_id", orderId).delete();

          // Prepare WhatsApp message
          const message = `
📦 [DiEtalase]

Terima kasih! Pembayaran Anda untuk *ChatGPT Personal Subscription* telah berhasil kami terima. ✅

📍Status: *Sedang diproses*
⏳ Estimasi aktivasi: Maks. 1x24 jam

Jika dalam waktu tersebut akun belum aktif, silakan hubungi kami via WhatsApp ini atau support@dietalase.com.

Terima kasih telah mempercayai DiEtalase! 🙌
          `;

          // Send WhatsApp message directly
          try {
            await whatsappService.sendMessage(
              pending.phone_number,
              message.trim()
            );
          } catch (waError) {
            logger.error("Failed to send WhatsApp confirmation", {
              error: waError.message,
            });
          }

          // Insert WhatsApp message
          await trx("whatsapp_messages").insert({
            phone_number: pending.phone_number,
            message: message.trim(),
            scheduled_at: new Date(),
            sent: true,
            sent_at: new Date(),
          });

          logger.info(
            `Order ${orderId} migrated from chatgpt_pending to chatgpt_order.`
          );
        });
      }

      // [C] ChatGPT Business Subscription (ID: 126)
      else if (orderPrefix === "126") {
        await knex.transaction(async (trx) => {
          const pending = await trx("chatgpt_pending")
            .where("order_id", orderId)
            .first();
          if (!pending) {
            logger.warn(
              `Pending business order not found for order_id: ${orderId}`
            );
            return;
          }

          // Transfer to chatgpt_order
          await trx("chatgpt_order").insert({
            order_id: pending.order_id,
            variant: pending.variant,
            price: pending.price,
            status: "Progress",
            phone_number: pending.phone_number,
            email_address: pending.email_address,
            order_date: new Date(),
            referral_code: pending.referral_code,
            referral_paid: pending.referral_paid,
          });

          // Remove from chatgpt_pending
          await trx("chatgpt_pending").where("order_id", orderId).delete();

          // WhatsApp confirmation message
          const message = `
📦 [DiEtalase]

Terima kasih! Pembayaran Anda untuk *ChatGPT Business Subscription* telah berhasil kami terima. ✅

📍Status: *Sedang diproses*
⏳ Estimasi aktivasi: Maks. 1x24 jam

Jika dalam waktu tersebut akun belum aktif, silakan hubungi kami via WhatsApp ini atau support@dietalase.com.

Terima kasih telah mempercayai DiEtalase! 🙌
          `;

          // Send WhatsApp message directly
          try {
            await whatsappService.sendMessage(
              pending.phone_number,
              message.trim()
            );
          } catch (waError) {
            logger.error("Failed to send WhatsApp confirmation", {
              error: waError.message,
            });
          }

          await trx("whatsapp_messages").insert({
            phone_number: pending.phone_number,
            message: message.trim(),
            scheduled_at: new Date(),
            sent: true,
            sent_at: new Date(),
          });

          logger.info(
            `Order ${orderId} migrated from chatgpt_pending to chatgpt_order (Business).`
          );
        });
      }
    }
    // 3. Handle other statuses
    else if (transactionStatus === "pending") {
      logger.info(`Order ${orderId} is pending.`);
      // Mark order as pending (if needed)
    } else if (["deny", "expire", "cancel"].includes(transactionStatus)) {
      logger.info(`Order ${orderId} failed with status: ${transactionStatus}`);
      
      // [NEW] Update pending tables to FAILED status
      await knex("store_subscription_pending").where("order_id", orderId).update({ status: "Failed" });
      await knex("chatgpt_pending").where("order_id", orderId).update({ status: "Failed" });
    }

    // 4. Acknowledge the notification
    res.json({ status: "ok" });
  } catch (error) {
    logger.error("Midtrans callback error:", {
      error: error.message,
      body: notificationJson,
    });
    res.status(500).json({ status: "error", message: error.message });
  }
};

/*
 * Converts: public function startPayment(Request $request)
 * (Business Subscription)
 */
const startPayment = async (req, res) => {
  const { email, phone, referral_code: referral = 0 } = req.body;
  const orderId = `126-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const params = {
    transaction_details: {
      order_id: orderId,
      gross_amount: 250000,
    },
    customer_details: {
      first_name: "Customer",
      email: email,
      phone: phone,
    },
    item_details: [
      {
        id: "126",
        price: 250000,
        quantity: 1,
        name: "ChatGPT Business Subscription (1 Bulan / 5 Akun)",
      },
    ],
    custom_fields: {
      referral_code: referral,
    },
  };

  try {
    // 1. Create Midtrans transaction
    const transaction = await snap.createTransaction(params);

    // 2. Insert into chatgpt_pending
    await knex("chatgpt_pending").insert({
      order_id: orderId,
      variant: "ChatGPT Business Team",
      price: 250000,
      status: "Pending",
      phone_number: phone,
      email_address: email,
      order_date: new Date(),
      referral_code: referral,
      referral_paid: "No",
    });

    // 3. Send back the redirect URL
    res.json({ redirect_url: transaction.redirect_url });
  } catch (error) {
    logger.error("Midtrans Snap Error (startPayment):", {
      error: error.message,
    });
    res
      .status(500)
      .json({ error: "Failed to create payment: " + error.message });
  }
};

/*
 * Converts: public function registerReferral(Request $request)
 */
const registerReferral = async (req, res) => {
  const { phone_number, payment_method } = req.body;
  // Clean the phone number
  const phone = String(phone_number).replace(/[^\d+]/g, "");

  if (!phone || !payment_method) {
    return res.status(400).json({ error: "Invalid input" });
  }

  try {
    const existing = await knex("chatgpt_referral")
      .where("phone_number", phone)
      .first();

    if (existing) {
      // Update payment method if changed
      if (existing.payment_method !== payment_method) {
        await knex("chatgpt_referral")
          .where("id", existing.id)
          .update({ payment_method: payment_method });
      }
      return res.json({ id: existing.id });
    }

    // New insert
    const [id] = await knex("chatgpt_referral").insert({
      payment_method: payment_method,
      phone_number: phone,
    });

    res.json({ id: id });
  } catch (error) {
    logger.error("Referral registration error:", { error: error.message });
    res.status(500).json({ error: "Database error" });
  }
};

/*
 * Converts: public function personalPayment(Request $request)
 */
const personalPayment = async (req, res) => {
  const { email, phone, referral_code: referral = 0 } = req.body;

  // *** FIXING A BUG ***
  // Your original PHP code used '126-' here, which is for Business.
  // I have corrected it to '125-' to match the Personal Subscription item.
  const orderId = `125-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const params = {
    transaction_details: {
      order_id: orderId,
      gross_amount: 50000,
    },
    customer_details: {
      first_name: "Customer",
      email: email,
      phone: phone,
    },
    item_details: [
      {
        id: "125",
        price: 50000,
        quantity: 1,
        name: "ChatGPT Personal Subscription (1 Bulan / 1 Akun)",
      },
    ],
    custom_fields: {
      referral_code: referral,
    },
  };

  try {
    // 1. Create transaction
    const transaction = await snap.createTransaction(params);

    // 2. Insert into pending
    await knex("chatgpt_pending").insert({
      order_id: orderId,
      variant: "ChatGPT Personal Team", // This was 'Personal Team' in your PHP
      price: 50000,
      status: "Pending",
      phone_number: phone,
      email_address: email,
      order_date: new Date(),
      referral_code: referral,
      referral_paid: "No",
    });

    // 3. Send back redirect URL
    res.json({ redirect_url: transaction.redirect_url });
  } catch (error) {
    logger.error("Midtrans Snap Error (personalPayment):", {
      error: error.message,
    });
    res
      .status(500)
      .json({ error: "Failed to create payment: " + error.message });
  }
};

/*
 * Converts: public function createStoreSubscriptionPayment(Request $request)
 */
const createStoreSubscriptionPayment = async (req, res) => {
  const { sid, product, price } = req.body;
  const productName = String(product).toLowerCase();

  // Map product to subscription type (replaces `match` statement)
  const subscriptionMap = {
    pedagang: 1,
    pengusaha: 2,
    pebisnis: 3,
    enterpreneur: 4,
  };
  const subscriptionType = subscriptionMap[productName] || 0;

  if (subscriptionType === 0) {
    return res.status(400).json({ error: "Invalid product" });
  }

  const orderId = `88-${sid}-${productName}-${Date.now()}`;

  const params = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Number(price),
    },
    item_details: [
      {
        id: "88",
        price: Number(price),
        quantity: 1,
        name: `DiEtalase Store Subscription ${productName}`,
      },
    ],
    expiry: {
      unit: "days",
      duration: 1,
    },
  };

  try {
    // 1. Create transaction
    const transaction = await snap.createTransaction(params);

    // 2. Insert into pending
    await knex("store_subscription_pending").insert({
      order_id: orderId,
      sid: sid,
      product: productName,
      subscription_type: subscriptionType,
      price: Number(price),
      status: "Pending",
    });

    // 3. Send back payment link
    res.json({ 
      payment_link: transaction.redirect_url,
      order_id: orderId 
    });
  } catch (error) {
    logger.error("Midtrans Store Subscription Snap Error:", {
      error: error.message,
    });
    res.status(500).json({ error: "Failed to create payment link" });
  }
};

/*
 * [NEW] Real-time Status Check (Fallback/Manual Sync)
 */
const checkStatus = async (req, res) => {
  const { orderId } = req.params;
  try {
    const status = await coreApi.transaction.status(orderId);
    
    // If settled but not updated in DB, trigger the callback logic manually
    if (status.transaction_status === "settlement") {
      // Re-use the callback logic by mocking req.body
      await handleCallback({ body: status }, { json: () => {} });
    }

    return res.json({
      status: status.transaction_status,
      order_id: status.order_id,
      gross_amount: status.gross_amount,
    });
  } catch (error) {
    logger.error("Error checking Midtrans status:", { error: error.message, orderId });
    return res.status(500).json({ error: "Failed to fetch transaction status" });
  }
};

// Export all functions
module.exports = {
  handleCallback,
  checkStatus,
  startPayment,
  registerReferral,
  personalPayment,
  createStoreSubscriptionPayment,
};

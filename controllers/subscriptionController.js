const knex = require("../db/knex");
const logger = require("../config/logger");

/**
 * [NEW] Mendapatkan status langganan toko saat ini.
 */
const getSubscriptionStatus = async (req, res) => {
    const { sid } = req.params;
    
    try {
        const store = await knex("stores")
            .select("subscription_status", "current_subscription_id")
            .where("sid", sid)
            .first();
            
        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }
        
        let details = null;
        if (store.current_subscription_id) {
            details = await knex("store_subscriptions")
                .where("sub_id", store.current_subscription_id)
                .first();
        }
        
        return res.json({
            tier: store.subscription_status,
            details: details
        });
    } catch (error) {
        logger.error("Error in getSubscriptionStatus", { error: error.message });
        return res.status(500).json({ error: "Internal server error" });
    }
};

/**
 * [REWORKED] Upgrade atau Perpanjang tier langganan.
 * Logic:
 * - Jika tier SAMA: Tambahkan durasi (stacking).
 * - Jika tier BERBEDA: Ganti dengan tier baru (replace) dan reset durasi.
 */
const upgradeSubscription = async (req, res) => {
    const { sid, tier, price_paid, midtrans_order_id } = req.body;
    
    const validTiers = {
        'starter': { days: 90 },
        'pro': { days: 180 },
        'legend': { days: 180 }
    };

    if (!validTiers[tier]) {
        return res.status(400).json({ error: "Invalid tier" });
    }
    
    try {
        await knex.transaction(async (trx) => {
            // 1. Ambil data toko saat ini
            const store = await trx("stores")
                .select("subscription_status", "subscription_expires_at")
                .where("sid", sid)
                .first();

            if (!store) throw new Error("Store not found");

            let newExpiry;
            const now = new Date();
            const daysToAdd = validTiers[tier].days;

            // 2. Logic Stacking vs Replacing
            if (store.subscription_status === tier && store.subscription_expires_at) {
                // TIER SAMA: Cek apakah sudah expired atau belum
                const currentExpiry = new Date(store.subscription_expires_at);
                const baseDate = currentExpiry > now ? currentExpiry : now;
                newExpiry = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
                logger.info(`[SUBS] Stacking: Store ${sid} extending ${tier} by ${daysToAdd} days.`);
            } else {
                // TIER BERBEDA atau Baru: Reset dari hari ini
                newExpiry = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
                logger.info(`[SUBS] Replacing: Store ${sid} switching to ${tier} for ${daysToAdd} days.`);
            }

            // 3. Masukkan data langganan ke history
            const [newSub] = await trx("store_subscriptions")
                .insert({
                    sid,
                    tier,
                    price_paid,
                    expires_at: newExpiry,
                    midtrans_order_id,
                    status: 'active'
                })
                .returning("sub_id");
            
            // 4. Update status di tabel stores
            await trx("stores").where("sid", sid).update({
                subscription_status: tier,
                current_subscription_id: newSub.sub_id,
                subscription_expires_at: newExpiry
            });
            
            // 5. Tandai langganan lama lainnya sebagai expired
            await trx("store_subscriptions")
                .where("sid", sid)
                .where("status", "active")
                .whereNot("sub_id", newSub.sub_id)
                .update({ status: 'expired' });
        });
        
        return res.json({
            status: true,
            message: `Successfully processed ${tier} subscription.`,
            expires_at: (await knex("stores").where("sid", sid).select("subscription_expires_at").first()).subscription_expires_at
        });
    } catch (error) {
        logger.error("Error in upgradeSubscription", { error: error.message });
        return res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    getSubscriptionStatus,
    upgradeSubscription
};

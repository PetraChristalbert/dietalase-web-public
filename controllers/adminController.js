const knex = require("../db/knex");
const logger = require("../config/logger");
const { verifyAndEnhanceStore } = require("./storeAdminController");
const moderationService = require("../services/moderationService");
const adminSecurity = require("../services/adminSecurity");
const whatsappService = require("../services/whatsapp");

// --- Helper ---
const getClientIp = (req) => {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "";
    if (ip.includes(",")) {
        ip = ip.split(",")[0].trim();
    }
    if (ip.startsWith("::ffff:")) {
        ip = ip.substring(7);
    }
    return ip;
};

// --- Middleware ---
const isAuthenticated = (req, res, next) => {
    if (req.session.isAdmin) {
        return next();
    }
    res.redirect("/admin/login");
};

// --- Auth Handlers ---

const getLoginPage = (req, res) => {
    res.render("admin_login", { error: null });
};

const handleLogin = async (req, res) => {
    const { username, password } = req.body;
    const ip = getClientIp(req);
    
    let telemetry = {};
    try {
        telemetry = req.body.telemetry ? JSON.parse(req.body.telemetry) : {};
    } catch (_) {}

    const hostUrl = req.protocol + "://" + req.get("host");

    if (username === "admin" && password === "atelier2026") {
        // Correct credentials -> Reset failed counters and generate WhatsApp OTP
        adminSecurity.resetFailedAttempts(ip);
        
        if (process.env.APP_ENV === 'testing') {
            req.session.isAdmin = true;
            logger.info("Admin login 2FA bypassed due to testing environment.");
            return res.redirect("/admin/dashboard");
        }
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        req.session.pendingAdminAuth = true;
        req.session.pendingAdminOtp = otp;
        req.session.pendingAdminOtpExpires = Date.now() + 5 * 60 * 1000; // 5 mins
        req.session.pendingTelemetry = telemetry;

        // Dispatch 2FA code via WhatsApp
        const adminPhone = "6283138596780";
        const timeStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        const message = `🔑 *VERIFIKASI MASUK ADMIN DIETALASE* 🔑

Halo Admin! Seseorang mencoba masuk ke Dashboard Admin DiEtalase.

📝 *KODE OTP ANDA:* *${otp}*
• Waktu Percobaan: *${timeStr}*

Kode ini berlaku selama 5 menit. Harap jangan memberikan kode ini kepada siapapun demi melindungi integritas server.

Terima kasih,
*Sistem Keamanan DiEtalase*`;

        try {
            await whatsappService.sendMessage(adminPhone, message);
            logger.info("Admin 2FA OTP dispatched successfully via WhatsApp.");
        } catch (waErr) {
            logger.error("Failed to send Admin 2FA WhatsApp message", { error: waErr.message });
        }

        return res.redirect("/admin/verify-2fa");
    }

    // Invalid Credentials -> Increment failures & check block
    const blocked = await adminSecurity.recordFailedAttempt(ip, telemetry, hostUrl);
    if (blocked) {
        return res.redirect("/admin/login"); // Lockout middleware will instantly catch them on reload!
    }

    res.render("admin_login", { error: "Invalid credentials. Access denied." });
};

const get2faPage = (req, res) => {
    if (!req.session.pendingAdminAuth) {
        return res.redirect("/admin/login");
    }
    res.render("admin_2fa", { error: null });
};

const handle2fa = async (req, res) => {
    const { otp_code } = req.body;
    const ip = getClientIp(req);
    const hostUrl = req.protocol + "://" + req.get("host");

    if (!req.session.pendingAdminAuth) {
        return res.redirect("/admin/login");
    }

    const now = Date.now();
    if (req.session.pendingAdminOtp === otp_code && req.session.pendingAdminOtpExpires > now) {
        // Authenticated!
        req.session.isAdmin = true;
        
        // Clear pending states
        delete req.session.pendingAdminAuth;
        delete req.session.pendingAdminOtp;
        delete req.session.pendingAdminOtpExpires;
        delete req.session.pendingTelemetry;

        adminSecurity.resetFailedAttempts(ip);
        logger.info(`Admin successfully authenticated from IP: ${ip}`);
        return res.redirect("/admin/dashboard");
    }

    // Invalid OTP -> Count as failed attempt
    const telemetry = req.session.pendingTelemetry || {};
    const blocked = await adminSecurity.recordFailedAttempt(ip, telemetry, hostUrl);
    
    if (blocked) {
        delete req.session.pendingAdminAuth;
        delete req.session.pendingAdminOtp;
        delete req.session.pendingAdminOtpExpires;
        delete req.session.pendingTelemetry;
        return res.redirect("/admin/login"); // Redirect so lockout intercepts!
    }

    res.render("admin_2fa", { 
        error: "Kode OTP tidak valid atau telah kadaluarsa. Sisa percobaan sebelum diblokir: " + 
               (3 - (adminSecurity.loadVault().temporary_blocks[ip]?.attempts || 0)) 
    });
};

const getBanPage = (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send("Token tidak valid.");
    }

    const vault = adminSecurity.loadVault();
    const record = vault.secret_tokens[token];

    if (!record || record.expiresAt <= Date.now()) {
        return res.status(400).send("Tautan banish tidak valid atau telah kedaluwarsa.");
    }

    const timeStr = new Date(record.metadata.timestamp).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    res.render("admin_ban", {
        ip: record.ip,
        location: record.metadata.location || "Tidak Terdeteksi",
        os: record.metadata.os || "Tidak Terdeteksi",
        browser: record.metadata.browser || "Tidak Terdeteksi",
        screen: record.metadata.screen || "Tidak Terdeteksi",
        time: timeStr,
        token: token
    });
};

const handleBan = (req, res) => {
    const { token, ip } = req.body;
    if (!token || !ip) {
        return res.status(400).send("Parameter tidak lengkap.");
    }

    const vault = adminSecurity.loadVault();
    const record = vault.secret_tokens[token];

    if (!record || record.ip !== ip) {
        return res.status(400).send("Validasi token banish gagal.");
    }

    // Permanently ban IP
    adminSecurity.banIpPermanently(ip);

    // Delete utilized secret token
    delete vault.secret_tokens[token];
    adminSecurity.saveVault(vault);

    res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Banishment Sukses</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
        </head>
        <body class="h-screen bg-black text-white font-['Outfit'] flex items-center justify-center p-6 text-center">
            <div class="max-w-md w-full border border-red-500/20 bg-neutral-900/60 p-10 rounded-[35px] shadow-2xl">
                <div class="w-16 h-16 bg-red-950/40 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg class="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>
                </div>
                <h1 class="text-2xl font-black text-white">Banishment Berhasil</h1>
                <p class="text-sm text-neutral-400 mt-4 leading-relaxed font-light">IP <span class="font-mono text-red-400 font-bold">${ip}</span> telah diblokir permanen dari semua akses portal administrasi DiEtalase.</p>
                <a href="/admin/login" class="inline-block mt-8 px-8 py-3.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all">Kembali Ke Login</a>
            </div>
        </body>
        </html>
    `);
};

const handleLogout = (req, res) => {
    req.session.destroy();
    res.redirect("/admin/login");
};

const os = require('os');
const { execSync } = require('child_process');

// --- Dashboard Handlers ---

const getDashboardPage = async (req, res) => {
    try {
        // 1. Fetch Metrics
        const totalStores = await knex("stores").count("sid as count").first();
        const pendingStores = await knex("stores").where("status", "pending").count("sid as count").first();
        const totalProducts = await knex("products").count("pid as count").first();
        const dailyVisits = await knex("raw_visits")
            .where("created_at", ">=", knex.raw("NOW() - INTERVAL '24 hours'"))
            .count("vid as count").first();
        
        // New Metric: Active Subscriptions
        const activeSubs = await knex("store_subscription_settlement").count("* as count").first();
        
        // New Metric: Storage Health
        let storageHealth = "Healthy";
        let storageUsedPct = 10;
        try {
            const dfFree = execSync("df -h / | tail -1 | awk '{print $4}'").toString().trim();
            const dfPct = execSync("df -h / | tail -1 | awk '{print $5}'").toString().trim().replace('%', '');
            storageHealth = `${dfFree} Free Space`;
            storageUsedPct = parseInt(dfPct) || 10;
        } catch (e) {
            storageHealth = `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB Free RAM`;
        }

        // 2. Fetch Live Platform Activity Feed
        const recentStores = await knex("stores").select("name", "created_at", "status").orderBy("created_at", "desc").limit(4);
        const recentProducts = await knex("products").select("name", "created_at", "status").orderBy("created_at", "desc").limit(4);
        
        const notifications = [];
        recentStores.forEach(s => {
            notifications.push({
                type: "store",
                message: `Store updated/registered: ${s.name}`,
                time: s.created_at,
                priority: s.status === 'pending' ? 'high' : 'low',
                link: "/admin/verification"
            });
        });
        recentProducts.forEach(p => {
            notifications.push({
                type: "product",
                message: `Product activity: ${p.name}`,
                time: p.created_at,
                priority: p.status === 'on-review' ? 'medium' : 'low',
                link: "/admin/products"
            });
        });
        
        // Sort by time descending
        notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

        res.render("admin_dashboard", {
            title: "Atelier Command Center",
            metrics: {
                totalStores: totalStores.count,
                pendingStores: pendingStores.count,
                totalProducts: totalProducts.count,
                dailyVisits: dailyVisits.count,
                activeSubs: activeSubs.count,
                storageHealth: storageHealth,
                storageUsedPct: storageUsedPct
            },
            notifications: notifications.slice(0, 6),
            user: { name: "Principal Curator" }
        });
    } catch (error) {
        logger.error("Error loading dashboard", { error: error.message });
        res.status(500).render("error", { message: "Critical failure in Command Center.", error: error });
    }
};

/**
 * GET /admin/products
 * Displays the recent products for moderation.
 */
const getProductsPage = async (req, res) => {
    try {
        const products = await knex("products")
            .join("stores", "products.sid", "stores.sid")
            .select("products.*", "stores.name as store_name")
            .orderBy("products.created_at", "desc")
            .limit(100);

        res.render("admin_products", {
            products: products,
            title: "Product Watch"
        });
    } catch (error) {
        logger.error("Error loading product moderation page", { error: error.message });
        res.status(500).render("error", { message: "Failed to load product watch.", error: error });
    }
};

/**
 * POST /admin/products/toggle/:pid
 * Toggles a product's active status.
 */
const toggleProductStatus = async (req, res) => {
    const { pid } = req.params;
    const { action, curator_note } = req.body;
    
    try {
        const product = await knex("products").where("pid", pid).first();
        if (!product) return res.status(404).json({ success: false, message: "Product not found." });

        let updateData = {};
        let newStatus = product.status;
        
        if (action === 'approve') {
            newStatus = 'approved';
            updateData.status = 'approved';
        } else if (action === 'reject') {
            newStatus = 'rejected';
            updateData.status = 'rejected';
            if (curator_note !== undefined) {
                updateData.curator_note = curator_note;
            }
        } else {
            newStatus = product.status === 'approved' ? 'rejected' : 'approved';
            updateData.status = newStatus;
        }

        await knex("products").where("pid", pid).update(updateData);
        res.json({ success: true, new_status: newStatus });
    } catch (error) {
        logger.error("Error toggling product status", { error: error.message });
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

/**
 * POST /admin/products/run-triage
 * Triggers the batch moderation service.
 */
const runTriage = async (req, res) => {
    try {
        const result = await moderationService.runBatchModeration();
        res.json({ success: true, message: `Processed ${result.processed} items.` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /admin/transactions
 * Centralized purchase monitoring.
 */
const getTransactionsPage = async (req, res) => {
    try {
        // 1. Fetch Store Subscriptions
        const storeSubs = await knex("store_subscription_settlement")
            .join("stores", "store_subscription_settlement.sid", "stores.sid")
            .select(
                "store_subscription_settlement.*",
                "stores.name as store_name",
                knex.raw("'Store' as type")
            );

        // 2. Fetch ChatGPT Subscriptions
        const chatgptSubs = await knex("chatgpt_order")
            .select(
                "*",
                knex.raw("'ChatGPT' as type"),
                knex.raw("null as store_name")
            );

        // 3. Merge and Sort
        const allTransactions = [...storeSubs, ...chatgptSubs]
            .sort((a, b) => new Date(b.settled_at || b.order_date) - new Date(a.settled_at || a.order_date));

        res.render("admin_transactions", {
            transactions: allTransactions,
            title: "Treasury Watch"
        });
    } catch (error) {
        logger.error("Error loading transactions page", { error: error.message });
        res.status(500).render("error", { message: "Failed to load treasury pulse.", error: error });
    }
};

/**
 * GET /admin/settings
 * Displays the system settings page.
 */
const getSettingsPage = async (req, res) => {
    try {
        const rows = await knex("system_settings").select("*");
        const settings = {};
        rows.forEach(r => settings[r.key] = r.value);

        res.render("admin_settings", {
            title: "System Settings",
            settings: settings
        });
    } catch (error) {
        logger.error("Error loading settings page", { error: error.message });
        res.status(500).render("error", { message: "Failed to load settings.", error: error });
    }
};

/**
 * POST /admin/settings/update
 * Updates system settings.
 */
const updateSettings = async (req, res) => {
    const updates = req.body; // { key: value }
    try {
        const promises = Object.entries(updates).map(([key, value]) => {
            return knex("system_settings")
                .where("key", key)
                .update({ 
                    value: value.toString(),
                    updated_at: knex.fn.now()
                });
        });

        await Promise.all(promises);
        res.json({ success: true });
    } catch (error) {
        logger.error("Error updating settings", { error: error.message });
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

/**
 * GET /admin/api/products
 * API for lazy-loading admin products with search and date filters
 */
const getProductsApi = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const date = req.query.date || '';

        let query = knex("products")
            .join("stores", "products.sid", "stores.sid")
            .select("products.*", "stores.name as store_name", "stores.type as store_type", "stores.address as store_address", "stores.image as store_image");

        if (search) {
            query = query.where(builder => {
                builder.where('products.name', 'ilike', `%${search}%`)
                       .orWhere('stores.name', 'ilike', `%${search}%`);
            });
        }

        if (date) {
            query = query.whereRaw('DATE(products.created_at) = ?', [date]);
        }

        const products = await query.orderBy("products.created_at", "desc").limit(limit).offset(offset);
        
        res.json({ products });
    } catch (error) {
        logger.error("Error loading products api", { error: error.message });
        res.status(500).json({ error: "Failed to fetch products" });
    }
};

module.exports = {
    isAuthenticated,
    getLoginPage,
    handleLogin,
    handleLogout,
    getDashboardPage,
    getProductsPage,
    getProductsApi,
    toggleProductStatus,
    runTriage,
    getTransactionsPage,
    getSettingsPage,
    updateSettings,
    get2faPage,
    handle2fa,
    getBanPage,
    handleBan
};

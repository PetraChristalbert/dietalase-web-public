const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const storeAdminController = require("../controllers/storeAdminController");
const reportController = require("../controllers/reportController");
const adminSecurity = require("../services/adminSecurity");
const { isAuthenticated } = adminController;

// Helper to extract client IP
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

// Global IP Lockout & Permanent Ban Verification Middleware
const checkIpSecurity = (req, res, next) => {
    // Skip checking for the secret token ban page, logs, or logout
    if (req.path.startsWith("/secure/ban-visitor") || req.path === "/logout") {
        return next();
    }

    const ip = getClientIp(req);
    const status = adminSecurity.isIpBannedOrBlocked(ip);

    if (status.banned) {
        return res.status(403).render("admin_lockout", {
            status: "banned",
            message: "Akses Ditolak Permanen",
            description: "Alamat IP Anda telah diblokir secara permanen dari sistem administrasi DiEtalase karena aktivitas yang mencurigakan.",
            timeLeft: 0
        });
    }

    if (status.blocked) {
        return res.status(403).render("admin_lockout", {
            status: "blocked",
            message: "Akses Ditangguhkan Sementara",
            description: "IP Anda diblokir sementara karena terlalu banyak melakukan percobaan masuk yang salah (Sandi/OTP). Silakan tunggu hingga hitung mundur selesai.",
            timeLeft: status.timeLeftSeconds
        });
    }

    next();
};

// Bind security checks globally across all admin routes
router.use(checkIpSecurity);

// --- Public Auth Routes ---
router.get("/", (req, res) => res.redirect("/admin/dashboard"));
router.get("/login", adminController.getLoginPage);
router.post("/login", adminController.handleLogin);
router.get("/logout", adminController.handleLogout);

// --- Public 2FA Verification Routes ---
router.get("/verify-2fa", adminController.get2faPage);
router.post("/verify-2fa", adminController.handle2fa);

// --- Hidden Threat Mitigation (Banishment) Routes ---
router.get("/secure/ban-visitor", adminController.getBanPage);
router.post("/secure/ban-visitor", adminController.handleBan);

// --- Protected Dashboard Routes ---
router.get("/dashboard", isAuthenticated, adminController.getDashboardPage);
router.get("/products", isAuthenticated, adminController.getProductsPage);
router.get("/api/products", isAuthenticated, adminController.getProductsApi);
router.post("/products/toggle/:pid", isAuthenticated, adminController.toggleProductStatus);
router.post("/products/run-triage", isAuthenticated, adminController.runTriage);
router.get("/transactions", adminController.getTransactionsPage);
router.get("/settings", adminController.getSettingsPage);
router.post("/settings/update", adminController.updateSettings);

// Report Management
router.get("/reports", isAuthenticated, reportController.getReportsPage);
router.post("/reports/resolve/:rid", isAuthenticated, reportController.resolveReport);

// --- BACKUP & RESTORE MANAGEMENT ---
const knex = require("../db/knex");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const restoreJob = require("../jobs/restore");

const upload = multer({ dest: path.join(__dirname, "..", "tmp_uploads") });

const { Storage } = require('@google-cloud/storage');
const BUCKET_NAME = process.env.GCS_BACKUP_BUCKET || 'dietalase-backups-bucket';
const KEY_PATH = path.join(__dirname, '..', 'secure_vault', 'gcs-backup-key.json');
let storage, bucket;
if (fs.existsSync(KEY_PATH)) {
    storage = new Storage({ keyFilename: KEY_PATH });
    bucket = storage.bucket(BUCKET_NAME);
}

router.get("/backups", isAuthenticated, async (req, res) => {
    try {
        const hasTable = await knex.schema.hasTable('system_backups');
        let history = [];
        if (hasTable) {
            history = await knex("system_backups").orderBy("created_at", "desc").limit(50);
        }
        
        // Fetch local files
        const backupDir = path.join(__dirname, "..", "backups");
        let localFiles = [];
        if (fs.existsSync(backupDir)) {
            localFiles = fs.readdirSync(backupDir).filter(f => f.endsWith('.tar.gz'));
        }
        
        // Fetch GCS files
        let gcsFiles = [];
        if (bucket) {
            try {
                const [files] = await bucket.getFiles();
                gcsFiles = files.map(file => file.name).filter(f => f.endsWith('.tar.gz'));
            } catch (gcsErr) {
                console.error("Failed to fetch GCS files for backup admin:", gcsErr);
            }
        }
        
        res.render("admin_backups", { history, localFiles, gcsFiles });
    } catch (e) {
        res.status(500).send("Error loading backup history: " + e.message);
    }
});

router.get("/api/backups/download/:filename", isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    // Basic path traversal prevention
    if (filename.includes("..") || filename.includes("/")) return res.status(403).send("Forbidden");
    
    const filePath = path.join(__dirname, "..", "backups", filename);
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send("File not found on local disk. It may have been deleted by the retention policy. Please check Google Cloud Storage.");
    }
});

router.post("/api/backups/restore/local/:filename", isAuthenticated, async (req, res) => {
    const filename = req.params.filename;
    if (filename.includes("..") || filename.includes("/")) return res.status(403).send("Forbidden");
    try {
        // Will never return response because node crashes itself for restart
        restoreJob.restoreFromLocal(filename);
        res.json({ success: true, message: "Rollback initiated. System will restart shortly." });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post("/api/backups/restore/gcs/:filename", isAuthenticated, async (req, res) => {
    const filename = req.params.filename;
    if (filename.includes("..") || filename.includes("/")) return res.status(403).send("Forbidden");
    try {
        restoreJob.restoreFromGCS(filename);
        res.json({ success: true, message: "Rollback initiated. System will restart shortly." });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post("/api/backups/restore/upload", isAuthenticated, upload.single("backupArchive"), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    try {
        restoreJob.restoreFromUpload(req.file.path);
        res.json({ success: true, message: "Rollback initiated from upload. System will restart shortly." });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Verification Logic (Already exists but now protected)
router.get("/verification", isAuthenticated, async (req, res) => {
    // Re-use logic or call controller
    const knex = require("../db/knex");
    const pendingStores = await knex("stores")
        .select("*", knex.raw("ST_Y(location::geometry) as latitude"), knex.raw("ST_X(location::geometry) as longitude"))
        .where("status", "pending")
        .orderBy("created_at", "desc");
    res.render("admin_verification", { stores: pendingStores, title: "Artisan Curation" });
});

router.post("/approve/:sid", isAuthenticated, async (req, res) => {
    const { sid } = req.params;
    req.body.store_id = sid;
    
    await storeAdminController.verifyAndEnhanceStore(req, {
        status: (code) => ({ json: (data) => data }),
        json: async (data) => {
            if (data.status) {
                return res.json({ success: true });
            }
            res.status(400).json({ success: false, message: data.error });
        }
    });
});

router.post("/approve-instant/:sid", isAuthenticated, async (req, res) => {
    const { sid } = req.params;
    req.body.store_id = sid;
    
    await storeAdminController.verifyStoreInstant(req, {
        status: (code) => ({ json: (data) => data }),
        json: async (data) => {
            if (data.status) {
                return res.json({ success: true });
            }
            res.status(400).json({ success: false, message: data.error });
        }
    });
});

router.post("/reject/:sid", isAuthenticated, async (req, res) => {
    const { sid } = req.params;
    const knex = require("../db/knex");
    const fs = require("fs");
    const path = require("path");
    
    try {
        const store = await knex("stores").where("sid", sid).first();
        if (store && store.owner_image && store.owner_image.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(store.owner_image);
                if (parsed.ktp) {
                    // Extract filename
                    const filename = path.basename(parsed.ktp);
                    const filePath = path.join(__dirname, "..", "secure_vault", "Owner_Ktp", filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        console.log(`[Reject Security] Successfully deleted KTP file: ${filePath}`);
                    }
                }
            } catch (e) {
                console.error("Error parsing JSON during rejection pruning:", e);
            }
        }
        
        // Clean database: set status to rejected and clear owner_image to just the selfie URL
        let cleanSelfie = "";
        if (store && store.owner_image && store.owner_image.trim().startsWith('{')) {
            try {
                cleanSelfie = JSON.parse(store.owner_image).selfie || "";
            } catch (_) {}
        } else if (store) {
            cleanSelfie = store.owner_image || "";
        }
        
        await knex("stores").where("sid", sid).update({ 
            status: "rejected",
            owner_image: cleanSelfie
        });
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Secure gatekeeper route to view KTP images (restricted strictly to active EJS admins)
router.get("/verify/media/ktp/:filename", isAuthenticated, async (req, res) => {
    const { filename } = req.params;
    const path = require("path");
    const fs = require("fs");
    const knex = require("../db/knex");
    
    try {
        // Double-check filename corresponds to a store in PostgreSQL to prevent directory traversal
        const store = await knex("stores")
            .where("owner_image", "like", `%${filename}%`)
            .first();
            
        if (!store) {
            return res.status(404).send("Document not found.");
        }
        
        // Resolve private volume path
        const filePath = path.join(__dirname, "..", "secure_vault", "Owner_Ktp", filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).send("Document file not found on disk.");
        }
        
        res.sendFile(filePath);
    } catch (error) {
        console.error("Error serving secure KTP:", error);
        res.status(500).send("Internal server error.");
    }
});
// --- WORKER ACCOUNTS MANAGEMENT ---

router.get("/workers", isAuthenticated, async (req, res) => {
    const knex = require("../db/knex");
    try {
        const workers = await knex("field_admins").orderBy("created_at", "desc");
        res.render("admin_workers", { workers });
    } catch (e) {
        res.status(500).send("Error loading workers");
    }
});

router.post("/api/workers/add", isAuthenticated, async (req, res) => {
    const knex = require("../db/knex");
    const bcrypt = require("bcryptjs");
    const { username, nickname, password } = req.body;
    try {
        const existing = await knex("field_admins").where("username", username).first();
        if (existing) return res.status(400).json({ success: false, message: "Username already exists" });
        
        const hash = await bcrypt.hash(password, 10);
        await knex("field_admins").insert({
            username, nickname, password_hash: hash
        });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.post("/api/workers/:id/reset", isAuthenticated, async (req, res) => {
    const knex = require("../db/knex");
    const bcrypt = require("bcryptjs");
    const { password } = req.body;
    try {
        const hash = await bcrypt.hash(password, 10);
        await knex("field_admins").where("id", req.params.id).update({ password_hash: hash });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.delete("/api/workers/:id/delete", isAuthenticated, async (req, res) => {
    const knex = require("../db/knex");
    try {
        await knex("field_admins").where("id", req.params.id).del();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

router.get("/api/workers/:id/logs", isAuthenticated, async (req, res) => {
    const knex = require("../db/knex");
    try {
        const logs = await knex("field_admin_logs")
            .where("admin_id", req.params.id)
            .orderBy("created_at", "desc")
            .limit(100);
        res.json({ success: true, logs });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;

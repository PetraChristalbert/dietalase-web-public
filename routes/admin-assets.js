const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ============================================================
// Admin Asset Upload API
// Used to sync local development assets to the production volume
// ============================================================

const ADMIN_SECRET = process.env.ADMIN_ASSET_SECRET || "dietalase-asset-sync-2026";

// Auth check
function checkSecret(req, res, next) {
  const secret = req.headers["x-asset-secret"];
  if (secret !== ADMIN_SECRET) {
    return res.status(403).json({ status: false, error: "Forbidden" });
  }
  next();
}

// Configure multer to preserve subdirectory structure
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // subdir comes from the form field, e.g. "Product_Image", "Store_Image"
    const subdir = req.body.subdir || "";
    const targetDir = path.join(__dirname, "..", "storage", "Assets", subdir);
    fs.mkdirSync(targetDir, { recursive: true });
    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max

// POST /api/admin/upload-asset
// Body: multipart form with "file" and "subdir" fields
router.post("/upload-asset", checkSecret, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ status: false, error: "No file provided" });
  }
  console.log(`✅ [ASSET-SYNC] Saved: Assets/${req.body.subdir}/${req.file.originalname}`);
  res.json({
    status: true,
    message: `Uploaded ${req.file.originalname} to Assets/${req.body.subdir}/`,
  });
});

// GET /api/admin/list-assets - List what's currently in the volume
router.get("/list-assets", checkSecret, (req, res) => {
  const assetsDir = path.join(__dirname, "..", "storage", "Assets");
  const result = {};

  if (!fs.existsSync(assetsDir)) {
    return res.json({ status: true, assets: result, message: "Assets directory does not exist" });
  }

  const subdirs = fs.readdirSync(assetsDir, { withFileTypes: true });
  for (const dir of subdirs) {
    if (dir.isDirectory()) {
      result[dir.name] = fs.readdirSync(path.join(assetsDir, dir.name));
    }
  }
  res.json({ status: true, assets: result });
});

module.exports = router;

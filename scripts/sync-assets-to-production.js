#!/usr/bin/env node

/**
 * =============================================================
 * DiEtalase Asset Sync Script
 * =============================================================
 * Uploads all local storage/Assets files to the production server.
 *
 * Usage:
 *   node scripts/sync-assets-to-production.js
 *   node scripts/sync-assets-to-production.js --target https://dietalase.com
 *   node scripts/sync-assets-to-production.js --target https://dietalase.com --secret mysecret
 * =============================================================
 */

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : defaultVal;
}

const TARGET_URL = getArg("target", "https://dietalase.com");
const SECRET = getArg("secret", "dietalase-asset-sync-2026");
const ASSETS_DIR = path.join(__dirname, "..", "storage", "Assets");

async function syncAssets() {
  console.log(`\n🚀 DiEtalase Asset Sync`);
  console.log(`   Target: ${TARGET_URL}`);
  console.log(`   Source: ${ASSETS_DIR}\n`);

  // First, check what's already on the server
  let existingFiles = new Set();
  try {
    const listRes = await fetch(`${TARGET_URL}/api/admin/list-assets`, {
      headers: { "x-asset-secret": SECRET },
    });
    if (listRes.ok) {
      const data = await listRes.json();
      if (data.assets) {
        for (const [subdir, files] of Object.entries(data.assets)) {
          for (const file of files) {
            existingFiles.add(`${subdir}/${file}`);
          }
        }
      }
      console.log(`📋 Server already has ${existingFiles.size} files.\n`);
    }
  } catch (e) {
    console.log(`⚠️  Could not fetch server file list (will upload all): ${e.message}\n`);
  }

  // Scan local assets
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error("❌ Local storage/Assets directory not found!");
    process.exit(1);
  }

  const subdirs = fs.readdirSync(ASSETS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const dir of subdirs) {
    const subdir = dir.name;
    const subdirPath = path.join(ASSETS_DIR, subdir);
    const files = fs.readdirSync(subdirPath).filter((f) => !f.startsWith("."));

    for (const filename of files) {
      const key = `${subdir}/${filename}`;

      // Skip if already on server
      if (existingFiles.has(key)) {
        skipped++;
        continue;
      }

      const filePath = path.join(subdirPath, filename);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;

      try {
        // Build multipart form data
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(filePath);
        const blob = new Blob([fileBuffer]);
        formData.append("subdir", subdir);
        formData.append("file", blob, filename);

        const res = await fetch(`${TARGET_URL}/api/admin/upload-asset`, {
          method: "POST",
          headers: { "x-asset-secret": SECRET },
          body: formData,
        });

        if (res.ok) {
          uploaded++;
          console.log(`   ✅ ${key} (${(stat.size / 1024).toFixed(1)} KB)`);
        } else {
          failed++;
          const errText = await res.text();
          console.log(`   ❌ ${key} — ${res.status}: ${errText}`);
        }
      } catch (err) {
        failed++;
        console.log(`   ❌ ${key} — ${err.message}`);
      }
    }
  }

  console.log(`\n📊 Sync Complete!`);
  console.log(`   ✅ Uploaded: ${uploaded}`);
  console.log(`   ⏭️  Skipped (already exists): ${skipped}`);
  if (failed > 0) console.log(`   ❌ Failed: ${failed}`);
  console.log("");
}

syncAssets().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

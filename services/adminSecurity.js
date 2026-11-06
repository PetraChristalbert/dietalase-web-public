const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("../config/logger");
const whatsappService = require("./whatsapp");

const VAULT_DIR = path.join(__dirname, "..", "secure_vault");
const VAULT_PATH = path.join(VAULT_DIR, "admin_security_vault.json");

const loadVault = () => {
  try {
    if (!fs.existsSync(VAULT_DIR)) {
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    if (!fs.existsSync(VAULT_PATH)) {
      const defaultVault = {
        banned_ips: [],
        temporary_blocks: {},
        secret_tokens: {}
      };
      fs.writeFileSync(VAULT_PATH, JSON.stringify(defaultVault, null, 2), "utf8");
      return defaultVault;
    }
    const data = fs.readFileSync(VAULT_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    logger.error("Error loading admin security vault", { error: error.message });
    return { banned_ips: [], temporary_blocks: {}, secret_tokens: {} };
  }
};

const saveVault = (vault) => {
  try {
    if (!fs.existsSync(VAULT_DIR)) {
      fs.mkdirSync(VAULT_DIR, { recursive: true });
    }
    fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2), "utf8");
  } catch (error) {
    logger.error("Error saving admin security vault", { error: error.message });
  }
};

const cleanExpiredBlocks = (vault) => {
  const now = Date.now();
  let changed = false;
  
  if (vault.temporary_blocks) {
    for (const ip in vault.temporary_blocks) {
      if (vault.temporary_blocks[ip].expiresAt > 0 && vault.temporary_blocks[ip].expiresAt <= now) {
        delete vault.temporary_blocks[ip];
        changed = true;
      }
    }
  }

  if (vault.secret_tokens) {
    for (const token in vault.secret_tokens) {
      if (vault.secret_tokens[token].expiresAt <= now) {
        delete vault.secret_tokens[token];
        changed = true;
      }
    }
  }

  if (changed) {
    saveVault(vault);
  }
};

const isIpBannedOrBlocked = (ip) => {
  const vault = loadVault();
  cleanExpiredBlocks(vault);

  if (vault.banned_ips.includes(ip)) {
    return { banned: true, blocked: false, timeLeftSeconds: 0, details: null };
  }

  if (vault.temporary_blocks[ip] && vault.temporary_blocks[ip].expiresAt > Date.now()) {
    const expiresAt = vault.temporary_blocks[ip].expiresAt;
    const timeLeftSeconds = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
    return { banned: false, blocked: true, timeLeftSeconds, details: vault.temporary_blocks[ip] };
  }

  return { banned: false, blocked: false, timeLeftSeconds: 0, details: null };
};

const recordFailedAttempt = async (ip, metadata, hostUrl) => {
  const vault = loadVault();
  cleanExpiredBlocks(vault);

  if (!vault.temporary_blocks[ip]) {
    vault.temporary_blocks[ip] = {
      attempts: 0,
      expiresAt: 0,
      metadata: metadata || {}
    };
  }

  vault.temporary_blocks[ip].attempts += 1;
  vault.temporary_blocks[ip].metadata = {
    ...vault.temporary_blocks[ip].metadata,
    ...metadata,
    ip: ip,
    timestamp: Date.now()
  };

  logger.warn(`Admin login failed for IP: ${ip}. Attempt ${vault.temporary_blocks[ip].attempts}/3.`);

  if (vault.temporary_blocks[ip].attempts >= 3) {
    const blockDuration = 5 * 60 * 1000; // 5 minutes block
    vault.temporary_blocks[ip].expiresAt = Date.now() + blockDuration;
    
    // Generate secure crypto token for permanent ban
    const secretToken = crypto.randomBytes(32).toString("hex");
    vault.secret_tokens[secretToken] = {
      ip: ip,
      metadata: vault.temporary_blocks[ip].metadata,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // Valid for 24h
    };

    saveVault(vault);

    // Send WhatsApp security notice to user's registered phone number
    const adminPhone = "6283138596780";
    const loc = vault.temporary_blocks[ip].metadata.location || "Lokasi tidak terdeteksi";
    const os = vault.temporary_blocks[ip].metadata.os || "Device tidak terdeteksi";
    const browser = vault.temporary_blocks[ip].metadata.browser || "Browser tidak terdeteksi";
    
    // Formatted Time (ID timezone)
    const timeStr = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    const message = `🚨 *PERINGATAN KEAMANAN: PERCOBAAN MASUK YANG MENURUNKAN INTEGRITAS* 🚨

Halo Admin! Terdeteksi aktivitas masuk mencurigakan yang gagal sebanyak 3 kali berturut-turut pada Dashboard Admin DiEtalase.

📝 *Telemetry Pengunjung:*
• IP Address: *${ip}*
• Lokasi: *${loc}*
• Perangkat/OS: *${os}*
• Browser: *${browser}*
• Waktu: *${timeStr}*

⚠️ *Tindakan:* Sistem telah memblokir pengunjung dengan IP ini dari area Admin selama 5 menit.

🔗 *Tautan Banishment (Blokir Permanen):*
Jika Anda tidak mengenali percobaan masuk ini, ketuk tautan di bawah ini untuk memblokir IP ini secara PERMANEN dari server DiEtalase:
${hostUrl}/admin/secure/ban-visitor?token=${secretToken}

Terima kasih,
*Protokol Keamanan DiEtalase*`;

    try {
      await whatsappService.sendMessage(adminPhone, message);
      logger.info(`Intrusion notice sent to Admin WhatsApp for IP: ${ip}`);
    } catch (waErr) {
      logger.error("Failed to send WhatsApp security notification", { error: waErr.message });
    }
    return true; // Indicates IP is now blocked
  }

  saveVault(vault);
  return false;
};

const resetFailedAttempts = (ip) => {
  const vault = loadVault();
  if (vault.temporary_blocks[ip]) {
    delete vault.temporary_blocks[ip];
    saveVault(vault);
  }
};

const banIpPermanently = (ip) => {
  const vault = loadVault();
  if (!vault.banned_ips.includes(ip)) {
    vault.banned_ips.push(ip);
  }
  // Clear temporary block
  if (vault.temporary_blocks[ip]) {
    delete vault.temporary_blocks[ip];
  }
  saveVault(vault);
  logger.info(`IP ${ip} has been permanently banned from the admin portal.`);
};

const unbanIp = (ip) => {
  const vault = loadVault();
  vault.banned_ips = vault.banned_ips.filter(banned => banned !== ip);
  saveVault(vault);
  logger.info(`IP ${ip} has been unbanned from the admin portal.`);
};

module.exports = {
  isIpBannedOrBlocked,
  recordFailedAttempt,
  resetFailedAttempts,
  banIpPermanently,
  unbanIp,
  loadVault,
  saveVault
};

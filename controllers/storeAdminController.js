const knex = require("../db/knex");
const logger = require("../config/logger");
const fs = require("fs");
const path = require("path");
const { generateEmbedding } = require("../services/embeddingService"); // Untuk Vektor OpenAI
// --- Impor AI baru ---
const { generateAiContent } = require("./aiEnhancementController");

// --- 3. Fungsi Admin Toko (Diperbarui) ---

/**
 * [FIXED] Mengambil data toko yang sudah terdaftar
 * Memperbaiki sintaks PostGIS untuk latitude/longitude
 */
const fetchStore = async (req, res) => {
  const { installation_id, firebase_id, fcm_token } = req.body;
  if (!installation_id) {
    return res.status(400).json({ error: "installation_id is required" });
  }

  try {
    let user;

    // 1. Try to find the store by firebase_id first (Google Account is the source of truth)
    if (firebase_id) {
      user = await knex("stores")
        .select(
          "*",
          knex.raw("ST_Y(location::geometry) as latitude"),
          knex.raw("ST_X(location::geometry) as longitude")
        )
        .where("firebase_id", firebase_id)
        .first();

      // If found, and installation_id changed, migrate it!
      if (user && user.installation_id !== installation_id) {
        await knex("stores")
          .where("sid", user.sid)
          .update({
            installation_id: installation_id,
            fcm_token: fcm_token || user.fcm_token,
            updated_at: knex.fn.now()
          });
      }
    }

    // 2. Fallback to installation_id if firebase_id not found (or not provided)
    if (!user) {
      user = await knex("stores")
        .select(
          "*",
          knex.raw("ST_Y(location::geometry) as latitude"),
          knex.raw("ST_X(location::geometry) as longitude")
        )
        .where("installation_id", installation_id)
        .first();
    }

    if (!user) {
      return res.status(404).json({ error: "account not found" });
    }
    delete user.location; // Hapus data biner

    // Update FCM token if needed
    if (fcm_token && user.fcm_token !== fcm_token) {
      await knex("stores").where("sid", user.sid).update({ fcm_token: fcm_token });
    }

    return res.json(user);
  } catch (error) {
    logger.error("Error in fetchStore", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * [REWORKED] Mendaftarkan toko baru ke tabel 'pending_stores'.
 * Menggunakan sintaks PostGIS dan hanya menyimpan data mentah.
 */
const registerStore = async (req, res) => {
  const {
    name,
    description,
    address,
    city,
    latitude,
    longitude,
    installation_id,
    phone,
    contact, // WhatsApp contact from Flutter client
    owner_name,
    email,
    type,
    image, // Store profile image URL
    owner_image, // Owner selfie image URL
    ktp_image, // Owner KTP image URL
    business_reg_url, // NIB document URL
    firebase_id,
  } = req.body;

  // Validasi input dasar
  if (!name || !latitude || !longitude || !installation_id) {
    return res
      .status(400)
      .json({ error: "Missing required fields (name, lat, lng, installation_id)" });
  }

  try {
    // Buat objek PostGIS 'location'
    const location = knex.raw(
      "ST_SetSRID(ST_MakePoint(?, ?), 4326)",
      [longitude, latitude]
    );

    const newStore = {
      name,
      description: description || `Artisan ${type || 'Lokal'} - ${name}`,
      address,
      city,
      location, // Sisipkan raw query
      installation_id,
      firebase_id: firebase_id || null,
      phone: contact || phone || "",
      contact: contact || phone || "",
      owner_name: owner_name || "Pemilik Toko",
      email: email || null,
      type,
      image: image || null,
      owner_image: JSON.stringify({
        selfie: owner_image || "",
        ktp: ktp_image || "",
        business_reg: business_reg_url || ""
      }),
      status: "pending", // Status default
      // 'description_ai' dan 'vector' akan diisi saat verifikasi
    };

    // Check for existing rejected stores and clear them
    const existing = await knex("stores").where({ installation_id }).first();
    if (existing) {
      if (existing.status === "rejected") {
        await knex("stores").where({ sid: existing.sid }).delete();
      } else {
        return res.status(409).json({ error: "Store already registered." });
      }
    }

    // Masukkan ke 'stores' dengan 'status: pending'
    const [inserted] = await knex("stores")
      .insert(newStore)
      .returning("*");



    logger.info("New store pending registration:", { id: inserted.sid });
    return res.status(201).json({
      status: true,
      message: "Store submitted for verification.",
      storeId: inserted.sid,
    });
  } catch (error) {
    logger.error("Error in registerStore", { error: error.message });
    if (error.code === "23505") {
      // Kode error duplikat (misal: android_id unik)
      return res.status(409).json({ error: "Store already registered." });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * [NEW] Memverifikasi toko, membuat data AI, dan memindahkannya ke tabel 'stores'.
 * Ini adalah fungsi 'verifyPendingStore' yang Anda minta.
 */
const verifyAndEnhanceStore = async (req, res) => {
  const { store_id } = req.body; // Mengambil 'sid' dari toko yang berstatus 'pending'

  if (!store_id) {
    return res.status(400).json({ error: "store_id is required" });
  }

  try {
    // 1. Ambil data toko yang 'pending'
    const pendingStore = await knex("stores")
      .where({ sid: store_id, status: "pending" })
      .first();

    if (!pendingStore) {
      return res.status(404).json({ error: "Pending store not found." });
    }

    // 2. Buat Prompt AI untuk Gemini
    const prompt = `
      Analisis detail toko ini dan perbaiki.
      Nama Asli: "${pendingStore.name}"
      Deskripsi Asli: "${pendingStore.description}"
      Tipe Toko: "${pendingStore.type}"

      Tugas Anda:
      1.  Buat "newName": Perbaiki nama toko agar lebih profesional atau deskriptif. Jika nama "Aryan", ubah jadi "Toko Fotokopi Aryan" (sesuaikan dengan tipe toko).
      2.  Buat "newDescription": Tulis ulang deskripsi agar lebih detail, profesional, dan menarik (minimal 50 kata).
      3.  Buat "description_ai": Buat paragraf yang SANGAT KAYA KEYWORD dan akurat tentang toko ini, layanannya, dan produknya. Ini HANYA untuk pencarian semantik.

      Balas HANYA dengan format JSON: {"newName": "...", "newDescription": "...", "description_ai": "..."}
    `;

    // 3. Panggil AI Controller (hanya teks)
    logger.info(`[AI Store] Calling Gemini for store: ${store_id}`);
    const aiData = await generateAiContent(prompt); // <-- Menggunakan fungsi yang diimpor
    logger.info(`[AI Store] Gemini enhancement complete for: ${store_id}`);

    // 4. Buat Vektor dari 'description_ai'
    const vector = await generateEmbedding(
      aiData.description_ai,
      "RETRIEVAL_DOCUMENT"
    );
    logger.info(`[AI Store] OpenAI vector created for: ${store_id}`);

    // 5. Update toko di database dalam satu transaksi
    await knex.transaction(async (trx) => {
      // 5a. Update tabel 'stores'
      await trx("stores").where("sid", store_id).update({
        name: aiData.newName,
        description: aiData.newDescription,
        description_ai: aiData.description_ai,
        status: "verified", // Ubah status!
        // 'location' sudah ada
      });

      // 5b. Masukkan ke 'store_vectors'
      await trx("store_vectors").insert({
        sid: store_id,
        vector: JSON.stringify(vector), // Pastikan pgvector menerima format ini
      });
    });

    logger.info(`[AI Store] Store ${store_id} is now verified and live.`);
    return res.json({
      status: true,
      message: "Store verified, enhanced by AI, and vector created.",
      aiData: aiData,
    });
  } catch (error) {
    logger.error("Error in verifyAndEnhanceStore", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Verifies the store instantly without using AI for enhancement.
 * Uses original name and description for the vector.
 */
const verifyStoreInstant = async (req, res) => {
  const { store_id } = req.body;

  if (!store_id) {
    return res.status(400).json({ error: "store_id is required" });
  }

  try {
    const pendingStore = await knex("stores")
      .where({ sid: store_id, status: "pending" })
      .first();

    if (!pendingStore) {
      return res.status(404).json({ error: "Pending store not found." });
    }

    const aiEmbeddingText = `${pendingStore.name} ${pendingStore.description}`;
    const vector = await generateEmbedding(aiEmbeddingText, "RETRIEVAL_DOCUMENT");

    await knex.transaction(async (trx) => {
      await trx("stores").where("sid", store_id).update({
        description_ai: aiEmbeddingText, // fallback to raw text
        status: "verified",
      });

      await trx("store_vectors").insert({
        sid: store_id,
        vector: JSON.stringify(vector),
      });
    });

    logger.info(`[Store] Store ${store_id} is now verified instantly.`);
    return res.json({
      status: true,
      message: "Store verified instantly.",
    });
  } catch (error) {
    logger.error("Error in verifyStoreInstant", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * [REWORKED] Menambahkan produk baru dengan pipeline AI.
 * Menggunakan Gemini multimodal untuk menganalisis gambar.
 */
const addProduct = async (req, res) => {
  const { sid, name, description, price, unit, stock, weight_grams } = req.body;
  
  if (!sid || !name) {
    return res.status(400).json({ error: "sid and name are required." });
  }

  // Multer processes files into req.files.images and req.files.video
  if (!req.files || !req.files.images || req.files.images.length === 0) {
    return res.status(400).json({ error: "At least one product image is required." });
  }
  
  try {
    // --- 1. Fetch Store Tier ---
    const store = await knex("stores")
      .select("subscription_status")
      .where("sid", sid)
      .first();

    if (!store) {
      return res.status(404).json({ error: "Store not found." });
    }

    const tier = Number(store.subscription || 1);
    logger.info(`[Inventory] Adding product for Store ${sid} (Tier: ${tier})`);

    // --- 2. Process Media Based on Tier ---
    // Images: Tier 1 (1), Tier 2 (3), Tier 3+ (5)
    let maxImages = 1;
    if (tier >= 3) maxImages = 5;
    else if (tier >= 2) maxImages = 3;
    
    const imagesToProcess = req.files.images.slice(0, maxImages);
    
    const imageUrls = imagesToProcess.map(file => {
      return `${process.env.APP_URL}/Assets/Product_Image/${file.filename}`;
    });

    // Video: Tier 1 (0), Tier 2+ (1)
    let videoUrl = null;
    if (tier >= 2 && req.files.video && req.files.video.length > 0) {
      const videoFile = req.files.video[0];
      videoUrl = `${process.env.APP_URL}/Assets/Product_Video/${videoFile.filename}`;
    }

    // --- 3. AI Optimization (Tier 2+ Only) ---
    let finalName = name;
    let finalDesc = description;
    let searchTags = [];
    let aiEmbeddingText = `${name} ${description}`;
 
    if (tier >= 2) {
      const prompt = `
        Role: You are an elite E-Commerce SEO Specialist for an Indonesian Artisanal Marketplace.
        Input:
        - Original Name: "${name}"
        - Original Bio: "${description}"
        Task: Optimize this product for maximum searchability and sales. Correct any bad grammar and make it sound premium.
        Output strictly in JSON format with these exact keys:
        {
          "optimized_name": "A premium, specific name.",
          "optimized_desc": "A professional, attractive description (Min 50 words).",
          "search_tags": ["array", "of", "5", "to", "10", "keywords/synonyms"],
          "ai_embedding_text": "A highly dense paragraph for vector generation."
        }
      `;

      try {
        const aiData = await generateAiContent(prompt);
        finalName = aiData.optimized_name || name;
        finalDesc = aiData.optimized_desc || description;
        searchTags = aiData.search_tags || [];
        aiEmbeddingText = aiData.ai_embedding_text || aiEmbeddingText;
        logger.info(`[AI Product] Tiered optimization complete for: ${name}`);
      } catch (aiError) {
        logger.warn(`[AI Product] Optimization failed, falling back to raw text.`, { error: aiError.message });
      }
    }

    // --- 4. Vectorization (Universal) ---
    // We vectorize the optimized text for high tiers, or raw text for Starter
    const vector = await generateEmbedding(aiEmbeddingText, "RETRIEVAL_DOCUMENT");
    logger.info(`[AI Product] Vector created for: ${finalName}`);

    // --- 5. Save to Database ---
    let newPid;
    await knex.transaction(async (trx) => {
      // Set initial status to 'on-review' so it always goes to the admin verification queue
      const initialStatus = 'on-review';

      const [inserted] = await trx("products")
        .insert({
          sid,
          name: finalName,
          description: finalDesc,
          price: price || 0,
          unit: unit || 'item',
          stock: stock || 0,
          weight_grams: weight_grams || 0,
          images: JSON.stringify(imageUrls),
          video: videoUrl,
          search_tags: JSON.stringify(searchTags),
          vector: vector ? JSON.stringify(vector) : null,
          status: initialStatus
        })
        .returning("pid");
      
      newPid = inserted.pid;
    });

    return res.json({
      status: true,
      message: "Product added and sent for review.",
      pid: newPid,
      optimized: tier >= 2
    });

  } catch (error) {
    logger.error("Error in addProduct", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

// --- 4. Fungsi Lain (Diperbarui hanya untuk PostGIS) ---

/**
 * Fetches all products for a specific merchant store.
 */
const getMerchantProducts = async (req, res) => {
  const { sid } = req.body;
  if (!sid) return res.status(400).json({ error: "sid is required" });

  try {
    const products = await knex("products")
      .where("sid", sid)
      .orderBy("created_at", "desc");
    
    // Use centralized formatter
    const { formatProducts } = require("../utils/productFormatter");
    return res.json({ status: true, products: formatProducts(products) });
  } catch (error) {
    logger.error("Error in getMerchantProducts", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Securely deletes a product.
 */
const deleteProduct = async (req, res) => {
  const { pid, sid } = req.body;
  if (!pid || !sid) return res.status(400).json({ error: "pid and sid required" });

  try {
    // 1. Clean up vectors first
    await knex("product_vectors").where("pid", pid).delete();

    // 2. Delete product with ownership check
    const deleted = await knex("products")
      .where({ pid, sid })
      .delete();

    if (deleted) {
      return res.json({ status: true, message: "Product deleted." });
    } else {
      return res.status(403).json({ error: "Not authorized or product not found." });
    }
  } catch (error) {
    logger.error("Error in deleteProduct", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * [FIXED] Memperbarui detail toko.
 * Memperbaiki sintaks PostGIS.
 */
const updateStore = async (req, res) => {
  const { 
    sid, name, description, address, city, latitude, longitude, 
    phone, owner_name, email, type,
    instagram, tiktok, facebook, youtube, x_account, website_slug,
    open_time, close_time
  } = req.body;

  if (!sid) {
    return res.status(400).json({ error: "sid is required" });
  }

  try {
    const updates = {
      name, description, address, city, phone, owner_name, email, type,
      instagram, tiktok, facebook, youtube, x_account, website_slug,
      open_time, close_time
    };

    // Hanya update lokasi jika latitude & longitude disediakan
    if (latitude && longitude) {
      updates.location = knex.raw(
        "ST_SetSRID(ST_MakePoint(?, ?), 4326)",
        [longitude, latitude]
      );
    }

    const updated = await knex("stores").where("sid", sid).update(updates);

    if (updated) {
      return res.json({ status: true, message: "Store updated." });
    } else {
      return res.status(404).json({ error: "Store not found." });
    }
  } catch (error) {
    logger.error("Error in updateStore", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * (Tidak Berubah) Logika upload file Anda sudah OK.
 */
const updateStoreImage = async (req, res) => {
  const { sid, type } = req.body; // type = 'profile' or 'cover'
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: "No files uploaded." });
  }

  const file = req.files[0];
  const imageUrl = `${process.env.APP_URL}/Assets/Store_Image/${file.filename}`;

  try {
    const fieldToUpdate = type === "cover" ? "cover_image" : "profile_image";
    
    // Hapus gambar lama jika ada
    const oldStore = await knex("stores").select(fieldToUpdate).where("sid", sid).first();
    if (oldStore && oldStore[fieldToUpdate]) {
      try {
        const oldFileName = path.basename(new URL(oldStore[fieldToUpdate]).pathname);
        const oldFilePath = path.join(__dirname, "..", "storage", "Assets", "Store_Images", oldFileName);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      } catch (e) {
         logger.warn(`Could not delete old store image: ${oldStore[fieldToUpdate]}`, { error: e.message });
      }
    }

    // Update database
    await knex("stores").where("sid", sid).update({ [fieldToUpdate]: imageUrl });
    
    return res.json({
      status: true,
      message: `${type} image updated.`,
      url: imageUrl,
    });
  } catch (error) {
    logger.error("Error in updateStoreImage", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Updates basic store profile information including name, description, and operating hours.
 */
const updateStoreProfile = async (req, res) => {
  const { sid, name, description, long_description, vacation_mode, vacation_return_date, operating_hours } = req.body;
  if (!sid) return res.status(400).json({ error: "sid is required" });

  try {
    const updates = {
      name,
      description,
      long_description,
      vacation_mode: vacation_mode ?? false,
      vacation_return_date,
      operating_hours: JSON.stringify(operating_hours || {}),
      updated_at: knex.fn.now(),
    };

    await knex("stores")
      .where("sid", sid)
      .update(updates);
    
    return res.json({ status: true, message: "Profile updated successfully." });
  } catch (error) {
    logger.error("Error in updateStoreProfile", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Updates the store workshop gallery (Max 5 photos).
 */
const updateStoreGallery = async (req, res) => {
  const { sid, action, imageUrl } = req.body; // action: 'add' | 'remove'
  if (!sid) return res.status(400).json({ error: "sid is required" });

  try {
    const store = await knex("stores").where("sid", sid).first();
    let gallery = store.gallery || [];

    if (action === "add") {
      if (gallery.length >= 5) {
        return res.status(400).json({ error: "Gallery limit reached (max 5)." });
      }
      gallery.push(imageUrl);
    } else if (action === "remove") {
      gallery = gallery.filter(img => img !== imageUrl);
      // Logic to delete file from volume could go here
    }

    await knex("stores")
      .where("sid", sid)
      .update({
        gallery: JSON.stringify(gallery),
        updated_at: knex.fn.now(),
      });

    return res.json({ status: true, gallery });
  } catch (error) {
    logger.error("Error in updateStoreGallery", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Updates store certifications/credentials.
 */
const updateStoreCertification = async (req, res) => {
  const { sid, certifications } = req.body; // Expects array of URLs
  if (!sid) return res.status(400).json({ error: "sid is required" });

  try {
    await knex("stores")
      .where("sid", sid)
      .update({
        certification_urls: JSON.stringify(certifications || []),
        updated_at: knex.fn.now(),
      });

    return res.json({ status: true, message: "Certifications updated." });
  } catch (error) {
    logger.error("Error in updateStoreCertification", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * (Tidak Berubah)
 */
const fetchProducts = async (req, res) => {
  const { sid } = req.body;
  if (!sid) {
    return res.status(400).json({ error: "sid is required" });
  }
  try {
    const products = await knex("products").where("sid", sid);
    return res.json(products);
  } catch (error) {
    logger.error("Error in fetchProducts", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Updates an existing product.
 */
const updateProduct = async (req, res) => {
  const { pid, sid, name, description, price, unit, stock, weight_grams } = req.body;
  if (!pid || !sid) {
    return res.status(400).json({ error: "pid and sid are required" });
  }

  try {
    let finalImages = [];
    if (req.body.existingImages) {
      try {
        finalImages = JSON.parse(req.body.existingImages);
      } catch (e) {
        if (typeof req.body.existingImages === 'string') {
          finalImages = [req.body.existingImages];
        } else {
          finalImages = req.body.existingImages;
        }
      }
    }

    if (req.files && req.files.images && req.files.images.length > 0) {
      const newUrls = req.files.images.map(file => `${process.env.APP_URL}/Assets/Product_Image/${file.filename}`);
      finalImages = finalImages.concat(newUrls);
    }

    const updateData = {
      name,
      description,
      price,
      unit,
      stock: stock || 0,
      weight_grams: weight_grams || 0,
      updated_at: knex.fn.now(),
    };

    if (finalImages.length > 0) {
      updateData.images = JSON.stringify(finalImages);
      updateData.image = finalImages.join('`'); // Keep legacy column in sync
    }

    // Set status to 'on-review' so edited products must be re-verified by admin
    const initialStatus = 'on-review';
    updateData.status = initialStatus;

    const updated = await knex("products")
      .where({ pid, sid })
      .update(updateData);

    if (updated) {
      return res.json({ status: true, message: "Product updated and sent for review." });
    } else {
      return res.status(403).json({ error: "Not authorized or product not found. pid: " + pid + ", sid: " + sid });
    }
  } catch (error) {
    logger.error("Error in updateProduct", { error: error.message });
    return res.status(500).json({ error: error.message });
  }
};



/**
 * Fetches real analytics data for the store dashboard.
 */
const getStoreAnalytics = async (req, res) => {
  const { sid } = req.body;
  if (!sid) {
    return res.status(400).json({ error: "sid is required" });
  }

  try {
    // 1. Total Views
    const viewsQuery = await knex("raw_visits").where("sid", sid).count("* as count").first();
    const totalViews = parseInt(viewsQuery.count) || 0;

    // 2. Visitors (unique eid)
    const visitorsQuery = await knex("raw_visits").where("sid", sid).countDistinct("eid as count").first();
    const visitors = parseInt(visitorsQuery.count) || 0;

    // 3. Live Items
    const itemsQuery = await knex("products").where("sid", sid).andWhere("status", "approved").count("* as count").first();
    const liveItems = parseInt(itemsQuery.count) || 0;

    // 4. Rating
    const storeData = await knex("stores").select("average_rating").where("sid", sid).first();
    const rating = storeData ? parseFloat(storeData.average_rating).toFixed(1) : "0.0";

    return res.json({
      status: true,
      data: {
        totalViews,
        visitors,
        liveItems,
        rating
      }
    });
  } catch (error) {
    logger.error("Error in getStoreAnalytics", { error: error.message });
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  fetchStore,
  registerStore,
  addProduct,
  getMerchantProducts,
  updateStore,
  updateStoreImage,
  updateStoreProfile,
  updateStoreGallery,
  updateStoreCertification,
  updateProduct,
  deleteProduct,
  verifyAndEnhanceStore,
  verifyStoreInstant,
  getStoreAnalytics,
};

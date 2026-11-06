// services/rankingService.js
const knex = require("../db/knex");
const logger = require("../config/logger");
const { generateEmbedding } = require("./embeddingService");

// --- 1. Tentukan bobot untuk algoritma ranking Anda ---
// Sesuaikan ini untuk mengubah apa yang paling penting
const WEIGHTS = {
  // Jarak semantik (seberapa mirip)
  SEMANTIC: 0.4, 
  // Rata-rata ulasan (skor 1-5)
  REVIEW: 0.3,
  // Jarak fisik (seberapa dekat)
  DISTANCE: 0.2, 
  // Harga (seberapa murah)
  PRICE: 0.1, 
};

// Jumlah hasil yang diambil dari DB sebelum diranking
const DB_LIMIT = 50;

/**
 * ===================================================================
 * FUNGSI UTAMA (YANG DIPANGGIL OLEH CONTROLLER)
 * ===================================================================
 */
const wideSearch = async (query, userLat, userLng) => {
  logger.info(`[WideSearch] Starting wide search for: "${query}"`);

  // --- Langkah 1: Vectorize Query ---
  const queryVector = await generateEmbedding(query, "RETRIEVAL_QUERY");
  const vectorString = JSON.stringify(queryVector); // Konversi ke string untuk query

  // --- Langkah 2: Database-wide Vector Search (Top 50) ---
  // Kita cari 'product_vectors' dan 'JOIN' semua data lain yang kita perlukan
  // Ini adalah inti dari "Mode 3"
  
  const userLocation = `POINT(${userLng} ${userLat})`;

  let rankedResults;
  try {
    const rawResults = await knex("product_vectors")
      // ---- Vector Search (pgvector) ----
      // <=> adalah 'cosine distance' operator. ORDER BY akan menggunakannya.
      .select(knex.raw("product_vectors.pid, (vector <=> ?) as semantic_distance", [vectorString]))
      
      // ---- Join Data Produk & Toko ----
      .join("products", "product_vectors.pid", "products.pid")
      .join("stores", "products.sid", "stores.sid")
      .select("products.name", "products.price", "products.image", "products.sid", "stores.name as storeName")
      
      // ---- Join Data Review (Agregasi) ----
      // Kita LEFT JOIN agar produk tanpa review tetap muncul
      .leftJoin("reviews", "products.pid", "reviews.pid")
      .select(
        // Beri skor 3 (netral) jika belum ada review
        knex.raw("COALESCE(AVG(reviews.score), 3.0) as avg_review_score")
      )
      
      // ---- Kalkulasi Jarak (PostGIS) ----
      .select(
        knex.raw("ST_Distance(stores.location, ST_GeographyFromText(?)) / 1000 as distance_km", [userLocation])
      )
      
      // --- Grouping & Ordering ---
      .groupBy("product_vectors.pid", "products.pid", "stores.sid")
      .orderBy("semantic_distance", "asc") // Urutkan berdasarkan jarak semantik
      .limit(DB_LIMIT); // Ambil Top 50

    if (rawResults.length === 0) {
      logger.warn(`[WideSearch] No database-wide results found for "${query}"`);
      return {
        responseText: `Saya tidak dapat menemukan hasil di seluruh Indonesia untuk "${query}".`,
        resultData: { mode: "NO_WIDE_RESULTS" }
      };
    }

    // --- Langkah 3: Calculate Weighted Rank Score (di Node.js) ---
    // Sekarang kita 'normalize' semua skor (0-1) dan terapkan bobot
    const normalizedResults = normalizeData(rawResults);

    rankedResults = normalizedResults.map(item => {
      // Hitung skor akhir berdasarkan bobot
      const rankScore = 
        (item.norm_semantic * WEIGHTS.SEMANTIC) +
        (item.norm_review * WEIGHTS.REVIEW) +
        (item.norm_distance * WEIGHTS.DISTANCE) +
        (item.norm_price * WEIGHTS.PRICE);
      
      return {
        ...item,
        rankScore
      };
    });

    // Urutkan berdasarkan Rank Score (tertinggi ke terendah)
    rankedResults.sort((a, b) => b.rankScore - a.rankScore);

  } catch (error) {
    logger.error("[WideSearch] Error during database query:", error);
    return {
      responseText: "Terjadi kesalahan saat melakukan pencarian luas.",
      resultData: { mode: "ERROR", details: error.message },
    };
  }

  // --- Langkah 4: Kembalikan Top 5 & Format Respons ---
  const top5Results = rankedResults.slice(0, 5).map(p => ({
    // Pilih data yang ingin Anda kirim ke klien
    pid: p.pid,
    name: p.name,
    image: p.image,
    price: p.price,
    storeName: p.storeName,
    sid: p.sid,
    distance_km: p.distance_km,
    avg_review_score: parseFloat(p.avg_review_score).toFixed(1),
    rankScore: p.rankScore
  }));

  return {
    responseText: `Berikut adalah hasil pencarian teratas di seluruh Indonesia untuk "${query}":`,
    resultData: {
      mode: "WIDE_SEARCH",
      data: top5Results
    }
  };
};

/**
 * ===================================================================
 * FUNGSI HELPER UNTUK NORMALISASI
 * ===================================================================
 */

/**
 * Mengubah semua data (harga, jarak, dll) menjadi skor 0-1
 */
function normalizeData(items) {
  // Temukan min/max untuk setiap metrik
  const stats = {
    minSemantic: Math.min(...items.map(i => i.semantic_distance)),
    maxSemantic: Math.max(...items.map(i => i.semantic_distance)),
    minReview: Math.min(...items.map(i => i.avg_review_score)),
    maxReview: Math.max(...items.map(i => i.avg_review_score)),
    minDist: Math.min(...items.map(i => i.distance_km)),
    maxDist: Math.max(...items.map(i => i.distance_km)),
    minPrice: Math.min(...items.map(i => parseFloat(i.price))),
    maxPrice: Math.max(...items.map(i => parseFloat(i.price))),
  };

  return items.map(item => {
    // Normalisasi: 0.0 sampai 1.0 (skor lebih tinggi lebih baik)
    
    // 'Semakin rendah semakin baik' (jarak, harga)
    const norm_semantic = 1 - normalize(item.semantic_distance, stats.minSemantic, stats.maxSemantic);
    const norm_distance = 1 - normalize(item.distance_km, stats.minDist, stats.maxDist);
    const norm_price = 1 - normalize(parseFloat(item.price), stats.minPrice, stats.maxPrice);
    
    // 'Semakin tinggi semakin baik' (review)
    const norm_review = normalize(item.avg_review_score, stats.minReview, stats.maxReview);

    return {
      ...item,
      norm_semantic,
      norm_distance,
      norm_price,
      norm_review
    };
  });
}

/**
 * Helper normalisasi Min-Max standar
 */
function normalize(value, min, max) {
  if (min === max) return 1; // Semua item sama
  return (value - min) / (max - min);
}


module.exports = { wideSearch };
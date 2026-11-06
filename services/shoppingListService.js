// services/shoppingListService.js
const knex = require("../db/knex");
const logger = require("../config/logger");
const { generateEmbedding } = require("./embeddingService");
const vectorCache = require("./vectorCacheService");

// --- ACO Configuration (Tetap sama) ---
const ACO_CONFIG = {
  numAnts: 30,
  iterations: 50,
  alpha: 1.0,
  beta: 2.0,
  evaporation: 0.1,
  q: 100,
};

/**
 * ===================================================================
 * FUNGSI UTAMA (YANG DIPANGGIL OLEH CONTROLLER)
 * ===================================================================
 * Ini sekarang akan mengembalikan OBJEK JSON FINAL untuk aplikasi mobile.
 */
const findShoppingListSolution = async (items, userLat, userLng) => {
  const numItemsRequired = items.length;
  logger.info(
    `[ShoppingList] Starting search for ${numItemsRequired} items: ${items.join(
      ", "
    )}`
  );

  // --- Langkah 1 & 2: Bangun Peta Inventaris ---
  // Ini adalah fungsi baru yang dimodifikasi
  const {
    storeInventory, // Map<sid, Set<item_name>> (Untuk One-Stop-Shop)
    allStoreIds,    // Set<sid> (Untuk ACO)
    itemProductMap, // Map<item_name, {pid, sid}[]> (Untuk One-Stop-Shop)
    productStoreMap, // Map<sid, Map<item_name, pid[]>> (Untuk ACO)
  } = await buildInventoryMaps(items);

  if (allStoreIds.size === 0) {
    logger.warn("[ShoppingList] No stores found stocking any of the items.");
    return {
      responseText:
        "Saya tidak dapat menemukan toko yang menjual barang-barang tersebut.",
      resultData: { mode: "NO_SOLUTION" },
    };
  }

  // --- Langkah 3: Cek One-Stop Shop ---
  const oneStopShops = [];
  for (const [sid, stockedItems] of storeInventory.entries()) {
    if (stockedItems.size === numItemsRequired) {
      oneStopShops.push(sid);
    }
  }

  if (oneStopShops.length > 0) {
    logger.info(
      `[ShoppingList] Found ${oneStopShops.length} one-stop-shop(s). Finding closest.`
    );
    // Kita perlu data lengkap untuk membangun respons
    const closestStore = await findClosestStore(oneStopShops, userLat, userLng);
    
    // Bangun daftar "itemsToBuy" untuk toko ini
    const itemsToBuy = await getProductDetailsForOneStopShop(
      closestStore.sid,
      items,
      itemProductMap
    );

    const distance = parseFloat(closestStore.distance_km).toFixed(1);
    
    // Kembalikan JSON "ONE_STOP_SHOP"
    return {
      responseText: `Kabar baik! Semua ${numItemsRequired} barang ada di satu toko: ${closestStore.name}, sekitar ${distance} km.`,
      resultData: {
        mode: "ONE_STOP_SHOP",
        totalItemsFound: numItemsRequired,
        store: {
          sid: closestStore.sid,
          name: closestStore.name,
          address: closestStore.address,
          lat: closestStore.lat,
          lng: closestStore.lng,
          distance_km: closestStore.distance_km,
          itemsToBuy: itemsToBuy,
        },
      },
    };
  }

  // --- Langkah 4: Tidak ada One-Stop Shop. Persiapan ACO. ---
  logger.info("[ShoppingList] No one-stop-shop. Building multi-stop route.");

  const { nodes, distanceMatrix, nodeInventory, nodeItemProductMap } =
    await buildNodeListAndMatrix(
      Array.from(allStoreIds),
      userLat,
      userLng,
      storeInventory, // Map<sid, Set<item_name>>
      productStoreMap // Map<sid, Map<item_name, pid[]>>
    );

  // --- Langkah 5: Jalankan ACO ---
  const { bestPath, bestDistance, bestShoppingBag } = runACO(
    nodes,
    distanceMatrix,
    nodeInventory, // Map<nodeIndex, Set<item_name>>
    nodeItemProductMap, // Map<nodeIndex, Map<item_name, pid[]>>
    numItemsRequired
  );

  if (!bestPath || bestPath.length === 0) {
    logger.error("[ShoppingList] ACO failed to find a valid path.");
    return {
      responseText:
        "Saya tidak dapat menemukan rute yang efisien untuk mendapatkan semua barang.",
      resultData: { mode: "NO_SOLUTION" },
    };
  }

  // --- Langkah 6: Bangun Respons JSON "MULTI_STOP_ROUTE" ---
  const finalResponse = await buildMultiStopResponse(
    bestPath,
    bestDistance,
    bestShoppingBag,
    numItemsRequired
  );
  
  return finalResponse;
};

/**
 * ===================================================================
 * FUNGSI HELPER BARU & YANG DIMODIFIKASI
 * ===================================================================
 */

/**
 * [MODIFIKASI] Membangun semua peta inventaris yang diperlukan.
 */
const buildInventoryMaps = async (items) => {
  const itemSearchMap = new Map(); // Map<item_name, {pid, sid}[]>
  const allStoreIds = new Set();
  const productStoreMap = new Map(); // Map<sid, Map<item_name, pid[]>>
  const storeInventory = new Map(); // Map<sid, Set<item_name>>

  // Tentukan ambang batas jarak (semakin rendah, semakin ketat)
  const SEMANTIC_DISTANCE_THRESHOLD = 0.60;

  for (const item of items) {
    // 1. Ambil Kueri Keyword
    const keywordQuery = `%${item}%`;

    // 2. Ambil K=10 Hasil Semantik (seperti log Anda)
    const embedding = await generateEmbedding(item, "RETRIEVAL_QUERY");
    const searchResults = vectorCache.search(embedding, 10); // k=10
    
    const productIds = searchResults
      .filter((r) => r.type === "product")
      .map((r) => r.id);
    
    if (productIds.length === 0) continue;

    // Buat Peta Jarak Semantik (PID -> distance)
    const semanticDistance = new Map(searchResults.map(r => [r.id, r.distance]));

    // 3. Query Hibrida untuk Produk
    const productRecords = await knex("products")
      .select("pid", "sid", "name")
      .whereIn("pid", productIds)
      .select(
        knex.raw(
          'CASE WHEN name ILIKE ? THEN 1 ELSE 0 END as keyword_score',
          [keywordQuery]
        )
      );

    // 4. --- FILTER HIBRIDA (SOLUSI BARU) ---
    // Kita tidak perlu re-rank/slice lagi. Kita filter secara langsung.
    const finalProductRecords = [];
    for (const record of productRecords) {
      const distance = semanticDistance.get(record.pid);

      if (record.keyword_score === 1) {
        // SELALU SIMPAN jika keyword cocok
        finalProductRecords.push(record);
        logger.info(`[Hybrid] KEEP (Keyword): "${item}" -> "${record.name}" (Dist: ${distance})`);
      } else if (distance < SEMANTIC_DISTANCE_THRESHOLD) {
        // SIMPAN jika keyword tidak cocok TAPI jarak semantik sangat dekat
        finalProductRecords.push(record);
        logger.info(`[Hybrid] KEEP (Semantic): "${item}" -> "${record.name}" (Dist: ${distance})`);
      } else {
        // BUANG jika keyword tidak cocok DAN jarak semantik jauh
        logger.warn(`[Hybrid] DISCARD (Irrelevant): "${item}" -> "${record.name}" (Dist: ${distance})`);
      }
    }
    // --- AKHIR SOLUSI BARU ---

    // 5. Bangun Peta Inventaris dari hasil yang sudah bersih
    if (!itemSearchMap.has(item)) itemSearchMap.set(item, []);
    
    for (const record of finalProductRecords) { 
      const { pid, sid } = record;

      // 1. Peta untuk One-Stop-Shop
      if (!storeInventory.has(sid)) storeInventory.set(sid, new Set());
      storeInventory.get(sid).add(item);
      allStoreIds.add(sid);

      // 2. Peta untuk "itemsToBuy" (One-Stop)
      itemSearchMap.get(item).push({ pid, sid });

      // 3. Peta untuk "ACO Ant Brain"
      if (!productStoreMap.has(sid)) productStoreMap.set(sid, new Map());
      if (!productStoreMap.get(sid).has(item)) productStoreMap.get(sid).set(item, []);
      productStoreMap.get(sid).get(item).push(pid);
    }
  }

  // Ganti nama itemSearchMap menjadi itemProductMap agar sesuai dengan sisa kode
  const itemProductMap = itemSearchMap;

  if (allStoreIds.size === 0) {
    return {
      storeInventory: new Map(),
      allStoreIds: new Set(),
      itemProductMap: new Map(),
      productStoreMap: new Map(),
    };
  }

  return { storeInventory, allStoreIds, itemProductMap, productStoreMap };
};

/**
 * [BARU] Mendapatkan detail produk untuk solusi One-Stop-Shop.
 */
const getProductDetailsForOneStopShop = async (
  sid,
  items,
  itemProductMap
) => {
  const pidsToFetch = [];
  for (const item of items) {
    const matchingProducts = itemProductMap.get(item);
    // Cari pid pertama untuk item ini yang ada di toko pemenang
    const found = matchingProducts.find(p => p.sid === sid);
    if (found) {
      pidsToFetch.push(found.pid);
    }
  }

  if (pidsToFetch.length === 0) return [];

  const productDetails = await knex("products")
    .select("pid", "name", "image", "price")
    .whereIn("pid", pidsToFetch);

  return productDetails;
};

/**
 * [MODIFIKASI] Membangun matriks DAN peta inventaris untuk node ACO.
 */
const buildNodeListAndMatrix = async (
  storeIds,
  userLat,
  userLng,
  storeInventory, // Map<sid, Set<item_name>>
  productStoreMap // Map<sid, Map<item_name, pid[]>>
) => {
  const storeLocations = await knex("stores")
    .select(
      "sid",
      knex.raw("ST_X(location::geometry) as lng"),
      knex.raw("ST_Y(location::geometry) as lat")
    )
    .whereIn("sid", storeIds);

  const nodes = [{ type: "user", id: 0, lat: userLat, lng: userLng }];
  const storeIdToIndex = new Map();

  storeLocations.forEach((store, i) => {
    const nodeIndex = i + 1;
    nodes.push({ type: "store", id: store.sid, lat: store.lat, lng: store.lng });
    storeIdToIndex.set(store.sid, nodeIndex);
  });

  const numNodes = nodes.length;
  const distanceMatrix = Array(numNodes).fill(0).map(() => Array(numNodes).fill(0));

  for (let i = 0; i < numNodes; i++) {
    for (let j = i + 1; j < numNodes; j++) {
      const dist = getHaversineDistance(
        nodes[i].lat, nodes[i].lng,
        nodes[j].lat, nodes[j].lng
      );
      distanceMatrix[i][j] = dist;
      distanceMatrix[j][i] = dist;
    }
  }

  // Konversi peta inventaris dari sid -> nodeIndex
  const nodeInventory = new Map(); // Map<nodeIndex, Set<item_name>>
  const nodeItemProductMap = new Map(); // Map<nodeIndex, Map<item_name, pid[]>>

  for (const [sid, items] of storeInventory.entries()) {
    if (storeIdToIndex.has(sid)) {
      nodeInventory.set(storeIdToIndex.get(sid), items);
    }
  }
  for (const [sid, itemProductData] of productStoreMap.entries()) {
    if (storeIdToIndex.has(sid)) {
      nodeItemProductMap.set(storeIdToIndex.get(sid), itemProductData);
    }
  }

  return { nodes, distanceMatrix, nodeInventory, nodeItemProductMap };
};

/**
 * [MODIFIKASI] Menjalankan ACO. Sekarang mengambil `nodeItemProductMap` dan mengembalikan `bestShoppingBag`.
 */
const runACO = (
  nodes,
  distanceMatrix,
  nodeInventory,
  nodeItemProductMap, // <-- BARU
  numItemsRequired
) => {
  const numNodes = nodes.length;
  let pheromones = Array(numNodes).fill(0).map(() => Array(numNodes).fill(1.0));
  let bestPath = [];
  let bestDistance = Infinity;
  let bestShoppingBag = new Map(); // <-- BARU

  for (let i = 0; i < ACO_CONFIG.iterations; i++) {
    let allAntPaths = [];

    for (let ant = 0; ant < ACO_CONFIG.numAnts; ant++) {
      const antPath = buildAntPath( // <-- DIMODIFIKASI
        nodes,
        distanceMatrix,
        pheromones,
        nodeInventory,
        nodeItemProductMap, // <-- BARU
        numItemsRequired
      );
      allAntPaths.push(antPath);

      if (antPath.distance < bestDistance) {
        bestDistance = antPath.distance;
        bestPath = antPath.path;
        bestShoppingBag = antPath.shoppingBag; // <-- BARU
      }
    }

    // Evaporasi & Deposit Pheromones (Tidak berubah)
    for (let row = 0; row < numNodes; row++) {
      for (let col = 0; col < numNodes; col++) {
        pheromones[row][col] *= (1.0 - ACO_CONFIG.evaporation);
      }
    }
    allAntPaths.forEach(ant => {
      if (ant.path.length > 1) {
        const pheromoneDeposit = ACO_CONFIG.q / ant.distance;
        for (let j = 0; j < ant.path.length - 1; j++) {
          const nodeA = ant.path[j];
          const nodeB = ant.path[j + 1];
          pheromones[nodeA][nodeB] += pheromoneDeposit;
          pheromones[nodeB][nodeA] += pheromoneDeposit;
        }
      }
    });
  }

  // Konversi path dari node indices -> store IDs
  const storeIdPath = bestPath
    .filter(nodeIndex => nodes[nodeIndex].type === "store")
    .map(nodeIndex => nodes[nodeIndex].id);

  return { bestPath: storeIdPath, bestDistance, bestShoppingBag }; // <-- BARU
};

/**
 * [MODIFIKASI] Otak Semut. Sekarang melacak PID di `shoppingBag`.
 */
const buildAntPath = (
  nodes,
  distanceMatrix,
  pheromones,
  nodeInventory,
  nodeItemProductMap, // <-- BARU
  numItemsRequired
) => {
  let path = [0];
  let visited = new Set([0]);
  let collectedItems = new Set();
  let currentDistance = 0;
  let currentNode = 0;
  let shoppingBag = new Map(); // Map<sid, pid[]> <-- BARU

  while (collectedItems.size < numItemsRequired) {
    const nextNode = selectNextNode( // (Tidak berubah)
      currentNode,
      visited,
      collectedItems,
      nodes,
      distanceMatrix,
      pheromones,
      nodeInventory
    );

    if (nextNode === -1) break;

    const real_sid = nodes[nextNode].id;
    const itemsAtNode = nodeInventory.get(nextNode) || new Set();
    const productsAtNode = nodeItemProductMap.get(nextNode) || new Map();
    
    let productsToBuyAtThisStore = new Set();

    // Cek item BARU apa yang bisa didapat di toko ini
    itemsAtNode.forEach(item => {
      if (!collectedItems.has(item)) {
        // Ambil item ini!
        collectedItems.add(item);
        
        // Cari PID untuk item ini di toko ini
        if (productsAtNode.has(item) && productsAtNode.get(item).length > 0) {
          const pidToPick = productsAtNode.get(item)[0]; // Ambil PID pertama
          productsToBuyAtThisStore.add(pidToPick);
        }
      }
    });

    // Perbarui state semut
    visited.add(nextNode);
    path.push(nextNode);
    currentDistance += distanceMatrix[currentNode][nextNode];
    if (productsToBuyAtThisStore.size > 0) {
      shoppingBag.set(real_sid, Array.from(productsToBuyAtThisStore));
    }
    currentNode = nextNode;
  }

  if (collectedItems.size === numItemsRequired) {
    return { path, distance: currentDistance, shoppingBag }; // <-- BARU
  } else {
    return { path: [], distance: Infinity, shoppingBag: new Map() }; // <-- BARU
  }
};

/**
 * [BARU] Mengambil semua data dari DB dan membangun respons JSON MULTI_STOP_ROUTE.
 */
const buildMultiStopResponse = async (
  bestPath, // sid[]
  bestDistance,
  bestShoppingBag, // Map<sid, pid[]>
  numItemsRequired
) => {
  const allSids = bestPath;
  const allPids = [...bestShoppingBag.values()].flat();

  // 1. Ambil detail produk
  const productDetails = await knex("products")
    .select("pid", "name", "image", "price")
    .whereIn("pid", allPids);
  const productMap = new Map(productDetails.map(p => [p.pid, p]));

  // 2. Ambil detail toko
  const storeDetails = await knex("stores")
    .select(
      "sid",
      "name",
      "address",
      knex.raw("ST_X(location::geometry) as lng"),
      knex.raw("ST_Y(location::geometry) as lat")
    )
    .whereIn("sid", allSids);
  const storeMap = new Map(storeDetails.map(s => [s.sid, s]));

  // 3. Bangun array "stops"
  const stops = bestPath.map((sid, index) => {
    const store = storeMap.get(sid);
    const pidsForThisStore = bestShoppingBag.get(sid) || [];
    const itemsToBuy = pidsForThisStore.map(pid => productMap.get(pid)).filter(Boolean);

    return {
      stop: index + 1,
      sid: store.sid,
      name: store.name,
      address: store.address,
      lat: store.lat,
      lng: store.lng,
      itemsToBuy: itemsToBuy,
    };
  });

  const distance = parseFloat(bestDistance).toFixed(1);

  return {
    responseText: `Saya tidak menemukan satu toko yang menjual semuanya. Namun, saya menemukan rute terbaik untuk ${numItemsRequired} barang Anda. Rute ini sekitar ${distance} km dan mengunjungi ${stops.length} toko.`,
    resultData: {
      mode: "MULTI_STOP_ROUTE",
      totalDistance_km: bestDistance,
      totalItemsFound: numItemsRequired,
      stops: stops,
    },
  };
};


// --- FUNGSI HELPER YANG TIDAK BERUBAH ---

/**
 * (Tidak berubah)
 */
const findClosestStore = async (storeIds, userLat, userLng) => {
  const userLocation = `POINT(${userLng} ${userLat})`;
  const result = await knex("stores")
    .select(
      "sid",
      "name",
      "address",
      knex.raw("ST_X(location::geometry) as lng"),
      knex.raw("ST_Y(location::geometry) as lat"),
      knex.raw(
        "ST_Distance(location, ST_GeographyFromText(?)) / 1000 as distance_km",
        [userLocation]
      )
    )
    .whereIn("sid", storeIds)
    .orderBy("distance_km", "asc")
    .first();
  return result;
};

/**
 * (Tidak berubah)
 */
const selectNextNode = (
  currentNode,
  visited,
  collectedItems,
  nodes,
  distanceMatrix,
  pheromones,
  nodeInventory
) => {
  const probabilities = [];
  let totalProbability = 0;

  for (let nextNode = 1; nextNode < nodes.length; nextNode++) { // Mulai dari 1 (abaikan user)
    if (visited.has(nextNode)) {
      probabilities.push({ node: nextNode, prob: 0 });
      continue;
    }

    const distance = distanceMatrix[currentNode][nextNode];
    if (distance === 0) {
      probabilities.push({ node: nextNode, prob: 0 });
      continue;
    }

    const pheromone = pheromones[currentNode][nextNode];
    const itemsAtNode = nodeInventory.get(nextNode) || new Set();
    let newItemsCount = 0;
    itemsAtNode.forEach(item => {
      if (!collectedItems.has(item)) newItemsCount++;
    });

    // Heuristic: (1 / distance) * (1 + newItemsCount)
    const heuristic = (1.0 / distance) * (1.0 + newItemsCount * 2); // (Pemberat 2x untuk item baru)

    const prob =
      Math.pow(pheromone, ACO_CONFIG.alpha) *
      Math.pow(heuristic, ACO_CONFIG.beta);

    probabilities.push({ node: nextNode, prob: prob });
    totalProbability += prob;
  }

  if (totalProbability === 0) return -1;

  const rand = Math.random() * totalProbability;
  let cumulativeProb = 0;
  for (const p of probabilities) {
    cumulativeProb += p.prob;
    if (rand <= cumulativeProb) return p.node;
  }
  return -1;
};

/**
 * (Tidak berubah)
 */
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  function toRad(x) { return x * Math.PI / 180; }
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Ekspor fungsi utama
module.exports = { findShoppingListSolution };
const { HierarchicalNSW } = require("hnswlib-node");
const knex = require("../db/knex");
const logger = require("../config/logger");

// HNSWLib uses a "label" (like a primary key) to identify vectors.
// We'll create a mapping to store which label belongs to which product/store.
const LabeledVector = {
  // We'll use low numbers for products and high numbers for stores
  // e.g., label '100' is product 100. label '1000001' is store 1.
  STORE_OFFSET: 1000000,

  getLabel: (type, id) => {
    return type === "store" ? id + LabeledVector.STORE_OFFSET : id;
  },

  getTypeAndId: (label) => {
    if (label >= LabeledVector.STORE_OFFSET) {
      return { type: "store", id: label - LabeledVector.STORE_OFFSET };
    }
    return { type: "product", id: label };
  },
};

class VectorCacheService {
  constructor() {
    this.index = null; // This will hold our search index
    this.isInitialized = false;
    // --- THIS IS THE FIX ---
    this.dimensions = 1536; // OpenAI text-embedding-3-small
  }

  /**
   * Loads all vectors from the database into the in-memory index.
   * This should be called once when the server starts.
   */
  async initialize() {
    if (this.isInitialized) return;
    logger.info("Initializing Vector Cache Service...");

    // 1. Initialize HNSWLib
    this.index = new HierarchicalNSW("cosine", this.dimensions);
    this.index.initIndex(100000); // Set max elements (adjust if you have more)

    let totalVectors = 0;

    // 2. Load all product vectors
    try {
      const products = await knex("products")
        .select("pid", "vector")
        .whereNotNull("vector");
      products.forEach((product) => {
        // --- THIS IS THE FIX ---
        // We must parse the JSON string from the DB
        const vector = JSON.parse(product.vector);
        const label = LabeledVector.getLabel("product", product.pid);
        this.index.addPoint(vector, label);
        totalVectors++;
      });
      logger.info(`Loaded ${products.length} product vectors into cache.`);
    } catch (e) {
      logger.error("Failed to load product vectors:", e);
    }

    // 3. Load all store vectors
    try {
      const stores = await knex("stores")
        .select("sid", "vector")
        .whereNotNull("vector");
      stores.forEach((store) => {
        // --- THIS IS THE FIX ---
        // We must parse the JSON string from the DB
        const vector = JSON.parse(store.vector);
        const label = LabeledVector.getLabel("store", store.sid);
        this.index.addPoint(vector, label);
        totalVectors++;
      });
      logger.info(`Loaded ${stores.length} store vectors into cache.`);
    } catch (e) {
      logger.error("Failed to load store vectors:", e);
    }

    this.isInitialized = true;
    logger.info(`Vector Cache initialized with ${totalVectors} total vectors.`);
  }

  /**
   * Searches the in-memory index for the closest vectors.
   * @param {number[]} queryVector - The vector to search for.
   * @param {number} k - The number of results to return.
   * @returns { {type: string, id: number, distance: number}[] }
   */
  search(queryVector, k = 10) {
    if (!this.isInitialized) {
      logger.warn("VectorCacheService.search() called before initialization.");
      return [];
    }

    // Perform the search
    const results = this.index.searchKnn(queryVector, k);

    // Map the labels back to our {type, id} format
    const mappedResults = results.neighbors.map((label, i) => ({
      ...LabeledVector.getTypeAndId(label),
      distance: results.distances[i],
    }));

    // --- NEW LOG ---
    // Log ini SANGAT PENTING untuk melihat relevansi mentah dari HNSW
    logger.info(`[HNSW Search] Found ${mappedResults.length} raw semantic results.`, {
      top5Results: mappedResults.slice(0, 5) // Log 5 teratas
    });

    return mappedResults;
  }
}

// Create a single instance to be used by the whole app
const vectorCache = new VectorCacheService();

module.exports = vectorCache;
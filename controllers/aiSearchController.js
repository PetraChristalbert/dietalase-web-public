const knex = require("../db/knex");
const logger = require("../config/logger");
const { formatProducts } = require("../utils/productFormatter");
const {
  generateEmbedding, // Import the unified function
  TaskType, // Import the TaskType enum
} = require("../services/embeddingService");
const vectorCache = require("../services/vectorCacheService");

/**
 * Performs a semantic search.
 */
const aiSearch = async (req, res) => {
  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: "Search query is required." });
  }

  try {
    // 1. --- FINAL FIX ---
    // Call the same generateEmbedding function, passing the query TaskType
    const queryVector = await generateEmbedding(query, TaskType.RETRIEVAL_QUERY);

    if (!queryVector) {
      throw new Error("Failed to generate query vector.");
    }
    // --- END OF FIX ---

    // 2. Search the in-memory cache
    const searchResults = vectorCache.search(queryVector, 10);

    const productIds = [];
    const storeIds = [];

    // 3. Separate the results
    searchResults.forEach((result) => {
      if (result.type === "product") {
        productIds.push(result.id);
      } else if (result.type === "store") {
        storeIds.push(result.id);
      }
    });

    // 4. Fetch from database
    const products = productIds.length
      ? await knex("products")
          .join("stores", "products.sid", "=", "stores.sid")
          .select(
            "products.*",
            "stores.name as store_name",
            "stores.subscription_status",
            knex.raw("ST_Y(stores.location::geometry) as latitude"),
            knex.raw("ST_X(stores.location::geometry) as longitude"),
            knex.raw("CASE WHEN stores.subscription_status = 'legend' THEN 1 WHEN stores.subscription_status = 'pro' THEN 2 ELSE 3 END as tier_rank")
          )
          .whereIn("products.pid", productIds)
          .orderByRaw(
            knex.raw(
              `array_position(ARRAY[${productIds.map((_) => "?").join(",")}]::int[], products.pid)`,
              productIds
            )
          )
      : [];

    const stores = storeIds.length
      ? await knex("stores")
          .select(
            "*",
            knex.raw("ST_Y(location::geometry) as latitude"),
            knex.raw("ST_X(location::geometry) as longitude"),
            knex.raw("CASE WHEN subscription_status = 'legend' THEN 1 WHEN subscription_status = 'pro' THEN 2 ELSE 3 END as tier_rank")
          )
          .whereIn("sid", storeIds)
          .orderByRaw(
            knex.raw(
              `array_position(ARRAY[${storeIds.map((_) => "?").join(",")}]::int[], sid)`,
              storeIds
            )
          )
      : [];

    stores.forEach((s) => delete s.location);

    // 5. Return the results (formatted for Flutter)
    return res.json({
      products: formatProducts(products),
      stores: stores,
    });
  } catch (error) {
    logger.error("Error in AI search:", error);
    return res.status(500).json({ error: "AI search failed." });
  }
};

module.exports = {
  aiSearch,
};
const knex = require("../db/knex");
const logger = require("../config/logger");
const { formatProducts } = require("../utils/productFormatter");

// Helper to strip HTML tags
const stripTags = (str = "") => str.replace(/<[^>]*>?/gm, "");
// Helper to replace newlines
const cleanDescription = (str = "") => str.replace(/[\r\n]+/g, " ");

/*
 * Converts: search_product_store
 * Optimized for PostgreSQL Trigrams, JSONB, and Weighted Ranking
 */
const search_product_store = async (req, res) => {
  // Destructure parameter bawaan dan parameter filter tingkat lanjut (dengan default values)
  const { 
    keyword = "", 
    latitude, 
    longitude, 
    city, 
    page = 1, 
    limit = 20,
    // --- Advanced Filter Params ---
    scope = 'Lokal & Sekitar',
    radius = 15,
    category = 'Semua',
    minPrice,
    maxPrice,
    openNow = false,
    sortBy = 'Jarak',
    userCountry = 'Indonesia',
    eid // Optional: For premium feature checks
  } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      error: "Latitude and longitude are required",
    });
  }

  const offset = (page - 1) * limit;
  const radiusInMeters = radius * 1000;
  const userPointWKT = `POINT(${longitude} ${latitude})`;

  try {
    // ========================================================
    // 1. REUSABLE FILTER ENGINE
    // ========================================================
    const applyFilters = (queryBuilder, isProductQuery = true) => {
      // A. Scope & Radius Filter
      if (scope === 'Lokal & Sekitar') {
        queryBuilder.whereRaw("ST_DWithin(stores.location, ST_GeogFromText(?), ?)", [userPointWKT, radiusInMeters]);
      } else if (scope === 'Nasional') {
        queryBuilder.where('stores.country', userCountry);
      }
      // Jika 'Internasional', kita tidak memberikan batasan geo-spatial/negara.

      // B. Category Filter
      if (category && category !== 'Semua') {
        queryBuilder.where('stores.type', category);
      }

      // C. Open Now Filter
      // Menggunakan PostgreSQL EXTRACT(ISODOW) di mana 1 = Senin, 7 = Minggu
      if (openNow === true || openNow === 'true') {
        queryBuilder
          .join('store_operating_hours as soh', 'stores.sid', '=', 'soh.sid')
          .whereRaw('soh.day_of_week = EXTRACT(ISODOW FROM CURRENT_TIMESTAMP)')
          .whereRaw('CURRENT_TIME BETWEEN soh.open_time AND soh.close_time');
      }

      // D. Keyword Filter
      if (keyword) {
        if (isProductQuery) {
          queryBuilder.where(function() {
            this.whereRaw("products.name % ?", [keyword])
                .orWhereRaw("products.name ILIKE ?", [`%${keyword}%`])
                .orWhereRaw("products.search_tags @> ?", [JSON.stringify([keyword])]);
          });
        } else {
          queryBuilder.where(function() {
             this.whereRaw("stores.name % ?", [keyword])
                 .orWhereRaw("stores.name ILIKE ?", [`%${keyword}%`]);
          });
        }
      }

      // E. Product-Specific Filters (Prices & Status)
      if (isProductQuery) {
        queryBuilder.where("products.status", "approved");
        
        if (minPrice !== undefined && minPrice !== '') {
          queryBuilder.where('products.price', '>=', Number(minPrice));
        }
        if (maxPrice !== undefined && maxPrice !== '') {
          queryBuilder.where('products.price', '<=', Number(maxPrice));
        }
      }
    };

    // ========================================================
    // 2. PRODUCT QUERY
    // ========================================================
    const productQuery = knex("products")
      .join("stores", "products.sid", "=", "stores.sid")
      .select(
        "products.*", 
        "stores.name as store_name",
        "stores.address", 
        "stores.city", 
        "stores.subscription_status",
        knex.raw("ST_Y(stores.location::geometry) as latitude"),
        knex.raw("ST_X(stores.location::geometry) as longitude")
      );

    if (keyword) {
      productQuery.select(knex.raw("similarity(products.name, ?) as name_score", [keyword]));
    }

    // Eksekusi filter inti
    applyFilters(productQuery, true);

    // Dynamic Sorting for Products
    if (sortBy === 'Jarak') {
      productQuery.orderByRaw("ST_Distance(stores.location, ST_GeogFromText(?)) ASC", [userPointWKT]);
    } else if (sortBy === 'Rating') {
      productQuery.orderBy('stores.avg_rating', 'desc');
    } else if (sortBy === 'Popularitas') {
      productQuery.orderBy('stores.total_visits', 'desc');
    } else {
      // Default / Fallback Sorting (Weighted Score)
      if (keyword) {
        productQuery.orderByRaw("(similarity(products.name, ?) * 0.5 + (1.0 / (1.0 + ST_Distance(stores.location, ST_GeogFromText(?)) / 5000)) * 0.3 + (CASE WHEN stores.subscription_status = 'maestro' THEN 1.0 WHEN stores.subscription_status = 'artisan' THEN 0.7 ELSE 0.4 END) * 0.2) DESC", [keyword, userPointWKT]);
      } else {
        productQuery.orderByRaw("ST_Distance(stores.location, ST_GeogFromText(?)) ASC", [userPointWKT]);
      }
    }

    // Eksekusi Paginasi
    const rawProducts = await productQuery.limit(limit).offset(offset);

    // ========================================================
    // 3. PAGINATION METADATA QUERY
    // ========================================================
    const countQuery = knex("products").join("stores", "products.sid", "=", "stores.sid");
    applyFilters(countQuery, true);
    const totalCount = await countQuery.count("products.pid as count").first();
    const products = formatProducts(rawProducts);

    // ========================================================
    // 4. STORES QUERY
    // ========================================================
    const storeQuery = knex("stores")
      .select(
        "stores.*", 
        knex.raw("ST_Y(stores.location::geometry) as latitude"),
        knex.raw("ST_X(stores.location::geometry) as longitude"),
        knex.raw("ST_Distance(stores.location, ST_GeogFromText(?)) / 1000 AS distance", [userPointWKT])
      );

    if (keyword) {
      storeQuery.select(knex.raw("similarity(stores.name, ?) as score", [keyword]));
    }

    // Eksekusi filter inti
    applyFilters(storeQuery, false);

    // Dynamic Sorting for Stores
    if (sortBy === 'Jarak') {
      storeQuery.orderByRaw("ST_Distance(stores.location, ST_GeogFromText(?)) ASC", [userPointWKT]);
    } else if (sortBy === 'Rating') {
      storeQuery.orderBy('stores.avg_rating', 'desc');
    } else if (sortBy === 'Popularitas') {
      storeQuery.orderBy('stores.total_visits', 'desc');
    } else {
      // Default Sorting
      if (keyword) storeQuery.orderBy("score", "desc");
      else storeQuery.orderByRaw("ST_Distance(stores.location, ST_GeogFromText(?)) ASC", [userPointWKT]);
    }

    const stores = await storeQuery.limit(10);
    stores.forEach(store => delete store.location);

    // ========================================================
    // 5. RETURN RESULT & PROACTIVE DISCOVERY
    // ========================================================
    let outOfRangeMatch = null;

    if (parseInt(totalCount.count) === 0 && stores.length === 0 && eid) {
      // Check Premium Status
      const user = await knex("etalovers").where("eid", eid).select("subscription_status").first();
      if (user && user.subscription_status === "premium") {
        const expandedRadius = 50 * 1000; // 50km
        
        // Find closest product
        const closestProduct = await knex("products")
          .join("stores", "products.sid", "=", "stores.sid")
          .select("products.*", "stores.name as store_name", "stores.address", "stores.city", "stores.image as store_image",
            knex.raw("ST_Y(stores.location::geometry) as latitude"),
            knex.raw("ST_X(stores.location::geometry) as longitude"),
            knex.raw("ST_Distance(stores.location, ST_GeogFromText(?)) / 1000 AS distance", [userPointWKT])
          )
          .whereRaw("ST_DWithin(stores.location, ST_GeogFromText(?), ?)", [userPointWKT, expandedRadius])
          .where("products.status", "approved")
          .modify(function(qb) {
             if (keyword) {
                 qb.where(function() {
                    this.whereRaw("products.name % ?", [keyword])
                        .orWhereRaw("products.name ILIKE ?", [`%${keyword}%`])
                        .orWhereRaw("products.search_tags @> ?", [JSON.stringify([keyword])]);
                 });
             }
          })
          .orderByRaw("ST_Distance(stores.location, ST_GeogFromText(?)) ASC", [userPointWKT])
          .limit(1)
          .first();

        // Find closest store
        const closestStore = await knex("stores")
          .select("stores.*",
            knex.raw("ST_Y(stores.location::geometry) as latitude"),
            knex.raw("ST_X(stores.location::geometry) as longitude"),
            knex.raw("ST_Distance(stores.location, ST_GeogFromText(?)) / 1000 AS distance", [userPointWKT])
          )
          .whereRaw("ST_DWithin(stores.location, ST_GeogFromText(?), ?)", [userPointWKT, expandedRadius])
          .modify(function(qb) {
             if (keyword) {
                 qb.where(function() {
                    this.whereRaw("stores.name % ?", [keyword])
                        .orWhereRaw("stores.name ILIKE ?", [`%${keyword}%`]);
                 });
             }
          })
          .orderByRaw("ST_Distance(stores.location, ST_GeogFromText(?)) ASC", [userPointWKT])
          .limit(1)
          .first();

        if (closestProduct && closestStore) {
            if (Number(closestProduct.distance) <= Number(closestStore.distance)) {
                outOfRangeMatch = { type: 'product', distance: Number(closestProduct.distance).toFixed(1), data: closestProduct };
            } else {
                delete closestStore.location;
                outOfRangeMatch = { type: 'store', distance: Number(closestStore.distance).toFixed(1), data: closestStore };
            }
        } else if (closestProduct) {
            outOfRangeMatch = { type: 'product', distance: Number(closestProduct.distance).toFixed(1), data: closestProduct };
        } else if (closestStore) {
            delete closestStore.location;
            outOfRangeMatch = { type: 'store', distance: Number(closestStore.distance).toFixed(1), data: closestStore };
        }
      }
    }

    return res.json({
      products: products,
      stores: stores,
      out_of_range_match: outOfRangeMatch,
      pagination: {
        total: parseInt(totalCount.count),
        page: parseInt(page),
        limit: parseInt(limit),
        has_more: offset + products.length < parseInt(totalCount.count)
      }
    });

  } catch (error) {
    console.error("ERROR in search_product_store:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
};

/*
 * Converts: search_product_detail
 */
const search_product_detail = async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) {
    return res.status(400).json({ error: "Invalid input" });
  }

  const pid = Number(product_id);
  const defaultResponse = {
    store: null,
    products: [],
    reviews: [],
    work_time: [],
  };

  try {
    const product = await knex("products").where("pid", pid).where("status", "approved").first();
    if (!product) {
      return res.json(defaultResponse);
    }

    const store = await knex("stores")
      .select(
        "*",
        knex.raw('ST_Y(location::geometry) as latitude'),
        knex.raw('ST_X(location::geometry) as longitude')
      )
      .where("sid", product.sid)
      .first();

    if (!store) {
      return res.json(defaultResponse);
    }
    delete store.location; // Remove binary location data

    const products = await knex("products")
      .select(
        "pid",
        "sid",
        "name",
        "price",
        "unit",
        "description",
        "image",
        "images",
        "video"
      )
      .where("sid", product.sid)
      .where("status", "approved");

    const reviews = await knex("reviews")
      .join("etalovers", "reviews.eid", "=", "etalovers.eid")
      .select(
        "reviews.eid",
        "etalovers.image",
        "etalovers.name",
        knex.raw("reviews.created_at as date"),
        "reviews.stars",
        "reviews.comment"
      )
      .where("reviews.sid", store.sid)
      .orderBy("reviews.created_at", "desc");

    const work_time = await knex("store_operating_hours")
      .where("sid", store.sid)
      .orderBy("day_of_week");

    return res.json({
      store: store,
      products: formatProducts(products),
      reviews: reviews,
      work_time: work_time,
    });
  } catch (error) {
    logger.error("Error in search_product_detail", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: search_location
 * Uses the Materialized View for high performance
 */
const search_location = async (req, res) => {
  const { keyword } = req.body;

  if (!keyword || String(keyword).length < 2) {
    return res.json([]);
  }

  try {
    const cities = await knex("mv_store_cities")
      .select("city_name as city", "store_count as total")
      .whereRaw("city_name % ?", [keyword])
      .orderByRaw("similarity(city_name, ?) DESC", [keyword])
      .limit(10);

    return res.json(cities);
  } catch (error) {
    logger.error("Error in search_location", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: bookmark_searching
 */
// node js side server :
const bookmark_searching = async (req, res) => {
  const { keyword = "", eid } = req.body;
  if (!eid) {
    return res.status(400).json({ error: "EID is required" });
  }

  const lowerKeyword = String(keyword).toLowerCase();

  try {
    const storedPIDs = await knex("user_saved_products")
      .where("eid", eid)
      .pluck("pid");
    const storedSIDs = await knex("user_saved_stores")
      .where("eid", eid)
      .pluck("sid");

    let productsData = []; 
    
    if (storedPIDs.length > 0) {
      const productsResult = await knex("products")
        .join("stores", "products.sid", "=", "stores.sid")
        .select(
          "products.*",
          "stores.address",
          // The correct cast for products
          knex.raw('ST_Y(location::geometry) as latitude'),
          knex.raw('ST_X(location::geometry) as longitude')
        )
        .whereIn("products.pid", storedPIDs)
        .modify(function (queryBuilder) {
          if (lowerKeyword !== "") {
            queryBuilder.whereRaw("LOWER(products.name) LIKE ?", [
              `%${lowerKeyword}%`,
            ]);
          }
        })
        .limit(10);

      productsResult.forEach((item) => {
        delete item.location;
        item.description = cleanDescription(item.description);
        item.name = stripTags(item.name);
        productsData.push(item);
      });
    }

    // --- Get Stores ---
    let storesData = [];
    if (storedSIDs.length > 0) {
      storesData = await knex("stores")
        .select(
          "*",
          // ✅ THIS IS THE FIX ✅
          // Ensure the cast from geography to geometry is present
          knex.raw('ST_Y(location::geometry) as latitude'),
          knex.raw('ST_X(location::geometry) as longitude')
        )
        .whereIn("sid", storedSIDs)
        .modify(function (queryBuilder) {
          if (lowerKeyword !== "") {
            queryBuilder.whereRaw("LOWER(name) LIKE ?", [`%${lowerKeyword}%`]);
          }
        });

      storesData.forEach((item) => delete item.location);
    }

    return res.json({
      products: productsData,
      stores: storesData,
    });
  } catch (error) {
    console.error("ERROR IN bookmark_searching:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message, 
    });
  }
};

// Export all the functions
module.exports = {
  search_product_store,
  search_product_detail,
  search_location,
  bookmark_searching,
};

const knex = require("../db/knex");
const logger = require("../config/logger");
const { formatProducts } = require("../utils/productFormatter");

// --- Date Helpers (to replace Carbon) ---
const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfWeek = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day; // 0 = Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfMonth = () => {
  const d = new Date();
  // Go to the first day of next month, then subtract 1 millisecond
  d.setMonth(d.getMonth() + 1, 1);
  d.setHours(0, 0, 0, 0);
  d.setMilliseconds(d.getMilliseconds() - 1);
  return d;
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};
// --- End Date Helpers ---

/*
 * Converts: getStoreAndProducts
 */
const getStoreAndProducts = async (req, res) => {
  const { store_id } = req.body;
  if (!store_id) {
    return res.status(422).json({ error: 'Invalid input' });
  }

  const sid = Number(store_id);
  const defaultResponse = { store: null, products: [], reviews: [], work_time: [] };

  try {
    const selectColumns = [
      '*',
      knex.raw('ST_Y(location::geometry) as latitude'),
      knex.raw('ST_X(location::geometry) as longitude')
    ];

    console.log("BODY:", req.body);
    if (req.body.userLat !== undefined && req.body.userLng !== undefined) {
      selectColumns.push(
        knex.raw(`ST_Distance(location, ST_GeogFromText('POINT(${req.body.userLng} ${req.body.userLat})')) / 1000 AS distance`)
      );
    }

    const store = await knex('stores')
      .select(...selectColumns)
      .where('sid', sid)
      .first();

    if (!store) {
      return res.json(defaultResponse);
    }
    delete store.location; // Remove binary location data

    // Public Data Sanitization: Strip secure KTP and NIB paths from public API response
    if (store.owner_image) {
      if (store.owner_image.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(store.owner_image);
          store.owner_image = parsed.selfie || ""; // Only expose the public selfie!
        } catch (_) {
          store.owner_image = "";
        }
      }
    }

    const reviews = await knex("reviews")
      .join("etalovers", "reviews.eid", "=", "etalovers.eid")
      .select(
        "reviews.eid",
        "etalovers.image",
        "etalovers.name",
        "reviews.created_at as date",
        "reviews.stars",
        "reviews.comment"
      )
      .where("reviews.sid", sid)
      .orderBy("reviews.created_at", "desc");

    const work_time = await knex("store_operating_hours")
      .where("sid", sid)
      .orderBy("day_of_week");

    const products = store.vacation_mode 
      ? [] 
      : await knex("products").where("sid", sid).where("status", "approved");

    return res.json({
      store: store, // store is already an object, no need to cast
      products: products,
      reviews: reviews,
      work_time: work_time,
    });
  } catch (error) {
    // 1. Log the ENTIRE error object to your server's console.
    console.error("ERROR in getStoreAndProducts:", error);

    // 2. Send a more descriptive error back to Flutter for debugging.
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message, // This will contain the specific database error
    });
  }
};

/*
 * Converts: getStoreDashboardMetrics
 */
const getStoreDashboardMetrics = async (req, res) => {
  const sid = req.user?.sid;
  if (!sid) return res.status(403).json({ error: "Store authentication required" });

  try {
    const store = await knex("stores").where("sid", sid).first();
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Total Pengunjung
    const visitorData = await knex("visits")
      .where("sid", sid)
      .countDistinct("eid as totalVisitors")
      .first();
    const totalVisitors = Number(visitorData.totalVisitors || 0);

    // Produk Dilihat
    const viewsData = await knex("product_visit_stats")
      .where("sid", sid)
      .sum("visit_count as totalViews")
      .first();
    const totalViews = Number(viewsData.totalViews || 0);

    // Rating Terkini
    const ratingData = await knex("reviews")
      .where("sid", sid)
      .count("* as rating_count")
      .avg("stars as average_rating")
      .first();

    const averageRating = parseFloat(ratingData.average_rating || 0).toFixed(1); // round(..., 1)
    const ratingCount = Number(ratingData.rating_count || 0);

    return res.json({
      total_visitors: totalVisitors,
      total_views: totalViews,
      average_rating: parseFloat(averageRating), // Send as number
      rating_count: ratingCount,
    });
  } catch (error) {
    logger.error("Error in getStoreDashboardMetrics", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: getStoreAnalysis
 */
const getStoreAnalysis = async (req, res) => {
  const { range = "bulan" } = req.body;
  const sid = req.user?.sid;
  
  if (!sid) {
    return res.status(403).json({ error: "Store authentication required" });
  }

  try {
    const store = await knex("stores").where("sid", sid).first();
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    // Waktu filter
    let startDate;
    switch (range) {
      case "hari":
        startDate = startOfToday();
        break;
      case "minggu":
        startDate = startOfWeek();
        break;
      case "bulan":
        startDate = startOfMonth();
        break;
      default:
        startDate = null; // all data
    }

    const jsStartOfMonth = startOfMonth();
    const jsMidOfMonth = addDays(jsStartOfMonth, 15);
    const jsEndOfMonth = endOfMonth();

    const firstHalfData = await knex("product_visit_stats")
      .where("sid", sid)
      .whereBetween("visit_date", [jsStartOfMonth, jsMidOfMonth])
      .sum("visit_count as sum")
      .first();
    const firstHalf = Number(firstHalfData.sum || 0);

    const secondHalfData = await knex("product_visit_stats")
      .where("sid", sid)
      .whereBetween("visit_date", [addDays(jsMidOfMonth, 1), jsEndOfMonth])
      .sum("visit_count as sum")
      .first();
    const secondHalf = Number(secondHalfData.sum || 0);

    let percentChange = 0;
    if (firstHalf > 0) {
      percentChange = ((secondHalf - firstHalf) / firstHalf) * 100;
    }

    let trendLabel, trendColor, trendImage;
    if (percentChange > 20) {
      trendLabel = "Naik Signifikan";
      trendColor = "green";
      trendImage = "increase";
    } else if (percentChange >= -10) {
      trendLabel = "Stabil";
      trendColor = "green";
      trendImage = "increase";
    } else {
      trendLabel = "Menurun Drastis";
      trendColor = "red";
      trendImage = "decrease";
    }
    const trendPercentage = percentChange.toFixed(1);

    // Total Produk Dilihat
    const totalViewsData = await knex("product_visit_stats")
      .where("sid", sid)
      .modify((q) => {
        if (startDate) q.where("visit_date", ">=", startDate);
      })
      .sum("visit_count as sum")
      .first();
    const totalViews = Number(totalViewsData.sum || 0);

    // Total Pengunjung Unik
    const totalVisitorsData = await knex("visits")
      .where("sid", sid)
      .modify((q) => {
        if (startDate) q.where("timestamp", ">=", startDate);
      })
      .countDistinct("eid as count")
      .first();
    const totalVisitors = Number(totalVisitorsData.count || 0);

    // Grafik Data per Hari
    const graphQuery = await knex("product_visit_stats")
      .select(
        knex.raw("visit_date as date"),
        knex.raw("SUM(visit_count) as total")
      )
      .where("sid", sid)
      .modify((q) => {
        if (startDate) q.where("visit_date", ">=", startDate);
      })
      .groupBy("visit_date")
      .orderBy("visit_date");

    // Produk Terlaris (max 9)
    const topProducts = await knex("product_visit_stats")
      .select("pid", knex.raw("SUM(visit_count) as views"))
      .where("sid", sid)
      .modify((q) => {
        if (startDate) q.where("visit_date", ">=", startDate);
      })
      .groupBy("pid")
      .orderBy("views", "desc")
      .limit(9);

    // Optimized: Fetch all product info in one query to avoid N+1
    const productIds = topProducts.map((p) => p.pid);
    const productsInfo = await knex("products")
      .select("pid", "name", "image")
      .whereIn("pid", productIds);

    const productsMap = new Map(productsInfo.map((p) => [p.pid, p]));

    const productData = topProducts.map((prod) => {
      const p = productsMap.get(prod.pid);
      return {
        pid: prod.pid,
        views: prod.views,
        name: p ? p.name : null,
        image: p ? p.image : null,
      };
    });

    return res.json({
      trend: {
        label: trendLabel,
        percentage: trendPercentage,
        color: trendColor,
        image: trendImage,
      },
      total_views: totalViews,
      total_visitors: totalVisitors,
      chart_data: graphQuery,
      top_products: productData,
    });
  } catch (error) {
    logger.error("Error in getStoreAnalysis", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

/*
 * Converts: updateProfile
 */
const updateProfile = async (req, res) => {
  const sid = req.user?.sid;
  if (!sid) return res.status(403).json({ error: "Store authentication required" });

  try {
    const store = await knex("stores").where("sid", sid).first();
    if (!store) {
      return res.status(404).json({ message: "Store not found" });
    }

    // Build the data object from validated fields
    // This replaces Validator::make and array_filter
    const data = {};
    const fields = [
      "name",
      "type",
      "facebook",
      "instagram",
      "tiktok",
      "x_account",
      "youtube",
      "contact",
      "email",
    ];

    for (const field of fields) {
      if (req.body[field] !== undefined && req.body[field] !== null) {
        data[field] = req.body[field];
      }
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    await knex("stores").where("sid", sid).update(data);

    const updated = await knex("stores").where("sid", sid).first();
    delete updated.location; // Remove binary data

    // Public Data Sanitization: Strip secure KTP and NIB paths from response
    if (updated.owner_image) {
      if (updated.owner_image.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(updated.owner_image);
          updated.owner_image = parsed.selfie || "";
        } catch (_) {
          updated.owner_image = "";
        }
      }
    }

    return res.json({ message: "OK", store: updated });
  } catch (error) {
    logger.error("Error in updateProfile", { error: error.message });
    return res.status(500).json({ message: "Database error" });
  }
};

// Export all the functions
module.exports = {
  getStoreAndProducts,
  getStoreDashboardMetrics,
  getStoreAnalysis,
  updateProfile,
};

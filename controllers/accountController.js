const knex = require("../db/knex");
const logger = require("../config/logger");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || 'dietalase_secret_key_2026';

// --- Helper function for consistent error handling ---
const handleError = (res, error, message, statusCode = 500) => {
  logger.error(message, { error: error.message });
  return res.status(statusCode).json({ status: false, message: message });
};

/*
 * Converts: public function fetchOrCreateUser(Request $request)
 */
const fetchOrCreateUser = async (req, res) => {
  const { 
    android_id, 
    installation_id, 
    firebase_id = "", 
    fcm_token = "" 
  } = req.body;

  // Accept either android_id or installation_id to maintain compatibility
  const primaryId = installation_id || android_id;

  if (!primaryId) {
    return res.status(400).json({ error: "installation_id or android_id is required" });
  }

  try {
    let currentUser;

    // 1. If firebase_id is provided, try to find the user by firebase_id first.
    if (firebase_id) {
      // First, try to find a perfect match (both firebase_id and installation_id)
      let user = await knex("etalovers")
        .where("firebase_id", firebase_id)
        .andWhere("installation_id", primaryId)
        .first();

      if (user) {
        // Perfect match found. Just update token.
        await knex("etalovers")
          .where("eid", user.eid)
          .update({ fcm_token: fcm_token, updated_at: knex.fn.now() });
        currentUser = await knex("etalovers").where("eid", user.eid).first();
      } else {
        // Not a perfect match. Find their most recent profile by firebase_id
        user = await knex("etalovers")
          .where("firebase_id", firebase_id)
          .orderBy("eid", "asc")
          .first();

        if (user) {
          // Check if the new installation_id is already claimed (e.g. by a temporary guest profile)
          const guestUser = await knex("etalovers").where("installation_id", primaryId).first();
          if (guestUser) {
            // Delete the blocking profile so we can take over its installation_id
            await knex("etalovers").where("eid", guestUser.eid).delete();
          }

          // Migrate their old profile to the new installation_id
          await knex("etalovers")
            .where("eid", user.eid) // MUST target by eid to avoid updating duplicates
            .update({
              installation_id: primaryId,
              android_id: android_id || primaryId,
              fcm_token: fcm_token,
              updated_at: knex.fn.now()
            });
          
          currentUser = await knex("etalovers").where("eid", user.eid).first();
        }
      }
    }

    // 2. If not found by firebase_id, try by installation_id (or create new)
    if (!currentUser) {
      const inserted = await knex("etalovers")
        .insert({
          installation_id: primaryId,
          android_id: android_id || primaryId,
          firebase_id: firebase_id,
          fcm_token: fcm_token,
          name: "User Baru",
          image: "",
          theme: "Light",
        })
        .onConflict("installation_id")
        .merge({
          firebase_id: firebase_id,
          fcm_token: fcm_token,
          updated_at: knex.fn.now()
        })
        .returning("*");

      currentUser = inserted[0];
    }

    // Fetch related data in parallel for efficiency
    const [saved_pids, saved_sids] = await Promise.all([
      knex("user_saved_products").where("eid", currentUser.eid).pluck("pid"),
      knex("user_saved_stores").where("eid", currentUser.eid).pluck("sid"),
    ]);

    // Construct the final response object
    const responsePayload = {
      ...currentUser,
      stored_product_id: saved_pids.join("`"),
      stored_store_id: saved_sids.join("`"),
    };

    const token = jwt.sign(
      { eid: currentUser.eid, role: 'user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json({
      ...responsePayload,
      token: token,
    });
  } catch (error) {
    // It's good practice to log the actual error for debugging
    console.error("Database error in fetchOrCreateUser:", error);

    // 2. Send a clear JSON error response back to Flutter.
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message, // Send the actual error message for debugging
    });
  }
};

/*
 * Converts: public function storeSID(Request $request)
 */
const storeSID = async (req, res) => {
  const sid = req.body.sid;
  const eid = req.user?.eid || req.body.eid; // Prefer secure token ID
  logger.info("storeSID called", { sid: sid, eid: eid });

  if (!sid || !eid) {
    logger.warn("Missing sid or eid", { sid: sid, eid: eid });
    return res
      .status(400)
      .json({ status: false, message: "Missing sid or eid" });
  }

  try {
    // DB::table('user_saved_stores')->insertOrIgnore(...)
    // .onConflict().ignore() is the Knex equivalent
    await knex("user_saved_stores")
      .insert({
        eid: eid,
        sid: sid,
        saved_at: new Date(), // new Date() is the JS equivalent of now()
      })
      .onConflict(["eid", "sid"]) // Assumes a unique constraint on (eid, sid)
      .ignore();

    return res.json({
      status: true,
      message: "Store ID added or already stored",
    });
  } catch (error) {
    return handleError(res, error, "Failed to store SID");
  }
};

/*
 * Converts: public function removeSID(Request $request)
 */
const removeSID = async (req, res) => {
  const sid = req.body.sid;
  const eid = req.user?.eid || req.body.eid; // Prefer secure token ID

  if (!sid || !eid) {
    return res
      .status(400)
      .json({ status: false, message: "Missing sid or eid" });
  }

  try {
    // DB::table('user_saved_stores')->where(...)->delete()
    await knex("user_saved_stores")
      .where({
        eid: eid,
        sid: sid,
      })
      .delete();

    return res.json({ status: true, message: "Store ID removed" });
  } catch (error) {
    return handleError(res, error, "Failed to remove SID");
  }
};

/*
 * Converts: public function storePID(Request $request)
 */
const storePID = async (req, res) => {
  const pid = req.body.pid;
  const eid = req.user?.eid || req.body.eid; // Prefer secure token ID

  if (!pid || !eid) {
    return res
      .status(400)
      .json({ status: false, message: "Missing pid or eid" });
  }

  try {
    // DB::table('user_saved_products')->insertOrIgnore(...)
    await knex("user_saved_products")
      .insert({
        eid: eid,
        pid: pid,
        saved_at: new Date(),
      })
      .onConflict(["eid", "pid"]) // Assumes a unique constraint on (eid, pid)
      .ignore();

    return res.json({
      status: true,
      message: "Product ID added or already stored",
    });
  } catch (error) {
    return handleError(res, error, "Failed to store PID");
  }
};

/*
 * Converts: public function removePID(Request $request)
 */
const removePID = async (req, res) => {
  const pid = req.body.pid;
  const eid = req.user?.eid || req.body.eid; // Prefer secure token ID

  if (!pid || !eid) {
    return res
      .status(400)
      .json({ status: false, message: "Missing pid or eid" });
  }

  try {
    // DB::table('user_saved_products')->where(...)->delete()
    await knex("user_saved_products")
      .where({
        eid: eid,
        pid: pid,
      })
      .delete();

    return res.json({ status: true, message: "Product ID removed" });
  } catch (error) {
    return handleError(res, error, "Failed to remove PID");
  }
};

const saveRoute = async (req, res) => {
  const { title, route } = req.body;
  const eid = req.user?.eid || req.body.eid; // Prefer secure token ID

  // 2. Validate required fields
  if (!eid || !title || !route) {
    return res.status(400).json({
      status: false,
      message: "Missing required fields: eid, title, or route data",
    });
  }

  try {
    // 3. Insert into the database
    // Knex will automatically stringify the 'route' object into JSON for Postgres
    await knex("user_saved_routes").insert({
      eid: eid,
      title: title,
      route_data: route,
      saved_at: new Date(),
    });

    logger.info("Route saved successfully", { eid, title });

    // 4. Return success
    return res.status(200).json({
      status: true,
      message: "Route saved successfully",
    });
  } catch (error) {
    return handleError(res, error, "Failed to save route");
  }
};

const getSavedRoutes = async (req, res) => {
  // Prefer secure token ID
  const eid = req.user?.eid || req.query.eid || req.body.eid;

  if (!eid) {
    return res.status(400).json({ 
      status: false, 
      message: "Missing required field: eid" 
    });
  }

  try {
    // Select all routes for this user, ordered by newest first
    const routes = await knex("user_saved_routes")
      .where("eid", eid)
      .select("id", "eid", "title", "route_data", "saved_at")
      .orderBy("saved_at", "desc");

    return res.status(200).json({
      status: true,
      message: "Routes retrieved successfully",
      data: routes,
    });

  } catch (error) {
    return handleError(res, error, "Failed to retrieve routes");
  }
};

const deleteSavedRoute = async (req, res) => {
  const id = req.body.id;
  const eid = req.user?.eid || req.body.eid; // Prefer secure token ID

  if (!id || !eid) {
    return res.status(400).json({ 
      status: false, 
      message: "Missing required fields: id or eid" 
    });
  }

  try {
    // Perform the delete operation
    // We include 'eid' in the where clause to ensure users can only delete their own routes
    const deletedCount = await knex("user_saved_routes")
      .where({ id: id, eid: eid })
      .delete();

    if (deletedCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Route not found or you do not have permission to delete it",
      });
    }

    logger.info("Route deleted successfully", { id, eid });

    return res.status(200).json({
      status: true,
      message: "Route deleted successfully",
    });

  } catch (error) {
    return handleError(res, error, "Failed to delete route");
  }
};

// --- New: User Profile & Address Management ---

const updateUserProfile = async (req, res) => {
  const { name, bio, phone_number, theme, image } = req.body;
  const eid = req.user?.eid || req.body.eid; // Prefer secure token ID
  if (!eid) return res.status(400).json({ status: false, message: "eid required" });

  try {
    const updates = {};
    if (name) updates.name = name;
    if (bio !== undefined) updates.bio = bio;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (theme) updates.theme = theme;
    if (image !== undefined) updates.image = image;

    await knex("etalovers").where("eid", eid).update(updates);
    const user = await knex("etalovers").where("eid", eid).first();

    return res.json({ status: true, data: user });
  } catch (error) {
    return handleError(res, error, "Failed to update profile");
  }
};

const getUserAddresses = async (req, res) => {
  const eid = req.user?.eid || req.query.eid; // Prefer secure token ID
  if (!eid) return res.status(400).json({ status: false, message: "eid required" });

  try {
    const addresses = await knex("user_addresses")
      .select("*", knex.raw("ST_Y(location::geometry) as latitude"), knex.raw("ST_X(location::geometry) as longitude"))
      .where("eid", eid)
      .orderBy("is_default", "desc");
    
    addresses.forEach(a => delete a.location);
    return res.json({ status: true, data: addresses });
  } catch (error) {
    return handleError(res, error, "Failed to fetch addresses");
  }
};

const addUserAddress = async (req, res) => {
  const { label, recipient_name, phone, full_address, city, postal_code, is_default, latitude, longitude } = req.body;
  const eid = req.user?.eid || req.body.eid; // Prefer secure token ID
  
  try {
    await knex.transaction(async (trx) => {
      if (is_default) {
        await trx("user_addresses").where("eid", eid).update({ is_default: false });
      }

      const location = latitude && longitude 
        ? knex.raw("ST_SetSRID(ST_MakePoint(?, ?), 4326)", [longitude, latitude])
        : null;

      await trx("user_addresses").insert({
        eid, label, recipient_name, phone, full_address, city, postal_code, is_default, location
      });
    });

    return res.json({ status: true, message: "Address added" });
  } catch (error) {
    return handleError(res, error, "Failed to add address");
  }
};

const deleteUserAddress = async (req, res) => {
  const id = req.body.id;
  const eid = req.user?.eid || req.body.eid; // Prefer secure token ID
  try {
    await knex("user_addresses").where({ id, eid }).delete();
    return res.json({ status: true, message: "Address deleted" });
  } catch (error) {
    return handleError(res, error, "Failed to delete address");
  }
};

module.exports = {
  fetchOrCreateUser,
  storeSID,
  removeSID,
  storePID,
  removePID,
  saveRoute,
  getSavedRoutes,
  deleteSavedRoute,
  updateUserProfile,
  getUserAddresses,
  addUserAddress,
  deleteUserAddress,
};

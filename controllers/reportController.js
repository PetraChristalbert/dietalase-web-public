const knex = require("../db/knex");
const logger = require("../config/logger");

/**
 * POST /api/reports
 * Submits a new report from a user.
 */
const submitReport = async (req, res) => {
    const { reporter_eid, target_sid, target_pid, reason } = req.body;

    if (!reason) {
        return res.status(400).json({ success: false, message: "Reason is required." });
    }

    try {
        await knex("reports").insert({
            reporter_eid: reporter_eid || null,
            target_sid: target_sid,
            target_pid: target_pid || null,
            reason: reason,
            status: 'pending'
        });

        // Optional: Trigger a notification or email to admin here
        
        res.json({ success: true, message: "Report submitted successfully." });
    } catch (error) {
        logger.error("Error submitting report", { error: error.message });
        res.status(500).json({ success: false, message: "Internal server error." });
    }
};

/**
 * GET /admin/reports
 * Fetches all pending reports for the admin dashboard.
 */
const getReportsPage = async (req, res) => {
    try {
        const reports = await knex("reports")
            .leftJoin("etalovers", "reports.reporter_eid", "etalovers.eid")
            .leftJoin("stores", "reports.target_sid", "stores.sid")
            .leftJoin("products", "reports.target_pid", "products.pid")
            .select(
                "reports.*", 
                "etalovers.name as reporter_name", 
                "stores.name as store_name", 
                "products.name as product_name"
            )
            .orderBy("reports.created_at", "desc");

        res.render("admin_reports", {
            reports: reports,
            title: "Community Reports"
        });
    } catch (error) {
        logger.error("Error loading reports page", { error: error.message });
        res.status(500).render("error", { message: "Failed to load reports." });
    }
};

/**
 * POST /admin/reports/resolve/:rid
 * Marks a report as resolved or dismissed.
 */
const resolveReport = async (req, res) => {
    const { rid } = req.params;
    const { action } = req.body; // 'resolved' or 'dismissed'

    try {
        await knex("reports").where("rid", rid).update({ status: action });
        res.json({ success: true });
    } catch (error) {
        logger.error("Error resolving report", { error: error.message });
        res.status(500).json({ success: false });
    }
};

module.exports = {
    submitReport,
    getReportsPage,
    resolveReport
};

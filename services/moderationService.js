const knex = require("../db/knex");
const { generateAiContent } = require("../controllers/aiEnhancementController");
const logger = require("../config/logger");

/**
 * Runs a batch moderation check on all unmoderated products.
 * Uses Gemini 1.5 Flash (Text-only) for maximum cost efficiency.
 */
const runBatchModeration = async () => {
    try {
        // 1. Fetch unmoderated products
        const products = await knex("products")
            .select("pid", "name")
            .where("status", "on-review")
            .limit(100);

        if (products.length === 0) return { processed: 0 };

        // 2. Prepare JSON for AI
        const productListJson = JSON.stringify(products);
        const prompt = `
            You are the Atelier Sentinel, a strict legal compliance auditor for an Indonesian artisanal marketplace.
            
            Task: Analyze the provided list of product IDs (pid) and names. Classify each based on legality and platform appropriateness.
            
            Classification Rules:
            - REJECTED: Explicitly illegal items (drugs, weapons, adult material), medical/pharmaceutical claims, or copyrighted brand names (e.g., "Replica Nike").
            - SUSPICIOUS: Names that are gibberish, overly vague (e.g., "Product 1"), or potential scams.
            - APPROVED: Everything else that is legal and clearly named.
            
            Output: Respond ONLY with a JSON array of objects.
            Format: [{"pid": number, "status": "Approved"|"Suspicious"|"Rejected", "reason": "Required for Suspicious/Rejected only"}]
            
            Product List:
            ${productListJson}
        `;

        // 3. Call Gemini Flash (Text-only = Ultra Cheap)
        const results = await generateAiContent(prompt);

        // 4. Update Database in a transaction
        await knex.transaction(async (trx) => {
            for (const item of results) {
                // Map AI response status to DB status
                const dbStatus = item.status.toLowerCase();
                
                await trx("products")
                    .where("pid", item.pid)
                    .update({
                        status: dbStatus,
                        curator_note: dbStatus !== "approved" ? item.reason : null
                    });
            }
        });

        logger.info(`Batch moderation complete. Processed ${results.length} items.`);
        return { processed: results.length };

    } catch (error) {
        logger.error("Error in batch moderation service:", { error: error.message });
        throw error;
    }
};

module.exports = {
    runBatchModeration
};

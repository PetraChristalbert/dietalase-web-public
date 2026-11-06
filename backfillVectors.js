// This is a standalone script, not part of the web server.

// 1. Load .env variables first
require('dotenv').config();

// 2. Import our database and embedding service
const knex = require('./db/knex');
const { generateEmbedding } = require('./services/embeddingService');

// A helper to process items in batches to avoid overwhelming the API
const processInBatches = async (items, batchSize = 50, processFn) => {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(items.length / batchSize)}...`);
    // Run all embedding requests in parallel for this batch
    await Promise.all(batch.map(processFn));
  }
};

/**
 * Backfills vectors for the 'products' table
 */
const backfillProducts = async () => {
  console.log('--- Starting Product Backfill ---');

  // 1. Find all products where vector is NULL
  const products = await knex('products').select('pid', 'name', 'description_ai', 'description').whereNull('vector');
  console.log(`Found ${products.length} products needing vectors.`);

  // 2. Define the processing function for each item
  const processProduct = async (product) => {
    try {
      // Combine all useful text into one string
      const textToEmbed = [
        product.name,
        product.description,
        product.description_ai
      ].filter(Boolean).join(' \n '); // Join with newline

      if (!textToEmbed) {
        console.warn(`Skipping product ${product.pid} (no text found)`);
        return;
      }

      // 3. Generate the vector
      const vector = await generateEmbedding(textToEmbed);

      if (vector) {
        // 4. Save the vector (as JSON) back to the DB
        await knex('products')
          .where('pid', product.pid)
          .update({
            vector: JSON.stringify(vector) // Store as a JSON string
          });
        console.log(`  Updated product ${product.pid}`);
      } else {
        console.warn(`  Failed to generate vector for product ${product.pid}`);
      }
    } catch (e) {
      console.error(`  Error processing product ${product.pid}:`, e.message);
    }
  };

  // 3. Run the batch process
  await processInBatches(products, 50, processProduct);
  console.log('--- Product Backfill Complete ---');
};

/**
 * Backfills vectors for the 'stores' table
 */
const backfillStores = async () => {
  console.log('--- Starting Store Backfill ---');

  // 1. Find all stores where vector is NULL
  const stores = await knex('stores').select('sid', 'name', 'type', 'description').whereNull('vector');
  console.log(`Found ${stores.length} stores needing vectors.`);

  // 2. Define the processing function
  const processStore = async (store) => {
    try {
      // Combine all useful text
      const textToEmbed = [
        store.name,
        store.type,
        store.description
      ].filter(Boolean).join(' \n ');

      if (!textToEmbed) {
        console.warn(`Skipping store ${store.sid} (no text found)`);
        return;
      }

      // 3. Generate vector
      const vector = await generateEmbedding(textToEmbed);

      if (vector) {
        // 4. Save vector
        await knex('stores')
          .where('sid', store.sid)
          .update({
            vector: JSON.stringify(vector)
          });
        console.log(`  Updated store ${store.sid}`);
      } else {
        console.warn(`  Failed to generate vector for store ${store.sid}`);
      }
    } catch (e) {
      console.error(`  Error processing store ${store.sid}:`, e.message);
    }
  };

  // 3. Run the batch process
  await processInBatches(stores, 50, processStore);
  console.log('--- Store Backfill Complete ---');
};

/**
 * Main function to run the entire backfill
 */
const runBackfill = async () => {
  await backfillProducts();
  await backfillStores();
  console.log('All backfill tasks finished.');
  await knex.destroy();
  process.exit(0); // Exit the script
};

// Run the script
runBackfill().catch(async e => {
  console.error('Fatal error during backfill:', e);
  await knex.destroy();
  process.exit(1);
});
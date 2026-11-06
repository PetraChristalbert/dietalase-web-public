require('dotenv').config();
const knex = require('./knex');

async function runMigration() {
  console.log('🚀 Starting Store Identity Schema Migration...');
  try {
    const hasGallery = await knex.schema.hasColumn('stores', 'gallery');
    const hasHours = await knex.schema.hasColumn('stores', 'operating_hours');

    await knex.schema.alterTable('stores', (table) => {
      if (!hasGallery) {
        table.jsonb('gallery').defaultTo('[]');
        console.log('✅ Added gallery column.');
      }
      if (!hasHours) {
        table.jsonb('operating_hours').defaultTo('{}');
        console.log('✅ Added operating_hours column.');
      }
    });

    console.log('🎉 Migration successful!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit();
  }
}

runMigration();

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.alterTable('stores', function(table) {
    // Menambahkan kolom negara untuk pencarian skala Nasional
    table.string('country', 100).defaultTo('Indonesia').notNullable();
    
    // Menambahkan agregasi performa untuk fitur sorting
    table.decimal('avg_rating', 2, 1).defaultTo(0.0);
    table.integer('total_visits').defaultTo(0);
    
    // Opsional: Menambahkan index untuk optimasi sorting & filter
    table.index('country');
    table.index('avg_rating');
    table.index('total_visits');
    table.index('type');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('stores', function(table) {
    table.dropIndex('type');
    table.dropIndex('total_visits');
    table.dropIndex('avg_rating');
    table.dropIndex('country');
    
    table.dropColumn('total_visits');
    table.dropColumn('avg_rating');
    table.dropColumn('country');
  });
};

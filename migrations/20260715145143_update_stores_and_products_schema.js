exports.up = function(knex) {
  return knex.schema
    .alterTable('stores', function(table) {
      table.string('status', 50).defaultTo('Active');
    })
    .alterTable('products', function(table) {
      table.integer('stock').defaultTo(0);
      table.string('category', 50);
      table.string('dimensions', 50).defaultTo('1 cm');
      table.string('status', 50).defaultTo('Available');
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('stores', function(table) {
      table.dropColumn('status');
    })
    .alterTable('products', function(table) {
      table.dropColumn('stock');
      table.dropColumn('category');
      table.dropColumn('dimensions');
      table.dropColumn('status');
    });
};

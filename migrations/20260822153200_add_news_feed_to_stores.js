exports.up = function(knex) {
  return knex.schema.alterTable('stores', function(table) {
    table.jsonb('news_feed').defaultTo('[]');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('stores', function(table) {
    table.dropColumn('news_feed');
  });
};

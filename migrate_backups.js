const knex = require('./db/knex');

async function migrate() {
    try {
        const exists = await knex.schema.hasTable('system_backups');
        if (!exists) {
            await knex.schema.createTable('system_backups', table => {
                table.increments('id').primary();
                table.string('filename').notNullable();
                table.bigInteger('file_size_bytes').notNullable();
                table.string('storage_location').notNullable();
                table.string('status').notNullable();
                table.timestamp('created_at').defaultTo(knex.fn.now());
            });
            console.log("Table 'system_backups' created successfully.");
        } else {
            console.log("Table 'system_backups' already exists.");
        }
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        knex.destroy();
    }
}

migrate();

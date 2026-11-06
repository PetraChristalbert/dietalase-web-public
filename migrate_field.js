require("dotenv").config();
const knex = require("./db/knex");

async function migrate() {
    try {
        console.log("Starting migration for Field Admin system...");

        // 1. Create field_admins table
        const hasFieldAdmins = await knex.schema.hasTable('field_admins');
        if (!hasFieldAdmins) {
            await knex.schema.createTable('field_admins', (table) => {
                table.increments('id').primary();
                table.string('username', 100).unique().notNullable();
                table.string('password_hash', 255).notNullable();
                table.timestamp('created_at').defaultTo(knex.fn.now());
            });
            console.log("Created 'field_admins' table.");
        } else {
            console.log("'field_admins' table already exists.");
        }

        // 2. Add is_managed_by_admin to stores
        const hasStoreManaged = await knex.schema.hasColumn('stores', 'is_managed_by_admin');
        if (!hasStoreManaged) {
            await knex.schema.alterTable('stores', (table) => {
                table.boolean('is_managed_by_admin').defaultTo(false);
            });
            console.log("Added 'is_managed_by_admin' to 'stores'.");
        } else {
            console.log("'is_managed_by_admin' column already exists on 'stores'.");
        }

        // 3. Add is_managed_by_admin to products
        const hasProductManaged = await knex.schema.hasColumn('products', 'is_managed_by_admin');
        if (!hasProductManaged) {
            await knex.schema.alterTable('products', (table) => {
                table.boolean('is_managed_by_admin').defaultTo(false);
            });
            console.log("Added 'is_managed_by_admin' to 'products'.");
        } else {
            console.log("'is_managed_by_admin' column already exists on 'products'.");
        }

        console.log("Migration completed successfully.");
    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        process.exit(0);
    }
}

migrate();

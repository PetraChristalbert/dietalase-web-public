const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../Midiatera/.env') });

async function migrate() {
    const client = new Client({
        host: process.env.DB_HOST || 'db.dietalase.com',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'rootpassword',
        database: 'dietalase_db'
    });

    try {
        await client.connect();
        
        console.log("Checking if nickname exists...");
        try {
            await client.query(`ALTER TABLE field_admins ADD COLUMN nickname VARCHAR(100);`);
            console.log("✅ Added nickname column to field_admins.");
        } catch (e) {
            console.log("Nickname might already exist or error: " + e.message);
        }

        console.log("Creating field_admin_logs table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS field_admin_logs (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES field_admins(id) ON DELETE CASCADE,
                action VARCHAR(50), 
                target_name VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log("✅ field_admin_logs table ready.");
        
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await client.end();
    }
}

migrate();

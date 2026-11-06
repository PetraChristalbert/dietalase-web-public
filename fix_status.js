const { Client } = require('pg');

async function run() {
    const client = new Client({
        host: 'db.dietalase.com',
        port: 5432,
        database: 'dietalase_db',
        user: 'postgres',
        password: 'rootpassword',
    });
    
    try {
        await client.connect();
        console.log("Connected to DB.");

        await client.query(`UPDATE public.products SET status = 'approved';`);
        console.log("Updated products status to 'approved'.");

    } catch (error) {
        console.error("Failed:", error);
    } finally {
        await client.end();
    }
}

run();

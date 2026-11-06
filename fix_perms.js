require('dotenv').config();
const knex = require('./db/knex');

async function fixPermissions() {
    try {
        console.log("Fixing permissions for field_admin_logs...");
        // Assuming the DB_USERNAME is the one needing permissions
        const dbUser = process.env.DB_USERNAME || 'dietalase_user';
        
        // Use raw query to grant all privileges
        await knex.raw(`GRANT ALL PRIVILEGES ON TABLE field_admin_logs TO ${dbUser}`);
        await knex.raw(`GRANT USAGE, SELECT ON SEQUENCE field_admin_logs_id_seq TO ${dbUser}`);
        
        console.log(`Permissions granted to ${dbUser} for field_admin_logs`);
    } catch (e) {
        console.error("Error fixing permissions:", e.message);
    } finally {
        knex.destroy();
    }
}

fixPermissions();

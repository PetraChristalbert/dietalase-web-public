const { Storage } = require('@google-cloud/storage');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const cron = require('node-cron');
const pino = require('pino');
const knex = require('../db/knex');

const execPromise = util.promisify(exec);
const logger = pino({ name: 'backup-job' });

// Configuration
const BUCKET_NAME = process.env.GCS_BACKUP_BUCKET || 'dietalase-backups-bucket'; // fallback if not set in .env
const KEY_PATH = path.join(__dirname, '..', 'secure_vault', 'gcs-backup-key.json');
const PROJECT_DIR = path.join(__dirname, '..');
const BACKUP_DIR = path.join(PROJECT_DIR, 'backups'); // Temporary local dir for backups
const MAX_BACKUPS = 7;

// Initialize GCS
let storage, bucket;
try {
    if (fs.existsSync(KEY_PATH)) {
        storage = new Storage({ keyFilename: KEY_PATH });
        bucket = storage.bucket(BUCKET_NAME);
    } else {
        logger.warn(`GCS Backup Key not found at ${KEY_PATH}. Cloud backups will fail if executed.`);
    }
} catch (e) {
    logger.error('Failed to initialize GCS storage client:', e.message);
}

async function runBackup() {
    logger.info('Starting scheduled backup process...');
    
    if (!bucket) {
        logger.error('Backup aborted: Google Cloud Storage bucket is not initialized properly.');
        return;
    }

    try {
        // Ensure backup directory exists
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR, { recursive: true });
        }

        const date = new Date();
        // Format: YYYYMMDD_HHMMSS
        const timestamp = date.toISOString().replace(/[:\-]|\.\d{3}Z/g, '').replace('T', '_');
        const dbDumpFile = `db_dump_${timestamp}.sql`;
        const archiveFile = `dietalase_backup_${timestamp}.tar.gz`;
        
        const dbDumpPath = path.join(BACKUP_DIR, dbDumpFile);
        const archivePath = path.join(BACKUP_DIR, archiveFile);

        // 1. Dump Database
        logger.info('Dumping database...');
        // We use host 'midiatera-db' which is accessible in the shared-proxy-net docker network
        const dbUser = process.env.DB_USERNAME || 'dietalase_user';
        const dbName = process.env.DB_DATABASE || 'dietalase_db';
        const dbHost = 'midiatera-db';
        // Note: Password must be supplied via PGPASSWORD env variable.
        const pgPassword = process.env.DB_PASSWORD || 'dietalase_password';
        
        await execPromise(`PGPASSWORD="${pgPassword}" pg_dump -h ${dbHost} -U ${dbUser} -d ${dbName} -F p -f ${dbDumpPath}`);

        // 2. Compress (tar.gz)
        logger.info('Compressing files...');
        // Tar the DB dump, storage/, and .wwebjs_auth
        await execPromise(`tar -czvf ${archivePath} -C ${BACKUP_DIR} ${dbDumpFile} -C ${PROJECT_DIR} storage .wwebjs_auth`);

        // Clean up the raw SQL dump as it is now inside the tarball
        fs.unlinkSync(dbDumpPath);

        // 3. Upload to Google Cloud Storage
        logger.info(`Uploading ${archiveFile} to GCS bucket: ${BUCKET_NAME}`);
        await bucket.upload(archivePath, {
            destination: archiveFile,
            gzip: false // already gzip compressed
        });
        logger.info('Upload to Google Cloud Storage complete.');

        // 4. Local Retention (Keep last 7)
        logger.info('Enforcing local retention policy...');
        cleanOldLocalBackups();

        // 5. Cloud Retention (Keep last 7)
        logger.info('Enforcing cloud retention policy...');
        await cleanOldCloudBackups();

        // 6. Record to DB
        const stats = fs.statSync(archivePath);
        await knex('system_backups').insert({
            filename: archiveFile,
            file_size_bytes: stats.size,
            storage_location: 'local_and_gcs',
            status: 'success'
        });

        logger.info('Backup process completed successfully.');
    } catch (error) {
        logger.error({ err: error }, 'Backup process failed');
        
        try {
            await knex('system_backups').insert({
                filename: `Failed at ${new Date().toISOString()}`,
                file_size_bytes: 0,
                storage_location: 'none',
                status: 'failed'
            });
        } catch(dbErr) {
            logger.error('Could not write failure to db', dbErr);
        }
    }
}

function cleanOldLocalBackups() {
    try {
        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith('.tar.gz'))
            .map(f => ({ name: f, path: path.join(BACKUP_DIR, f), time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time); // newest first

        if (files.length > MAX_BACKUPS) {
            const toDelete = files.slice(MAX_BACKUPS);
            for (const file of toDelete) {
                fs.unlinkSync(file.path);
                logger.info(`Deleted old local backup: ${file.name}`);
            }
        }
    } catch (e) {
        logger.error('Failed during local cleanup:', e.message);
    }
}

async function cleanOldCloudBackups() {
    try {
        const [files] = await bucket.getFiles({ prefix: 'dietalase_backup_' });
        
        // Sort by creation time, newest first
        const sortedFiles = files.sort((a, b) => {
            return new Date(b.metadata.timeCreated).getTime() - new Date(a.metadata.timeCreated).getTime();
        });

        if (sortedFiles.length > MAX_BACKUPS) {
            const toDelete = sortedFiles.slice(MAX_BACKUPS);
            for (const file of toDelete) {
                await file.delete();
                logger.info(`Deleted old cloud backup: ${file.name}`);
            }
        }
    } catch (e) {
        logger.error('Failed during cloud cleanup:', e.message);
    }
}

// Schedule the job (Runs every 3 days at 02:00 AM)
function init() {
    logger.info('Initializing backup cron job (Runs every 3 days at 02:00 AM)');
    cron.schedule('0 2 */3 * *', () => {
        runBackup();
    });
}

module.exports = {
    init,
    runBackup
};

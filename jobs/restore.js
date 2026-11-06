const { Storage } = require('@google-cloud/storage');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const pino = require('pino');

const execPromise = util.promisify(exec);
const logger = pino({ name: 'restore-job' });

const BUCKET_NAME = process.env.GCS_BACKUP_BUCKET || 'dietalase-backups-bucket';
const KEY_PATH = path.join(__dirname, '..', 'secure_vault', 'gcs-backup-key.json');
const PROJECT_DIR = path.join(__dirname, '..');
const BACKUP_DIR = path.join(PROJECT_DIR, 'backups');
const RESTORE_TMP_DIR = path.join(PROJECT_DIR, 'tmp_restore');

let storage, bucket;
if (fs.existsSync(KEY_PATH)) {
    storage = new Storage({ keyFilename: KEY_PATH });
    bucket = storage.bucket(BUCKET_NAME);
}

/**
 * Execute the actual rollback given a path to a .tar.gz backup archive.
 * WARNING: This is highly destructive and will wipe current DB/files and crash the app.
 */
async function executeRollback(archivePath) {
    logger.warn(`Starting CRITICAL SYSTEM ROLLBACK using archive: ${archivePath}`);
    
    if (!fs.existsSync(archivePath)) {
        throw new Error('Archive not found: ' + archivePath);
    }

    try {
        // 1. Prepare temp directory
        if (fs.existsSync(RESTORE_TMP_DIR)) {
            fs.rmSync(RESTORE_TMP_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(RESTORE_TMP_DIR, { recursive: true });

        // 2. Extract Archive
        logger.info('Extracting archive...');
        await execPromise(`tar -xzvf ${archivePath} -C ${RESTORE_TMP_DIR}`);

        // Find the sql dump file
        const extractedFiles = fs.readdirSync(RESTORE_TMP_DIR);
        const sqlFile = extractedFiles.find(f => f.endsWith('.sql'));
        
        if (!sqlFile) {
            throw new Error('No .sql dump file found inside the archive!');
        }

        const sqlFilePath = path.join(RESTORE_TMP_DIR, sqlFile);
        
        // 3. Database Restore
        logger.warn('Wiping and restoring database...');
        const dbUser = process.env.DB_USERNAME || 'dietalase_user';
        const dbName = process.env.DB_DATABASE || 'dietalase_db';
        const dbHost = 'midiatera-db';
        const pgPassword = process.env.DB_PASSWORD || 'dietalase_password';
        
        // Wipe public schema and recreate it
        await execPromise(`PGPASSWORD="${pgPassword}" psql -h ${dbHost} -U ${dbUser} -d ${dbName} -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`);
        
        // Import SQL Dump
        await execPromise(`PGPASSWORD="${pgPassword}" psql -h ${dbHost} -U ${dbUser} -d ${dbName} -f ${sqlFilePath}`);

        // 4. File Restore
        logger.warn('Restoring file system (storage and WhatsApp auth)...');
        
        const extractedStorage = path.join(RESTORE_TMP_DIR, 'storage');
        const extractedAuth = path.join(RESTORE_TMP_DIR, '.wwebjs_auth');
        
        const liveStorage = path.join(PROJECT_DIR, 'storage');
        const liveAuth = path.join(PROJECT_DIR, '.wwebjs_auth');

        // Overwrite storage if it exists in the archive
        if (fs.existsSync(extractedStorage)) {
            await execPromise(`cp -a ${extractedStorage}/* ${liveStorage}/`);
        }
        
        // Overwrite auth if it exists in the archive
        if (fs.existsSync(extractedAuth)) {
            await execPromise(`cp -a ${extractedAuth}/* ${liveAuth}/`);
        }

        // Cleanup temp dir
        fs.rmSync(RESTORE_TMP_DIR, { recursive: true, force: true });

        logger.info('Rollback complete! Forcing app restart to apply changes...');
        
        // 5. Force Restart (Docker will catch the exit and restart the container)
        setTimeout(() => {
            process.exit(1);
        }, 2000);

        return true;
    } catch (error) {
        logger.error({ err: error }, 'ROLLBACK FAILED!');
        throw error;
    }
}

async function restoreFromLocal(filename) {
    const archivePath = path.join(BACKUP_DIR, filename);
    return await executeRollback(archivePath);
}

async function restoreFromGCS(filename) {
    if (!bucket) throw new Error("GCS not configured");
    const tempPath = path.join(BACKUP_DIR, 'gcs_download_' + filename);
    
    logger.info(`Downloading ${filename} from GCS...`);
    await bucket.file(filename).download({ destination: tempPath });
    
    await executeRollback(tempPath);
    
    // Cleanup downloaded file if we survived (unlikely due to process.exit)
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
}

async function restoreFromUpload(filePath) {
    return await executeRollback(filePath);
}

module.exports = {
    restoreFromLocal,
    restoreFromGCS,
    restoreFromUpload
};

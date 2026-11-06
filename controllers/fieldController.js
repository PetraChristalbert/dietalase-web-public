const knex = require('../db/knex');
const bcrypt = require('bcryptjs');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Helper to compress image
const compressImage = async (filename) => {
    try {
        if (!filename) return null;
        const oldPath = path.join(__dirname, '..', 'public', 'images', filename);
        if (fs.existsSync(oldPath)) {
            const buffer = await sharp(oldPath)
                .resize({ width: 800, withoutEnlargement: true })
                .webp({ quality: 80 })
                .toBuffer();
            
            const newFilename = filename.split('.')[0] + '-' + Date.now() + '.webp';
            const newPath = path.join(__dirname, '..', 'public', 'images', newFilename);
            
            fs.writeFileSync(newPath, buffer);
            fs.unlinkSync(oldPath); // delete original uncompressed
            return newFilename;
        }
    } catch (e) {
        console.error("Image compression failed:", e);
    }
    return filename; // fallback to original if failed
};

// Helper to safely delete an image
const deleteImageFile = (imageUrl) => {
    if (!imageUrl || imageUrl.includes('default-') || imageUrl.startsWith('http')) return;
    try {
        const filename = imageUrl.split('/').pop();
        const filepath = path.join(__dirname, '..', 'public', 'images', filename);
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    } catch (e) {
        console.error("Failed to delete image:", e);
    }
};

// Helper to create Point for PostGIS
const createPoint = (lat, lng) => {
    return knex.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)`, [lng, lat]);
};

// Helper for non-blocking activity logging
const logActivity = (req, action, target_name) => {
    if (req.session && req.session.fieldAdminId) {
        knex('field_admin_logs').insert({
            admin_id: req.session.fieldAdminId,
            action: action,
            target_name: target_name
        }).catch(err => console.error("Failed to log activity:", err.message));
    }
};

exports.getLoginPage = async (req, res) => {
    try {
        // Auto-seed a default user if none exist to make testing easy
        const count = await knex('field_admins').count('id as cnt').first();
        if (parseInt(count.cnt) === 0) {
            const hash = await bcrypt.hash('admin123', 10);
            await knex('field_admins').insert({
                username: 'admin',
                password_hash: hash
            });
            console.log("Seeded default field admin (admin/admin123)");
        }
    } catch (e) {
        console.error("Failed to seed field_admins", e);
    }
    res.render('field_admin/login', { error: null });
};

exports.handleLogin = async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await knex('field_admins').where('username', username).first();
        if (user && await bcrypt.compare(password, user.password_hash)) {
            req.session.isFieldAdmin = true;
            req.session.fieldAdminId = user.id;
            return res.redirect('/field');
        }
        res.render('field_admin/login', { error: 'Invalid username or password' });
    } catch (error) {
        res.render('field_admin/login', { error: 'Database error occurred' });
    }
};

exports.handleLogout = (req, res) => {
    req.session.destroy();
    res.redirect('/field/login');
};

exports.getDashboard = (req, res) => {
    res.render('field_admin/dashboard');
};

exports.getAllStores = async (req, res) => {
    try {
        const stores = await knex('stores')
            .select('sid', 'name', 'owner_name')
            .where('is_managed_by_admin', true)
            .orderBy('sid', 'desc');
        res.json({ success: true, stores });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStoreDetails = async (req, res) => {
    try {
        const { sid } = req.params;
        const store = await knex('stores')
            .select('sid', 'name', 'address', 'image', 'contact', 'owner_name', 'owner_image', 'instagram', 'facebook', 'tiktok', 'email', 'description')
            .where('sid', sid)
            .andWhere('is_managed_by_admin', true)
            .first();
            
        if (!store) {
            return res.status(404).json({ success: false, message: "Store not found" });
        }
        // Fetch advanced operating hours
        store.operating_hours = await knex('store_operating_hours')
            .select('day_of_week', 'open_time', 'close_time')
            .where('sid', sid);
            
        res.json({ success: true, store });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.registerStore = async (req, res) => {
    try {
        const { name, type, contact, owner_name, address, lat, lng, instagram, facebook, tiktok, email, description, operating_hours } = req.body;
        
        let image = null;
        let owner_image = null;
        
        if (req.files) {
            if (req.files.image && req.files.image[0]) {
                const compImg = await compressImage(req.files.image[0].filename);
                image = '/images/' + compImg;
            }
            if (req.files.owner_image && req.files.owner_image[0]) {
                const compOwner = await compressImage(req.files.owner_image[0].filename);
                owner_image = '/images/' + compOwner;
            }
        }

        const insertData = {
            name,
            type: type || 'Umum',
            contact,
            owner_name,
            address,
            image: image || 'https://dietalase.com/assets/images/default-store.png',
            owner_image,
            instagram,
            facebook,
            tiktok,
            email,
            description,
            is_managed_by_admin: true,
            status: 'verified' // Instantly bypass verification
        };

        if (lat && lng) {
            insertData.location = createPoint(lat, lng);
        }

        const [sidRecord] = await knex('stores').insert(insertData).returning('sid');
        const finalSid = sidRecord.sid || sidRecord;
        



        if (operating_hours) {
            try {
                const hoursArr = JSON.parse(operating_hours);
                if (hoursArr && hoursArr.length > 0) {
                    const hoursInsert = hoursArr.map(h => ({
                        sid: finalSid,
                        day_of_week: h.day_of_week,
                        open_time: h.open_time,
                        close_time: h.close_time
                    }));
                    await knex('store_operating_hours').insert(hoursInsert);
                }
            } catch (e) {
                console.error("Failed to parse operating hours", e);
            }
        }

        logActivity(req, 'Add Store', name);
        res.json({ success: true, sid: finalSid });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateStore = async (req, res) => {
    try {
        const { sid } = req.params;
        const { name, type, contact, owner_name, address, lat, lng, instagram, facebook, tiktok, email, description, operating_hours } = req.body;
        
        const updateData = { 
            name, type, contact, owner_name, address,
            instagram, facebook, tiktok, email, description
        };

        const oldStore = await knex('stores').where('sid', sid).andWhere('is_managed_by_admin', true).first();
        if (!oldStore) return res.status(404).json({ success: false, message: "Store not found" });

        if (req.files) {
            if (req.files.image && req.files.image[0]) {
                deleteImageFile(oldStore.image);
                const compImg = await compressImage(req.files.image[0].filename);
                updateData.image = '/images/' + compImg;
            }
            if (req.files.owner_image && req.files.owner_image[0]) {
                deleteImageFile(oldStore.owner_image);
                const compOwner = await compressImage(req.files.owner_image[0].filename);
                updateData.owner_image = '/images/' + compOwner;
            }
        }

        if (lat && lng) {
            updateData.location = createPoint(lat, lng);
        }

        await knex('stores').where('sid', sid).andWhere('is_managed_by_admin', true).update(updateData);
        
        if (operating_hours) {
            try {
                const hoursArr = JSON.parse(operating_hours);
                await knex('store_operating_hours').where('sid', sid).del(); // Clear old
                
                if (hoursArr && hoursArr.length > 0) {
                    const hoursInsert = hoursArr.map(h => ({
                        sid: sid,
                        day_of_week: h.day_of_week,
                        open_time: h.open_time,
                        close_time: h.close_time
                    }));
                    await knex('store_operating_hours').insert(hoursInsert);
                }
            } catch (e) {
                console.error("Failed to parse operating hours", e);
            }
        }
        
        logActivity(req, 'Edit Store', name);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteStore = async (req, res) => {
    try {
        const { sid } = req.params;
        const store = await knex('stores').where('sid', sid).andWhere('is_managed_by_admin', true).first();
        if (!store) return res.status(404).json({ success: false, message: "Store not found" });

        // Delete Store Images
        deleteImageFile(store.image);
        deleteImageFile(store.owner_image);

        // Fetch products to delete their images
        const products = await knex('products').where('sid', sid);
        for (const p of products) {
            deleteImageFile(p.image);
            if (p.images) {
                try {
                    const imagesArr = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                    imagesArr.forEach(img => deleteImageFile(img));
                } catch(e) {}
            }
        }

        // DB Cascades
        await knex('store_operating_hours').where('sid', sid).del();
        await knex('products').where('sid', sid).del();
        await knex('stores').where('sid', sid).del();

        logActivity(req, 'Delete Store', store.name);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStoreProducts = async (req, res) => {
    try {
        const { sid } = req.params;
        const products = await knex('products')
            .where('sid', sid)
            .andWhere('is_managed_by_admin', true)
            .orderBy('pid', 'desc');
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addProduct = async (req, res) => {
    try {
        const { sid } = req.params;
        const { name, price, description, unit } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Product Photo is mandatory." });
        }

        const compImg = await compressImage(req.file.filename);
        const image = '/images/' + compImg;

        const [pid] = await knex('products').insert({
            sid,
            name,
            price: price || 0,
            description,
            unit: unit || 'item',
            image: image,
            images: JSON.stringify([image]),
            is_managed_by_admin: true,
            status: 'approved' // instantly approved
        }).returning('pid');

        logActivity(req, 'Add Product', name);
        res.json({ success: true, pid: pid.pid || pid });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const { pid } = req.params;
        const { name, price, description, unit } = req.body;
        
        const updateData = { name, price, description, unit };

        if (req.file) {
            const oldProduct = await knex('products').where('pid', pid).andWhere('is_managed_by_admin', true).first();
            if (oldProduct) {
                deleteImageFile(oldProduct.image);
            }

            const compImg = await compressImage(req.file.filename);
            const image = '/images/' + compImg;
            updateData.image = image;
            updateData.images = JSON.stringify([image]);
        }

        await knex('products').where('pid', pid).andWhere('is_managed_by_admin', true).update(updateData);
        logActivity(req, 'Edit Product', name);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { pid } = req.params;
        const p = await knex('products').where('pid', pid).andWhere('is_managed_by_admin', true).first();
        if (p) {
            deleteImageFile(p.image);
            if (p.images) {
                try {
                    const imagesArr = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
                    imagesArr.forEach(img => deleteImageFile(img));
                } catch(e) {}
            }
            await knex('products').where('pid', pid).del();
        }
        
        logActivity(req, 'Delete Product', `PID: ${pid}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

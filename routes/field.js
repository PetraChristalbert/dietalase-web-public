const express = require('express');
const router = express.Router();
const fieldController = require('../controllers/fieldController');
const upload = require('../config/multer'); // Reuse existing multer config if applicable, or we can use multer directly here if it's not exported nicely.

// Basic auth middleware
const isFieldAdmin = (req, res, next) => {
    if (req.session && req.session.isFieldAdmin) {
        return next();
    }
    return res.redirect('/field/login');
};

// Auth
router.get('/login', fieldController.getLoginPage);
router.post('/login', fieldController.handleLogin);
router.get('/logout', fieldController.handleLogout);

// Views
router.get('/', isFieldAdmin, fieldController.getDashboard);

// API Endpoints
router.get('/api/stores/all', isFieldAdmin, fieldController.getAllStores);
router.get('/api/stores/:sid/details', isFieldAdmin, fieldController.getStoreDetails);

// Notice we don't apply multer directly on the router level, we let the controller handle it or we define it here.
// Actually, let's just use the router to handle multipart forms for simplicity if we can import multer.
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // We will store them in public/images for now as it's the standard static directory
        cb(null, path.join(__dirname, '../public/images'));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'field-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const fieldUpload = multer({ storage: storage });

router.post('/api/stores/register', isFieldAdmin, fieldUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'owner_image', maxCount: 1 }]), fieldController.registerStore);
router.post('/api/stores/:sid/update', isFieldAdmin, fieldUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'owner_image', maxCount: 1 }]), fieldController.updateStore);
router.delete('/api/stores/:sid/delete', isFieldAdmin, fieldController.deleteStore);

router.get('/api/stores/:sid/products', isFieldAdmin, fieldController.getStoreProducts);
router.post('/api/stores/:sid/products/add', isFieldAdmin, fieldUpload.single('image'), fieldController.addProduct);
router.post('/api/products/:pid/update', isFieldAdmin, fieldUpload.single('image'), fieldController.updateProduct);
router.delete('/api/products/:pid/delete', isFieldAdmin, fieldController.deleteProduct);

module.exports = router;

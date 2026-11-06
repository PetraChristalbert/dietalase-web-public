const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper function to create a storage engine for a specific subfolder
const createStorage = (subfolder) => {
  const destinationPath = path.join(__dirname, '..', 'storage', 'Assets', subfolder);

  // Ensure the destination directory exists
  fs.mkdirSync(destinationPath, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
      // Use timestamp + original name to avoid collisions in multi-upload
      const fileName = `${Date.now()}_${file.originalname}`;
      cb(null, fileName);
    }
  });
};

// Helper function to create a storage engine for a secure subfolder outside public storage
const createSecureStorage = (subfolder) => {
  const destinationPath = path.join(__dirname, '..', 'secure_vault', subfolder);

  // Ensure the destination directory exists
  fs.mkdirSync(destinationPath, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
      const fileName = `${Date.now()}_${file.originalname}`;
      cb(null, fileName);
    }
  });
};

// Create and export different upload handlers for each file type
const uploadStoreImage = multer({ storage: createStorage('Store_Image') });
const uploadStoreNews = multer({ storage: createStorage('Store_News') });
const uploadOwnerImage = multer({ storage: createStorage('Owner_Image') });
const uploadKtpImage = multer({ storage: createSecureStorage('Owner_Ktp') }); // Secure KTP Vault
const uploadProductImage = multer({ storage: createStorage('Product_Image') });
const uploadProductVideo = multer({ storage: createStorage('Product_Video') });

// [NEW] Combined handler for the new Inventory Wizard
// We use 'Product_Image' as the base, but multer will handle fields separately if needed
const uploadProductMedia = multer({ 
  storage: createStorage('Product_Image'), 
}).fields([
  { name: 'images', maxCount: 4 },
  { name: 'video', maxCount: 1 }
]);

const uploadChatMedia = multer({ storage: createStorage('Chat_Media') });

module.exports = {
  uploadStoreImage,
  uploadStoreNews,
  uploadOwnerImage,
  uploadKtpImage,
  uploadProductImage,
  uploadProductVideo,
  uploadProductMedia,
  uploadChatMedia
};
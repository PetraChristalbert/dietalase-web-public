const fs = require('fs'); // Node.js File System module
const path = require('path'); // Node.js Path module
const logger = require('../config/logger');

// Helper to build the full URL, like Laravel's url()
const getFileUrl = (filePath) => {
  // We use APP_URL from .env and replace backslashes with forward slashes
  const cleanPath = filePath.replace(/\\/g, '/');
  return `${process.env.APP_URL || 'http://localhost:3000'}/${cleanPath}`;
};

// Generic upload handler
// The 'multer' middleware already saved the file by the time this function runs.
// We just check if it succeeded and return the URL.
const handleUpload = (req, res, subfolder) => {
  if (!req.file) {
    logger.error('No file provided in request', { body: req.body, file: req.file });
    return res.status(400).json({ error: 'No file provided' });
  }

  // Construct the URL path (e.g., "storage/Assets/Product_Image/file.jpg")
  const urlPath = path.join('storage', 'Assets', subfolder, req.file.filename);

  return res.json({
    message: 'File uploaded successfully',
    url: getFileUrl(urlPath),
  });
};

/*
 * Converts: uploadStoreImage, uploadOwnerImage, uploadProductImage, uploadProductVideo
 * The multer middleware does all the work.
 */
const uploadStoreImage = (req, res) => handleUpload(req, res, 'Store_Image');
const uploadOwnerImage = (req, res) => handleUpload(req, res, 'Owner_Image');
const uploadKtpImage = (req, res) => {
  if (!req.file) {
    logger.error('No file provided in secure KTP upload request');
    return res.status(400).json({ error: 'No file provided' });
  }
  return res.json({
    message: 'KTP uploaded successfully',
    url: `/admin/verify/media/ktp/${req.file.filename}`
  });
};
const uploadProductImage = (req, res) => {
  logger.info("UploadProductImage CALLED");
  if (!req.file) {
      logger.error("❌ image not found in request", { body: req.body, files: req.files });
  }
  return handleUpload(req, res, 'Product_Image');
};
const uploadProductVideo = (req, res) => handleUpload(req, res, 'Product_Video');
const uploadChatMedia = (req, res) => handleUpload(req, res, 'Chat_Media');

// Helper for delete functions
const handleDelete = (req, res, subfolder, fileType) => {
  const { link } = req.body;
  if (!link) {
    return res.status(400).json({ status: false, message: 'Link is required' });
  }

  try {
    // Get filename from URL
    const fileName = path.basename(new URL(link).pathname);
    // Get the full file path on the server
    const filePath = path.join(__dirname, '..', 'storage', 'Assets', subfolder, fileName);

    // Replaces File::exists()
    if (fs.existsSync(filePath)) {
      // Replaces File::delete()
      fs.unlinkSync(filePath);
      return res.json({
        status: true,
        message: `${fileType} berhasil dihapus.`,
        file: fileName,
      });
    } else {
      return res.status(404).json({
        status: false,
        message: `${fileType} tidak ditemukan.`,
        file: fileName,
      }, 404);
    }
  } catch (error) {
    logger.error(`Failed to delete ${fileType}`, { error: error.message, link: link });
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

/*
 * Converts: deleteProductImageByLink
 */
const deleteProductImageByLink = (req, res) => {
  return handleDelete(req, res, 'Product_Image', 'Gambar');
};

/*
 * Converts: deleteProductVideoByLink
 */
const deleteProductVideoByLink = (req, res) => {
  return handleDelete(req, res, 'Product_Video', 'Video');
};

const deleteOwnerImageByLink = (req, res) => {
  return handleDelete(req, res, 'Owner_Image', 'Gambar Profil');
};

// Export all the functions
module.exports = {
  uploadStoreImage,
  uploadOwnerImage,
  uploadKtpImage,
  uploadProductImage,
  uploadProductVideo,
  uploadChatMedia,
  deleteProductImageByLink,
  deleteProductVideoByLink,
  deleteOwnerImageByLink
};
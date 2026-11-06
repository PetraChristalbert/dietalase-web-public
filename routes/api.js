var express = require("express");
var router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// --- 1. Import ALL controllers ---
const accountController = require("../controllers/accountController");
const filesController = require("../controllers/filesController");
const loginController = require("../controllers/loginController");
const midtransController = require("../controllers/midtransController");
const registrationController = require("../controllers/registrationController");
const searchController = require("../controllers/searchController");
const storeAdminController = require("../controllers/storeAdminController");
const storeController = require("../controllers/storeController");
const visitController = require("../controllers/visitController");
const whatsappController = require("../controllers/whatsappController");
const aiSearchController = require("../controllers/aiSearchController");
const chatController = require("../controllers/chatController");
const tgController = require("../controllers/tgController");
const reportController = require("../controllers/reportController");
const subscriptionController = require("../controllers/subscriptionController");
const realTimeChatController = require("../controllers/realTimeChatController");
const storeNewsController = require("../controllers/storeNewsController");

// Import the 'multer' config for file uploads
const upload = require("../config/multer");

// --- 2. Register ALL routes ---


// ==========================================
// PUBLIC ROUTES
// ==========================================
// Search
router.post("/searchproductstore", searchController.search_product_store);
router.post("/searchproductdetail", searchController.search_product_detail);
router.post("/bookmarksearching", searchController.bookmark_searching);
router.post("/searchlocation", searchController.search_location);

// Store (Public)
router.post("/getstoreandproducts", storeController.getStoreAndProducts);

// Account (Public Login)
router.post("/fetchOrCreateUser", accountController.fetchOrCreateUser);

// Visit
router.post("/batch-logvisit", visitController.batchLogVisits);

// Registration
router.get("/registration-pending", registrationController.getPendingRegistrations);
router.post("/registration-mark-sent", registrationController.markRegistrationSent);
router.post("/register-request", registrationController.registerRequest);
router.post("/verify-otp", registrationController.verifyOTP);
router.post("/check-pending-store", registrationController.checkPendingStore);

// Login
router.post("/login-check-contact", loginController.checkContactExists);
router.post("/login-request", loginController.loginRequest);
router.get("/login/pending", loginController.getPendingLogins);
router.post("/login/mark-sent", loginController.markLoginSent);
router.post("/login/verify", loginController.verifyOTP);
router.post("/login-verify", loginController.loginVerify);

// Midtrans (Webhooks)
router.post("/midtrans/callback", midtransController.handleCallback);

// AI & Chat (Public)
router.post("/ai-search", aiSearchController.aiSearch);
router.post("/chat", chatController.handleChat);
router.post("/chat/thread", realTimeChatController.getOrCreateThread);
router.post("/chat/threads", realTimeChatController.getOrCreateThread);
router.get("/chat/threads", realTimeChatController.getThreads);
router.get("/chat/messages/:threadId", realTimeChatController.getMessages);
router.post("/chat/messages", realTimeChatController.sendMessage);
router.post("/chat/send", realTimeChatController.sendMessage);
router.post("/chat/read", realTimeChatController.markAsRead);

// Other Public
router.post("/tg/submit", tgController.submitApplication);
router.post("/report", reportController.submitReport);


// ==========================================
// PROTECTED ROUTES (Requires JWT)
// ==========================================
router.use(authMiddleware);

// Store (Protected)
router.post("/store/update/:sid", storeController.updateProfile);
router.get("/store/metrics/:sid", storeController.getStoreDashboardMetrics);
router.post("/store/analysis", storeController.getStoreAnalysis);
router.get("/store/subscription/:sid", subscriptionController.getSubscriptionStatus);
router.post("/store/subscription/upgrade", subscriptionController.upgradeSubscription);

// Account (Protected)
router.post("/storePID", accountController.storePID);
router.post("/storeSID", accountController.storeSID);
router.post("/removePID", accountController.removePID);
router.post("/removeSID", accountController.removeSID);
router.post("/save_route", accountController.saveRoute);
router.post("/get_saved_routes", accountController.getSavedRoutes);
router.post("/delete_saved_route", accountController.deleteSavedRoute);
router.post("/updateUserProfile", accountController.updateUserProfile);
router.get("/user/addresses", accountController.getUserAddresses);
router.post("/user/address/add", accountController.addUserAddress);
router.post("/user/address/delete", accountController.deleteSavedRoute);

// Store Admin (Protected)
router.post("/fetchStore", storeAdminController.fetchStore);
router.post("/registerStore", storeAdminController.registerStore);
router.post("/addProduct", upload.uploadProductMedia, storeAdminController.addProduct);
router.post("/getMerchantProducts", storeAdminController.getMerchantProducts);
router.post("/updateProduct", upload.uploadProductMedia, storeAdminController.updateProduct);
router.post("/deleteProduct", storeAdminController.deleteProduct);
router.post("/updateStoreProfile", storeAdminController.updateStoreProfile);
router.post("/updateStoreGallery", storeAdminController.updateStoreGallery);
router.post("/updateStoreCertification", storeAdminController.updateStoreCertification);
router.post("/store/verify", storeAdminController.verifyAndEnhanceStore);
router.post("/store/analytics", storeAdminController.getStoreAnalytics);

// File Uploads (Protected)
router.post("/store/upload-store-image", upload.uploadStoreImage.single("image"), filesController.uploadStoreImage);
router.post("/store/upload-owner-image", upload.uploadOwnerImage.single("image"), filesController.uploadOwnerImage);
router.post("/store/upload-ktp-image", upload.uploadKtpImage.single("image"), filesController.uploadKtpImage);
router.post("/store/upload-product-image", upload.uploadProductImage.single("image"), filesController.uploadProductImage);
router.post("/store/upload-product-video", upload.uploadProductVideo.single("video"), filesController.uploadProductVideo);
router.post("/delete-product-image", filesController.deleteProductImageByLink);
router.post("/delete-product-video", filesController.deleteProductVideoByLink);
router.post("/delete-owner-image", filesController.deleteOwnerImageByLink);
router.post("/chat/upload-media", upload.uploadChatMedia.single("file"), filesController.uploadChatMedia);

// Store News
router.post("/store/news/add", upload.uploadStoreNews.single("image"), storeNewsController.addNews);

// Midtrans (Protected)
router.get("/midtrans/status/:orderId", midtransController.checkStatus);
router.post("/chatgpt/start-payment", midtransController.startPayment);
router.post("/chatgpt/personal-payment", midtransController.personalPayment);
router.post("/chatgpt/register-referral", midtransController.registerReferral);
router.post("/store/create-subscription-payment", midtransController.createStoreSubscriptionPayment);

// Whatsapp (Protected - Admin only ideally, but keeping it protected)
router.get("/whatsapp-messages/pending", whatsappController.pendingMessages);
router.post("/whatsapp-messages/mark-sent", whatsappController.markMessageSent);

// --- 3. Export the router ---
module.exports = router;

const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
  try {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

// In production, ensure this is set in your .env file
const JWT_SECRET = process.env.JWT_SECRET || 'dietalase_secret_key_2026'; 

const authMiddleware = async (req, res, next) => {
  // 1. Bypass for local development (optional, remove in strict production)
  if (process.env.APP_ENV === 'local' || process.env.NODE_ENV === 'development') {
    // We still try to decode the token if it exists to populate req.user in dev
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, JWT_SECRET);
      } catch (err) {}
    }
    return next();
  }

  // 2. Strict JWT Verification
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: false, error: 'Unauthorized: Missing or invalid token format' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // Will contain eid, sid, etc. depending on login type
    return next();
  } catch (err) {
    console.error('JWT verification failed:', err);
    return res.status(401).json({ status: false, error: 'Unauthorized: Invalid token' });
  }
};

module.exports = authMiddleware;

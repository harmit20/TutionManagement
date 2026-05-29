const admin = require('firebase-admin');

let initialised = false;

const initFirebase = () => {
  if (initialised || process.env.NODE_ENV === 'test') return;

  // Skip silently when Firebase credentials are not configured (local dev)
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.warn('[Firebase] Credentials not set — push notifications disabled');
    return;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Cloud Run / local .env stores the key with literal \n — expand it
      privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  initialised = true;
};

module.exports = { initFirebase, admin };

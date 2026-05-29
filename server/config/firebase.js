const admin = require('firebase-admin');

let initialised = false;

const initFirebase = () => {
  if (initialised || process.env.NODE_ENV === 'test') return;

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Cloud Run / local .env stores the key with literal \n — expand it
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });

  initialised = true;
};

module.exports = { initFirebase, admin };

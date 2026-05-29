const REQUIRED_ALWAYS = ['MONGO_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
const REQUIRED_PROD   = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];

function validateEnv() {
  const missing = REQUIRED_ALWAYS.filter((k) => !process.env[k]);

  if (process.env.NODE_ENV === 'production') {
    missing.push(...REQUIRED_PROD.filter((k) => !process.env[k]));
  }

  if (missing.length === 0) return;

  const msg = `[Startup] Missing required environment variables:\n  ${missing.join('\n  ')}`;

  if (process.env.NODE_ENV === 'production') {
    console.error(msg);
    process.exit(1);
  } else {
    console.warn(msg);
    console.warn('[Startup] Running in dev/test mode — some features may be unavailable.\n');
  }
}

module.exports = { validateEnv };

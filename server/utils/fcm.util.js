const { admin } = require('../config/firebase');
const FCMToken = require('../models/FCMToken');

// FCM multicast limit per request
const CHUNK_SIZE = 500;

const isConfigured = () =>
  !!(process.env.FIREBASE_PROJECT_ID &&
     process.env.FIREBASE_CLIENT_EMAIL &&
     process.env.FIREBASE_PRIVATE_KEY);

/**
 * Low-level: send a notification to an explicit list of FCM tokens.
 * Chunks into batches of 500 (FCM limit).
 * Returns { successCount, failureCount, failedTokens }.
 * failedTokens are ones Firebase says are invalid/unregistered — callers
 * should deactivate them.
 */
async function sendMulticast(tokens, notification, data = {}) {
  if (!tokens.length) return { successCount: 0, failureCount: 0, failedTokens: [] };

  if (!isConfigured()) {
    console.warn('[FCM] Firebase not configured — skipping push delivery');
    return { successCount: 0, failureCount: 0, failedTokens: [] };
  }

  // FCM data payload values must be strings
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  let successCount = 0;
  let failureCount = 0;
  const failedTokens = [];

  for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
    const chunk = tokens.slice(i, i + CHUNK_SIZE);

    const response = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: stringData,
      webpush: {
        notification: { icon: '/icons/icon-192x192.png' },
        fcmOptions: { link: notification.link || '/' },
      },
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    });

    successCount += response.successCount;
    failureCount += response.failureCount;

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        // These codes mean the token is permanently invalid — safe to purge
        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          failedTokens.push(chunk[idx]);
        }
      }
    });
  }

  return { successCount, failureCount, failedTokens };
}

/**
 * High-level: resolve active FCM tokens for a list of user IDs, then
 * send and auto-clean any stale tokens.
 */
async function sendToUsers(userIds, notification, data = {}) {
  if (!userIds.length) return { successCount: 0, failureCount: 0 };

  const tokenDocs = await FCMToken.find({
    user: { $in: userIds },
    isActive: true,
  })
    .select('token')
    .lean();

  if (!tokenDocs.length) return { successCount: 0, failureCount: 0 };

  const tokens = tokenDocs.map((t) => t.token);
  const result = await sendMulticast(tokens, notification, data);

  if (result.failedTokens.length) {
    await deactivateTokens(result.failedTokens);
  }

  return result;
}

/** Mark invalid/expired tokens inactive so cron jobs skip them. */
async function deactivateTokens(tokens) {
  if (!tokens.length) return;
  await FCMToken.updateMany({ token: { $in: tokens } }, { isActive: false });
}

module.exports = { sendMulticast, sendToUsers, deactivateTokens, isConfigured };

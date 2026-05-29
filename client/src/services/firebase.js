import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const app = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
});

const messaging = getMessaging(app);

/**
 * Requests notification permission, gets the FCM registration token,
 * and registers it with the backend.
 *
 * Uses the MAIN service worker (sw.js) which already handles background
 * push messages via Firebase Messaging — no separate firebase-messaging-sw.js
 * needed. One SW handles everything.
 */
export async function registerPushToken(apiClient) {
  try {
    if (Notification.permission === 'denied') return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Point Firebase at the combined sw.js so we don't register a second SW
    await navigator.serviceWorker.register('/sw.js', { type: 'classic', scope: '/' });
    const swReg = await navigator.serviceWorker.ready;

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) return null;
    await apiClient.post('/notifications/token', { token, deviceType: 'web' });
    return token;
  } catch (err) {
    console.warn('[FCM] Token registration failed:', err.message);
    return null;
  }
}

export async function revokePushToken(apiClient, token) {
  if (!token) return;
  try { await apiClient.post('/notifications/token/revoke', { token }); } catch { /* non-fatal */ }
}

/**
 * Foreground message listener.
 * Fires when the app tab is OPEN and a push arrives.
 * Pass a callback to display an in-app toast/banner.
 */
export function onForegroundMessage(callback) {
  return onMessage(messaging, ({ notification, data }) =>
    callback({ title: notification?.title, body: notification?.body, data })
  );
}

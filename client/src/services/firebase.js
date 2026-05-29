import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const CONFIG = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase requires a valid projectId and apiKey to initialise.
// When these are blank (local dev without Firebase configured) every
// exported function becomes a safe no-op so the rest of the app still loads.
const isConfigured = !!(CONFIG.projectId && CONFIG.apiKey);

let _messaging = null;
if (isConfigured) {
  try {
    const app = initializeApp(CONFIG);
    _messaging = getMessaging(app);
  } catch (e) {
    console.warn('[Firebase] Init failed — push notifications disabled:', e.message);
  }
}

export async function registerPushToken(apiClient) {
  if (!_messaging) return null;
  try {
    if (Notification.permission === 'denied') return null;
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    await navigator.serviceWorker.register('/sw.js', { type: 'classic', scope: '/' });
    const swReg = await navigator.serviceWorker.ready;

    const token = await getToken(_messaging, {
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

export function onForegroundMessage(callback) {
  if (!_messaging) return () => {};
  return onMessage(_messaging, ({ notification, data }) =>
    callback({ title: notification?.title, body: notification?.body, data })
  );
}

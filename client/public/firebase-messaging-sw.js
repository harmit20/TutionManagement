// DEPRECATED — Phase 6 merged this into src/sw.js (the main Workbox SW).
// Firebase's getToken() now points to /sw.js so only one service worker is
// registered at scope /. This file is kept for reference only and is NOT
// served or registered by the app.
//
// Firebase Messaging Service Worker (original — superseded)
// Must live at the root so FCM can register it at /firebase-messaging-sw.js
// Replace the config values below with your actual Firebase project config.
// These are PUBLIC keys — safe to include in client code.

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: self.__FIREBASE_API_KEY__ || 'REPLACE_ME',
  authDomain: self.__FIREBASE_AUTH_DOMAIN__ || 'REPLACE_ME',
  projectId: self.__FIREBASE_PROJECT_ID__ || 'REPLACE_ME',
  storageBucket: self.__FIREBASE_STORAGE_BUCKET__ || 'REPLACE_ME',
  messagingSenderId: self.__FIREBASE_MESSAGING_SENDER_ID__ || 'REPLACE_ME',
  appId: self.__FIREBASE_APP_ID__ || 'REPLACE_ME',
});

const messaging = firebase.messaging();

// Background message handler — fires when the app tab is closed/backgrounded.
// The notification is assembled here so it appears in the OS notification tray.
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {};
  const link = payload.data?.link || '/';

  self.registration.showNotification(title || 'Tuition App', {
    body: body || '',
    icon: icon || '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: { link },
    actions: [{ action: 'open', title: 'View' }],
  });
});

// Handle notification click — focuses an existing tab or opens a new one
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(link);
            return client.focus();
          }
        }
        return clients.openWindow(link);
      })
  );
});

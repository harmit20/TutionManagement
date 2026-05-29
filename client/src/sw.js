/**
 * Combined service worker — Workbox precaching/runtime caching + Firebase
 * Cloud Messaging background handler.
 *
 * Processed by vite-plugin-pwa (injectManifest strategy):
 *   • self.__WB_MANIFEST is replaced with the Vite-built asset manifest
 *   • import.meta.env.VITE_* values are inlined at build time
 *   • All imports are bundled — no importScripts() needed
 */

import {
  precacheAndRoute,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst }         from 'workbox-strategies';
import { ExpirationPlugin }                 from 'workbox-expiration';
import { CacheableResponsePlugin }          from 'workbox-cacheable-response';
import { initializeApp }                    from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// ─── Workbox: Precache all Vite-built static assets ──────────────────────
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA navigation fallback — serve index.html for any URL not in the precache
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html')));

// ─── Runtime caching strategies ──────────────────────────────────────────

/**
 * Uploaded study materials and files:
 * Cache-First — content rarely changes, served from cache first to allow
 * offline reading. 30-day TTL, max 100 entries.
 */
registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads/'),
  new CacheFirst({
    cacheName: 'study-materials-v1',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

/**
 * API responses:
 * Network-First — prefer fresh data, fall back to 5-min-old cache when
 * offline. Keeps fees/attendance viewable without connectivity.
 */
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache-v1',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 5 * 60 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  })
);

/**
 * Fonts and remote images:
 * Cache-First with long TTL — immutable content.
 */
registerRoute(
  ({ request, url }) =>
    request.destination === 'font' ||
    (request.destination === 'image' && !url.pathname.startsWith('/uploads/')),
  new CacheFirst({
    cacheName: 'static-assets-v1',
    plugins: [
      new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 90 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Firebase Cloud Messaging: background push handler ───────────────────
// import.meta.env values are inlined by Vite at build time.
// VITE_FIREBASE_* are PUBLIC web API keys — safe to bundle in client code.
const firebaseApp = initializeApp({
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
});

const messaging = getMessaging(firebaseApp);

// Fires when a push arrives while the browser tab is closed / backgrounded.
// The notification is assembled here so it appears in the OS tray.
onBackgroundMessage(messaging, ({ notification = {}, data = {} }) => {
  const { title = 'TuitionApp', body = '', icon } = notification;
  self.registration.showNotification(title, {
    body,
    icon:    icon || '/icons/icon-192.png',
    badge:   '/icons/badge-72x72.png',
    data:    { link: data.link || '/' },
    vibrate: [200, 100, 200],
    tag:     data.type || 'tuition-notification', // replaces older same-type notif
    renotify: true,
  });
});

// Navigate to the linked page when the user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((cs) => {
        const existing = cs.find((c) => c.url.startsWith(self.location.origin));
        if (existing) { existing.navigate(link); return existing.focus(); }
        return clients.openWindow(link);
      })
  );
});

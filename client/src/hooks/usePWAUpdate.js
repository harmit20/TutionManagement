import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Detects when a new service worker is waiting and exposes a one-call
 * `updateServiceWorker(true)` to reload with the new version.
 * Also triggers a periodic background check every hour.
 */
export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_, registration) {
      if (!registration) return;
      // Poll for updates every hour (catches deployments while app is open)
      setInterval(() => registration.update(), 60 * 60 * 1000);
    },
    onOfflineReady() {
      console.log('[PWA] Ready for offline use');
    },
  });

  const dismiss = () => setNeedRefresh(false);

  return { needRefresh, updateServiceWorker, dismiss };
}

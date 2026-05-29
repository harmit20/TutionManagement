import { useState, useEffect } from 'react';

/**
 * Captures the browser's `beforeinstallprompt` event so we can show a
 * custom install banner instead of the default browser UI.
 *
 * Returns:
 *   canInstall  – true when the browser is ready AND user hasn't installed yet
 *   install()   – triggers the native install dialog
 *   isInstalled – true when running in standalone mode
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled]       = useState(
    window.matchMedia('(display-mode: standalone)').matches
  );

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    const onInstalled = () => { setIsInstalled(true); setDeferredPrompt(null); };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome === 'accepted';
  };

  return { canInstall: !!deferredPrompt && !isInstalled, install, isInstalled };
}

import { useState } from 'react';
import { ArrowDownTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';

export default function InstallPrompt() {
  const { canInstall, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-indigo-100 rounded-xl shadow-xl p-4 flex items-center gap-3 z-40">
      <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
        <ArrowDownTrayIcon className="h-5 w-5 text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">Install TuitionApp</p>
        <p className="text-xs text-gray-500 mt-0.5">Add to home screen for offline access</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={install} className="btn-primary text-xs px-3 py-1.5">
          Install
        </button>
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600 transition-colors">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

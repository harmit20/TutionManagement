import { ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { usePWAUpdate } from '../../hooks/usePWAUpdate';

export default function UpdatePrompt() {
  const { needRefresh, updateServiceWorker, dismiss } = usePWAUpdate();
  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-24 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-indigo-600 text-white rounded-xl shadow-xl p-4 flex items-center gap-3 z-50 animate-in slide-in-from-bottom-4">
      <ArrowPathIcon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">New version available</p>
        <p className="text-xs text-indigo-200 mt-0.5">Refresh to get the latest update</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => updateServiceWorker(true)}
          className="bg-white text-indigo-600 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Update
        </button>
        <button onClick={dismiss} className="text-indigo-300 hover:text-white transition-colors">
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

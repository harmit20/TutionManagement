import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { onForegroundMessage } from '../services/firebase';
import { useAuth } from '../context/AuthContext';

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    // Show in-app toast for pushes that arrive while the tab is open
    const unsubscribe = onForegroundMessage(({ title, body }) => {
      toast(
        <div>
          <p className="font-medium text-sm">{title}</p>
          {body && <p className="text-xs text-gray-600 mt-0.5">{body}</p>}
        </div>,
        { duration: 5000 }
      );
    });
    return () => unsubscribe?.();
  }, [user]);
}

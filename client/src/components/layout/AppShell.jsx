import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function AppShell() {
  usePushNotifications(); // registers FCM token + foreground message handler

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}

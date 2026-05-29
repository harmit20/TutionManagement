import { NavLink } from 'react-router-dom';
import {
  Squares2X2Icon, UsersIcon, CurrencyRupeeIcon, BanknotesIcon,
  UserPlusIcon, DocumentTextIcon, CalendarIcon, BookOpenIcon,
  ClipboardDocumentCheckIcon, FolderOpenIcon, CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const NAV = {
  admin:        [
    { to: '/admin',          icon: Squares2X2Icon,  label: 'Home',    end: true },
    { to: '/admin/users',    icon: UsersIcon,       label: 'Users' },
    { to: '/admin/payouts',  icon: BanknotesIcon,   label: 'Payouts' },
    { to: '/admin/reports',  icon: DocumentTextIcon,label: 'Reports' },
  ],
  receptionist: [
    { to: '/receptionist/enrollments', icon: UserPlusIcon,       label: 'Enroll' },
    { to: '/receptionist/fees',        icon: CurrencyRupeeIcon,  label: 'Fees' },
    { to: '/receptionist/timetable',   icon: CalendarIcon,       label: 'Timetable' },
  ],
  teacher: [
    { to: '/teacher/batches',    icon: BookOpenIcon,                label: 'Batches' },
    { to: '/teacher/attendance', icon: ClipboardDocumentCheckIcon,  label: 'Attend.' },
    { to: '/teacher/payouts',    icon: BanknotesIcon,               label: 'Payouts' },
  ],
  student: [
    { to: '/student/fees',       icon: CurrencyRupeeIcon, label: 'Fees' },
    { to: '/student/tests',      icon: DocumentTextIcon,  label: 'Tests' },
    { to: '/student/attendance', icon: CalendarDaysIcon,  label: 'Attend.' },
    { to: '/student/materials',  icon: FolderOpenIcon,    label: 'Materials' },
  ],
};

export default function BottomNav() {
  const { user } = useAuth();
  const links = NAV[user?.role] ?? [];

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40 safe-area-inset-bottom">
      <div className="flex">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-600' : 'text-gray-500'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-6 w-6 mb-0.5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

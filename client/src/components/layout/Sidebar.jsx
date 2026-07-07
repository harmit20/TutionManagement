import { NavLink } from 'react-router-dom';
import {
  Squares2X2Icon, UsersIcon, CurrencyRupeeIcon, BanknotesIcon, ChartBarIcon,
  UserPlusIcon, DocumentTextIcon, CalendarIcon, BookOpenIcon,
  ClipboardDocumentCheckIcon, FolderOpenIcon, CalendarDaysIcon,
  ShieldCheckIcon, ChatBubbleLeftRightIcon, ReceiptPercentIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../context/AuthContext';

const NAV = {
  admin: [
    { to: '/admin',          icon: Squares2X2Icon,          label: 'Dashboard', end: true },
    { to: '/admin/users',    icon: UsersIcon,               label: 'Users' },
    { to: '/admin/pricing',  icon: CurrencyRupeeIcon,       label: 'Pricing' },
    { to: '/admin/payouts',  icon: BanknotesIcon,           label: 'Payouts' },
    { to: '/admin/expenses', icon: ReceiptPercentIcon,      label: 'Expenses' },
    { to: '/admin/reports',  icon: ChartBarIcon,            label: 'Reports' },
    { to: '/admin/messages', icon: ChatBubbleLeftRightIcon, label: 'Messages' },
    { to: '/admin/audit',    icon: ShieldCheckIcon,         label: 'Audit Log' },
  ],
  receptionist: [
    { to: '/receptionist/enquiries',   icon: ChatBubbleLeftRightIcon, label: 'Enquiries' },
    { to: '/receptionist/enrollments', icon: UserPlusIcon,           label: 'Enrollments' },
    { to: '/receptionist/fees',        icon: CurrencyRupeeIcon,      label: 'Fee Collection' },
    { to: '/receptionist/receipts',    icon: DocumentTextIcon,       label: 'Receipts' },
    { to: '/receptionist/timetable',   icon: CalendarIcon,           label: 'Timetable' },
  ],
  teacher: [
    { to: '/teacher/batches',    icon: BookOpenIcon,                  label: 'My Batches' },
    { to: '/teacher/attendance', icon: ClipboardDocumentCheckIcon,   label: 'Attendance' },
    { to: '/teacher/payouts',    icon: BanknotesIcon,                 label: 'My Payouts' },
  ],
  student: [
    { to: '/student/fees',       icon: CurrencyRupeeIcon, label: 'Fee Status' },
    { to: '/student/tests',      icon: DocumentTextIcon,  label: 'Tests' },
    { to: '/student/attendance', icon: CalendarDaysIcon,  label: 'Attendance' },
    { to: '/student/materials',  icon: FolderOpenIcon,    label: 'Materials' },
    { to: '/student/announcements', icon: ChatBubbleLeftRightIcon, label: 'Announcements' },
  ],
  parent: [
    { to: '/parent', icon: UsersIcon, label: 'My Children', end: true },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const links = NAV[user?.role] ?? [];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen print:hidden">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <span className="text-lg font-bold text-indigo-600">TuitionApp</span>
        <p className="text-xs text-gray-500 capitalize mt-0.5">{user?.role} panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left text-sm text-red-600 hover:text-red-700 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { UsersIcon, AcademicCapIcon, BookOpenIcon, ExclamationTriangleIcon, CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import Spinner from '../../components/shared/Spinner';
import PageHeader from '../../components/shared/PageHeader';

function StatCard({ label, value, icon: Icon, color, to }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue:   'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green:  'bg-green-50 text-green-600',
  };
  return (
    <Link to={to} className="card flex items-center gap-4 hover:shadow-md hover:ring-1 hover:ring-indigo-100 transition-all cursor-pointer">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of your tuition centre" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Students" value={data?.totalStudents}  icon={UsersIcon}               color="indigo" to="/admin/users?role=student" />
        <StatCard label="Teachers"       value={data?.totalTeachers}  icon={AcademicCapIcon}         color="blue"   to="/admin/users?role=teacher" />
        <StatCard label="Active Batches" value={data?.totalBatches}   icon={BookOpenIcon}            color="purple" to="/receptionist/enrollments" />
        <StatCard label="Pending Fees"   value={data?.pendingFees}    icon={ExclamationTriangleIcon} color="yellow" to="/receptionist/fees"        />
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-1">
          <CurrencyRupeeIcon className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium text-gray-600">Collected this month</span>
        </div>
        <p className="text-3xl font-bold text-gray-900">
          ₹{(data?.feeCollectedThisMonth ?? 0).toLocaleString('en-IN')}
        </p>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Recent Enrollments</h2>
        {data?.recentEnrollments?.length ? (
          <div className="divide-y divide-gray-50">
            {data.recentEnrollments.map((s) => (
              <div key={s._id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.user?.name}</p>
                  <p className="text-xs text-gray-500">{s.classLevel}</p>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(s.createdAt).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No recent enrollments.</p>
        )}
      </div>
    </div>
  );
}

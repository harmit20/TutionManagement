import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';

export default function MyChildren() {
  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: () => api.get('/parent/children').then((r) => r.data),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Children" subtitle="Attendance, fees, and progress at a glance" />

      {!children?.length ? (
        <EmptyState
          title="No children linked yet"
          description="Ask the tuition centre to link your children to this account."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {children.map((c) => (
            <Link key={c.id} to={`/parent/children/${c.id}`} className="card hover:shadow-md transition-shadow block">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{c.enrollmentNumber} · {c.classLevel}</p>
                </div>
                <span className="text-xs text-indigo-600 font-medium">View details →</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Attendance</p>
                  <p className={`text-lg font-bold ${c.attendanceRate == null ? 'text-gray-400' : c.attendanceRate >= 75 ? 'text-green-700' : 'text-red-600'}`}>
                    {c.attendanceRate == null ? '—' : `${c.attendanceRate}%`}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Fees Due</p>
                  <p className={`text-lg font-bold ${c.pendingAmount > 0 ? 'text-amber-600' : 'text-green-700'}`}>
                    ₹{c.pendingAmount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {c.batches?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.batches.map((b) => (
                    <span key={b._id} className="bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 text-xs">{b.name}</span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

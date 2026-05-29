import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';

function AttendanceBar({ percent }) {
  const color = percent >= 75 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-400' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <span className={`text-sm font-semibold ${percent >= 75 ? 'text-green-700' : percent >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>{percent}%</span>
    </div>
  );
}

export default function MyAttendance() {
  const { data, isLoading } = useQuery({
    queryKey: ['student-attendance'],
    queryFn: () => api.get('/student/attendance').then((r) => r.data),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Attendance" subtitle="Attendance across all your batches" />

      {/* Per-batch summary */}
      {data?.summary?.length > 0 && (
        <div className="space-y-3 mb-6">
          {data.summary.map((s) => (
            <div key={s.batch._id} className="card">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{s.batch.name}</p>
                  <p className="text-xs text-gray-500">{s.batch.subject}</p>
                </div>
                <span className="text-xs text-gray-500">{s.present}/{s.totalClasses} classes</span>
              </div>
              <AttendanceBar percent={s.attendancePercent} />
              {s.attendancePercent < 75 && (
                <p className="text-xs text-red-600 mt-1.5">Below 75% — {Math.ceil((0.75 * s.totalClasses - s.present) / 0.25)} more classes needed to reach 75%</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detailed log */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Attendance Log</h2>
      {!data?.records?.length ? <EmptyState title="No attendance records yet" /> : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Date','Batch','Subject','Status'].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.records.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">{format(new Date(r.date), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 font-medium">{r.batch?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{r.batch?.subject}</td>
                    <td className="px-4 py-3"><Badge label={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

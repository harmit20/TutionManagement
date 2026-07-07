import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/shared/Spinner';
import Badge from '../../components/shared/Badge';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import PayNowButton from '../../components/shared/PayNowButton';

function StatTile({ label, value, accent = 'text-gray-900' }) {
  return (
    <div className="card">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const endpoint = user?.role === 'parent'
    ? `/parent/children/${id}/summary`
    : `${user?.role === 'admin' ? '/admin' : '/receptionist'}/students/${id}/summary`;

  const { data, isLoading } = useQuery({
    queryKey: ['student-summary', id],
    queryFn: () => api.get(endpoint).then((r) => r.data),
  });

  if (isLoading) return <Spinner />;
  if (!data) return <EmptyState title="Student not found" />;

  const { profile, stats, fees, recentAttendance, testResults } = data;

  return (
    <div>
      {/* Header */}
      <div className="card mb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{profile.name}</h1>
              <Badge label={profile.isActive ? 'active' : 'inactive'} />
              <Badge label={profile.classLevel} variant="active" />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {profile.enrollmentNumber} · {profile.email}{profile.phone ? ` · ${profile.phone}` : ''}
            </p>
            {(profile.parentName || profile.parentPhone) && (
              <p className="text-sm text-gray-600 mt-2">
                Parent: <span className="font-medium">{profile.parentName || '—'}</span>
                {profile.parentPhone && <span className="text-gray-500"> · {profile.parentPhone}</span>}
              </p>
            )}
          </div>
          <div className="text-right text-xs text-gray-400">
            Joined {profile.joinedAt ? format(new Date(profile.joinedAt), 'dd MMM yyyy') : '—'}
          </div>
        </div>
        {profile.batches?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.batches.map((b) => (
              <span key={b._id} className="bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                {b.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatTile
          label="Attendance"
          value={stats.attendanceRate == null ? '—' : `${stats.attendanceRate}%`}
          accent={stats.attendanceRate >= 75 ? 'text-green-700' : stats.attendanceRate == null ? 'text-gray-900' : 'text-red-600'}
        />
        <StatTile
          label="Pending Fees"
          value={`₹${stats.pendingAmount.toLocaleString('en-IN')}`}
          accent={stats.pendingAmount > 0 ? 'text-amber-600' : 'text-green-700'}
        />
        <StatTile label="Batches" value={stats.batchCount} />
        <StatTile label="Tests Taken" value={testResults.length} />
      </div>

      {/* Fees */}
      <h2 className="text-base font-semibold text-gray-900 mb-3">Fee History</h2>
      <DataTable
        rows={fees}
        empty={{ title: 'No fee records' }}
        columns={[
          { header: 'Batch', render: (f) => f.batch?.name, className: 'font-medium' },
          { header: 'Amount', render: (f) => `₹${f.amount}` },
          { header: 'Paid', render: (f) => `₹${f.amountPaid || 0}`, className: 'text-gray-600' },
          { header: 'Due', render: (f) => format(new Date(f.dueDate), 'dd MMM yyyy'), className: 'text-gray-600' },
          { header: 'Status', render: (f) => <Badge label={f.status} /> },
          ...(user?.role === 'parent' ? [{
            header: '',
            render: (f) => f.status !== 'paid' && f.status !== 'waived' && (
              <PayNowButton feeId={f._id} basePath="/parent" />
            ),
          }] : []),
        ]}
      />

      {/* Attendance + Tests side by side */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Attendance</h2>
          {!recentAttendance.length ? (
            <div className="card p-0"><EmptyState title="No attendance yet" /></div>
          ) : (
            <div className="card divide-y divide-gray-50 p-0">
              {recentAttendance.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <p className="text-gray-900">{format(new Date(r.date), 'dd MMM yyyy')}</p>
                    <p className="text-xs text-gray-500">{r.batch?.name}</p>
                  </div>
                  <Badge label={r.status} />
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Test Results</h2>
          {!testResults.length ? (
            <div className="card p-0"><EmptyState title="No test results yet" /></div>
          ) : (
            <div className="card divide-y divide-gray-50 p-0">
              {testResults.map((r) => (
                <div key={r._id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div>
                    <p className="text-gray-900 font-medium">{r.test?.title}</p>
                    <p className="text-xs text-gray-500">{r.test?.subject} · {r.test?.batch?.name}</p>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {r.marksObtained}/{r.test?.totalMarks}
                    {r.grade && <span className="ml-2 text-xs text-indigo-600">{r.grade}</span>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

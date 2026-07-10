import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';
import FilterBar from '../../components/shared/FilterBar';

const fmt = (d) => format(d, 'yyyy-MM-dd');

export default function ReportCard() {
  const { id } = useParams();
  const { user } = useAuth();
  const [from, setFrom] = useState(fmt(startOfMonth(subMonths(new Date(), 2))));
  const [to, setTo] = useState(fmt(endOfMonth(new Date())));

  const base = user?.role === 'parent'
    ? `/parent/children/${id}`
    : `${user?.role === 'admin' ? '/admin' : '/receptionist'}/students/${id}`;
  const backTo = user?.role === 'parent' ? `/parent/children/${id}` : `${user?.role === 'admin' ? '/admin' : '/receptionist'}/students/${id}`;

  const { data, isLoading } = useQuery({
    queryKey: ['report-card', id, from, to],
    queryFn: () => api.get(`${base}/report-card`, { params: { from, to } }).then((r) => r.data),
  });

  return (
    <div>
      {/* Controls — hidden when printing */}
      <div className="print:hidden">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <Link to={backTo} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">← Back to profile</Link>
          <button className="btn-primary" onClick={() => window.print()}>Print</button>
        </div>
        <FilterBar>
          <div><label className="label">From</label><input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="label">To</label><input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        </FilterBar>
      </div>

      {isLoading ? <Spinner /> : !data ? <EmptyState title="Student not found" /> : (
        <div className="card max-w-3xl mx-auto print:shadow-none print:border-0">
          {/* Letterhead */}
          <div className="text-center border-b-2 border-gray-900 pb-4 mb-5">
            <h1 className="text-2xl font-bold text-gray-900">TuitionApp</h1>
            <p className="text-sm text-gray-500 mt-1">Progress Report</p>
            <p className="text-xs text-gray-400 mt-1">
              {data.period.from ? format(new Date(data.period.from), 'dd MMM yyyy') : 'Beginning'} — {data.period.to ? format(new Date(data.period.to), 'dd MMM yyyy') : 'Today'}
            </p>
          </div>

          {/* Student block */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm mb-6">
            <div className="flex justify-between"><span className="text-gray-500">Student</span><span className="font-semibold">{data.student.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Enrollment No.</span><span className="font-mono">{data.student.enrollmentNumber}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Class</span><span>{data.student.classLevel}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Batches</span><span className="text-right">{data.student.batches.join(', ') || '—'}</span></div>
          </div>

          {/* Tests */}
          {!data.tests.length ? (
            <p className="text-sm text-gray-500 text-center py-8">No tests were taken in this period.</p>
          ) : (
            <table className="w-full text-sm mb-6">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  {['Test', 'Subject', 'Date', 'Marks', 'Batch Avg', 'Rank', 'Grade'].map((h) => (
                    <th key={h} className="text-left py-2 pr-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.tests.map((t, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-3 font-medium">{t.test}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{t.subject}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{t.date ? format(new Date(t.date), 'dd MMM') : '—'}</td>
                    <td className="py-2.5 pr-3 font-semibold">{t.marks}/{t.totalMarks}</td>
                    <td className="py-2.5 pr-3 text-gray-600">{t.batchAverage ?? '—'}</td>
                    <td className="py-2.5 pr-3">{t.rank}<span className="text-xs text-gray-400">/{t.outOf}</span></td>
                    <td className="py-2.5 font-medium text-indigo-700">{t.grade || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Attendance */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 text-sm print:border print:border-gray-300">
            <span className="text-gray-600">Attendance in period</span>
            <span className="font-semibold">
              {data.attendance.rate == null ? 'No classes recorded' : `${data.attendance.present}/${data.attendance.total} classes (${data.attendance.rate}%)`}
            </span>
          </div>

          {/* Signature line (print) */}
          <div className="hidden print:flex justify-between mt-16 pt-8 text-sm text-gray-600">
            <span className="border-t border-gray-400 px-8 pt-1">Class Teacher</span>
            <span className="border-t border-gray-400 px-8 pt-1">Parent</span>
            <span className="border-t border-gray-400 px-8 pt-1">Director</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Badge from '../../components/shared/Badge';

const now = new Date();

export default function AdminReports() {
  const [tab, setTab]     = useState('fees');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  const feeQuery = useQuery({
    queryKey: ['report-fees', month, year],
    queryFn: () => api.get('/admin/reports/fees', { params: { month, year } }).then((r) => r.data),
    enabled: tab === 'fees',
  });

  const attQuery = useQuery({
    queryKey: ['report-attendance', month, year],
    queryFn: () => api.get('/admin/reports/attendance', { params: { month, year } }).then((r) => r.data),
    enabled: tab === 'attendance',
  });

  return (
    <div>
      <PageHeader title="Reports" subtitle="Aggregate data by month" />

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap items-center">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {['fees','attendance'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{t}</button>
          ))}
        </div>
        <select className="input w-32" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{new Date(2000,i).toLocaleString('en',{month:'short'})}</option>)}
        </select>
        <input className="input w-28" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
      </div>

      {/* Fee Report */}
      {tab === 'fees' && (
        feeQuery.isLoading ? <Spinner /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {feeQuery.data?.map((row) => (
              <div key={row._id} className="card text-center">
                <Badge label={row._id} />
                <p className="text-2xl font-bold text-gray-900 mt-2">{row.count}</p>
                <p className="text-sm text-gray-500">₹{row.total?.toLocaleString('en-IN')}</p>
                <p className="text-xs text-green-600 font-medium mt-0.5">Collected ₹{row.collected?.toLocaleString('en-IN')}</p>
              </div>
            ))}
          </div>
        )
      )}

      {/* Attendance Report */}
      {tab === 'attendance' && (
        attQuery.isLoading ? <Spinner /> : (
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Batch','Date','Present','Absent','Rate'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {attQuery.data?.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{r.batch?.name}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(r.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-3 text-green-700">{r.present}</td>
                      <td className="px-4 py-3 text-red-600">{r.absent}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${r.attendanceRate >= 75 ? 'text-green-700' : 'text-red-600'}`}>{r.attendanceRate}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}

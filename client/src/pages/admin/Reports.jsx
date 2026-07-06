import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Badge from '../../components/shared/Badge';
import DataTable from '../../components/shared/DataTable';
import EmptyState from '../../components/shared/EmptyState';
import FilterBar, { TabGroup } from '../../components/shared/FilterBar';
import MonthStepper from '../../components/shared/MonthStepper';

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
      <FilterBar>
        <TabGroup options={['fees','attendance']} value={tab} onChange={setTab} />
        <MonthStepper month={month} year={year} onChange={({ month: m, year: y }) => { setMonth(m); setYear(y); }} />
      </FilterBar>

      {/* Fee Report */}
      {tab === 'fees' && (
        feeQuery.isLoading ? <Spinner /> : !feeQuery.data?.length ? (
          <div className="card p-0"><EmptyState title="No fee data" description="No fee records exist for this month." /></div>
        ) : (
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
        <DataTable
          isLoading={attQuery.isLoading}
          rows={attQuery.data}
          rowKey={(r) => `${r.batch?._id}-${r.date}`}
          empty={{ title: 'No attendance records', description: 'No attendance was marked in this month.' }}
          columns={[
            { header: 'Batch', render: (r) => r.batch?.name, className: 'font-medium' },
            { header: 'Date', render: (r) => new Date(r.date).toLocaleDateString('en-IN'), className: 'text-gray-600' },
            { header: 'Present', render: (r) => r.present, className: 'text-green-700' },
            { header: 'Absent', render: (r) => r.absent, className: 'text-red-600' },
            { header: 'Rate', render: (r) => <span className={`font-medium ${r.attendanceRate >= 75 ? 'text-green-700' : 'text-red-600'}`}>{r.attendanceRate}%</span> },
          ]}
        />
      )}
    </div>
  );
}

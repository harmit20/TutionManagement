import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import DataTable from '../../components/shared/DataTable';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';

const ENTITY_TYPES = ['User', 'FeeRecord', 'PaymentLedger', 'PricingRule', 'StudentProfile', 'StudyMaterial'];

export default function AuditLog() {
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, page],
    queryFn: () => api.get('/admin/audit-logs', { params: { entityType, page } }).then((r) => r.data),
  });

  return (
    <div>
      <PageHeader title="Audit Log" subtitle="Who did what, and when" />

      <FilterBar className="mb-4">
        <select className="input w-48" value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1); }}>
          <option value="">All record types</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </FilterBar>

      <DataTable
        isLoading={isLoading}
        rows={data?.logs}
        empty={{ title: 'No audit entries', description: 'Actions like fee collection and payout changes will be recorded here.' }}
        columns={[
          { header: 'When', render: (l) => format(new Date(l.createdAt), 'dd MMM yyyy, hh:mm a'), className: 'text-gray-600 whitespace-nowrap' },
          { header: 'Who', render: (l) => <>{l.actorName} <span className="text-xs text-gray-400 capitalize">({l.actorRole})</span></>, className: 'font-medium' },
          { header: 'Action', render: (l) => <Badge label={l.action} /> },
          { header: 'Record', render: (l) => l.entityType, className: 'text-gray-600' },
          {
            header: 'Details',
            render: (l) => l.meta ? (
              <span className="text-xs text-gray-500 font-mono">
                {Object.entries(l.meta).filter(([, v]) => v !== undefined && v !== null)
                  .map(([k, v]) => `${k}: ${v}`).join(' · ')}
              </span>
            ) : null,
          },
        ]}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={setPage} />
    </div>
  );
}

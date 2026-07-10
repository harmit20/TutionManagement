import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import DataTable from '../../components/shared/DataTable';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';

const TEMPLATES = [
  { value: '', label: 'All types' },
  { value: 'absence_alert', label: 'Absence alerts' },
  { value: 'fee_reminder', label: 'Fee reminders' },
  { value: 'fee_receipt', label: 'Payment receipts' },
];

export default function Messages() {
  const [template, setTemplate] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['message-logs', template, page],
    queryFn: () => api.get('/admin/message-logs', { params: { template, page } }).then((r) => r.data),
  });

  return (
    <div>
      <PageHeader title="Messages" subtitle="WhatsApp/SMS alerts sent to parents" />

      <FilterBar className="mb-4">
        <select className="input w-48" value={template} onChange={(e) => { setTemplate(e.target.value); setPage(1); }}>
          {TEMPLATES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </FilterBar>

      <DataTable
        isLoading={isLoading}
        rows={data?.logs}
        empty={{
          title: 'No messages yet',
          description: 'Absence alerts and fee reminders to parents will appear here. Set MESSAGING_PROVIDER in server/.env to send real WhatsApp/SMS.',
        }}
        columns={[
          { header: 'When', render: (l) => format(new Date(l.createdAt), 'dd MMM, hh:mm a'), className: 'text-gray-600 whitespace-nowrap' },
          { header: 'Student', render: (l) => l.student?.user?.name ?? '—', className: 'font-medium' },
          { header: 'To', render: (l) => l.to, className: 'font-mono text-xs' },
          { header: 'Type', render: (l) => <Badge label={l.template.replace('_', ' ')} /> },
          { header: 'Channel', render: (l) => l.channel, className: 'text-gray-600' },
          { header: 'Status', render: (l) => <Badge label={l.status} /> },
          { header: 'Message', render: (l) => <span className="text-xs text-gray-500 line-clamp-2 max-w-xs block">{l.body}</span> },
        ]}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={setPage} />
    </div>
  );
}

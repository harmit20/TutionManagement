import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import DataTable from '../../components/shared/DataTable';
import Pagination from '../../components/shared/Pagination';
import ReceiptView from '../../components/shared/ReceiptView';

export default function Receipts() {
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);

  const { data: fees, isLoading } = useQuery({
    queryKey: ['fees-paid', page],
    queryFn: () => api.get('/receptionist/fees', { params: { status: 'paid', page } }).then((r) => r.data),
  });

  const { data: receipt, isLoading: loadingReceipt } = useQuery({
    queryKey: ['receipt', selected],
    queryFn: () => api.get(`/receptionist/fees/${selected}/receipt`).then((r) => r.data),
    enabled: !!selected,
  });

  const handlePrint = () => window.print();

  return (
    <div>
      <PageHeader title="Receipts" subtitle="View and print payment receipts" />

      <DataTable
        isLoading={isLoading}
        rows={fees?.records}
        empty={{ title: 'No paid fees yet', description: 'Receipts appear here once payments are collected.' }}
        columns={[
          { header: 'Receipt No.', render: (f) => f.receiptNumber || '—', className: 'font-mono text-xs text-gray-700' },
          { header: 'Student', render: (f) => f.student?.user?.name, className: 'font-medium' },
          { header: 'Batch', render: (f) => f.batch?.name, className: 'text-gray-600' },
          { header: 'Amount Paid', render: (f) => `₹${f.amountPaid}`, className: 'font-semibold' },
          { header: 'Date', render: (f) => f.paidDate ? format(new Date(f.paidDate), 'dd MMM yyyy') : '—', className: 'text-gray-600' },
          { header: '', render: (f) => <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => setSelected(f._id)}>View</button> },
        ]}
      />
      <Pagination page={fees?.page} pages={fees?.pages} total={fees?.total} onPage={setPage} />

      {/* Receipt Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Payment Receipt"
        footer={<><button className="btn-secondary" onClick={() => setSelected(null)}>Close</button><button className="btn-primary" onClick={handlePrint}>Print</button></>}>
        {loadingReceipt ? <Spinner size="sm" /> : <ReceiptView receipt={receipt} />}
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import EmptyState from '../../components/shared/EmptyState';

export default function Receipts() {
  const [selected, setSelected] = useState(null);

  const { data: fees, isLoading } = useQuery({
    queryKey: ['fees-paid'],
    queryFn: () => api.get('/receptionist/fees', { params: { status: 'paid' } }).then((r) => r.data),
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

      {isLoading ? <Spinner /> : !fees?.records?.length ? <EmptyState title="No paid fees yet" /> : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Receipt No.','Student','Batch','Amount Paid','Date',''].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fees.records.map((f) => (
                  <tr key={f._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{f.receiptNumber || '—'}</td>
                    <td className="px-4 py-3 font-medium">{f.student?.user?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{f.batch?.name}</td>
                    <td className="px-4 py-3 font-semibold">₹{f.amountPaid}</td>
                    <td className="px-4 py-3 text-gray-600">{f.paidDate ? format(new Date(f.paidDate), 'dd MMM yyyy') : '—'}</td>
                    <td className="px-4 py-3">
                      <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => setSelected(f._id)}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Payment Receipt"
        footer={<><button className="btn-secondary" onClick={() => setSelected(null)}>Close</button><button className="btn-primary" onClick={handlePrint}>Print</button></>}>
        {loadingReceipt ? <Spinner size="sm" /> : receipt && (
          <div className="space-y-3 font-mono text-sm">
            <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
              <p className="text-lg font-bold text-gray-900">TuitionApp</p>
              <p className="text-xs text-gray-500">Payment Receipt</p>
            </div>
            {[['Receipt No.',receipt.receiptNumber],['Student',receipt.studentName],['Batch',receipt.batchName],['Amount',`₹${receipt.amountPaid}`],['Method',receipt.paymentMethod],['Date',receipt.paidDate ? format(new Date(receipt.paidDate),'dd MMM yyyy, hh:mm a') : '—'],['Collected By',receipt.collectedBy]].map(([k,v]) => (
              <div key={k} className="flex justify-between">
                <span className="text-gray-500">{k}</span>
                <span className="font-medium text-gray-900">{v}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-gray-300 pt-3 text-center">
              <Badge label={receipt.status} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

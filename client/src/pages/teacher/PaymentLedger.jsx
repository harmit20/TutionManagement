import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import EmptyState from '../../components/shared/EmptyState';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PaymentLedger() {
  const [selected, setSelected] = useState(null);

  const { data: ledgers, isLoading } = useQuery({
    queryKey: ['teacher-payouts'],
    queryFn: () => api.get('/teacher/payouts').then((r) => r.data),
  });

  const { data: detail, isLoading: loadingDetail } = useQuery({
    queryKey: ['teacher-payout-detail', selected],
    queryFn: () => api.get(`/teacher/payouts/${selected}`).then((r) => r.data),
    enabled: !!selected,
  });

  const totalEarned = ledgers?.filter((l) => l.status === 'paid').reduce((s, l) => s + l.totalAmount, 0) ?? 0;

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Payouts" subtitle="Your monthly payment history" />

      {/* Summary card */}
      <div className="card mb-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-5">
        <p className="text-sm text-indigo-200">Total Earned (paid)</p>
        <p className="text-3xl font-bold mt-1">₹{totalEarned.toLocaleString('en-IN')}</p>
      </div>

      {!ledgers?.length ? <EmptyState title="No payout records yet" description="Your payouts will appear here after admin calculates them" /> : (
        <div className="space-y-2">
          {ledgers.map((l) => (
            <div key={l._id} className="card flex items-center justify-between cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(l._id)}>
              <div>
                <p className="font-medium text-gray-900">{MONTHS[l.month - 1]} {l.year}</p>
                <p className="text-xs text-gray-500">{l.totalLectures} lectures</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">₹{l.totalAmount.toLocaleString('en-IN')}</span>
                <Badge label={l.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Payout Breakdown">
        {loadingDetail ? <Spinner size="sm" /> : detail && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p className="font-semibold text-gray-900">{MONTHS[detail.month - 1]} {detail.year}</p>
              <Badge label={detail.status} />
            </div>
            <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {detail.lines?.map((line, i) => (
                <div key={i} className="flex justify-between py-2.5 text-sm">
                  <div>
                    <p className="text-gray-900">{new Date(line.lectureDate).toLocaleDateString('en-IN')}</p>
                    <p className="text-xs text-gray-500">{line.pricingSnapshot?.classLevel} · {line.pricingSnapshot?.subject}</p>
                  </div>
                  <span className="font-medium text-gray-900">₹{line.rateApplied}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold mt-2">
              <span>{detail.totalLectures} lectures</span>
              <span>₹{detail.totalAmount.toLocaleString('en-IN')}</span>
            </div>
            {detail.paidOn && <p className="text-xs text-gray-500 mt-2">Paid on {format(new Date(detail.paidOn), 'dd MMM yyyy')}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

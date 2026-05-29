import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';

export default function FeeStatus() {
  const { data: fees, isLoading } = useQuery({
    queryKey: ['student-fees'],
    queryFn: () => api.get('/student/fees').then((r) => r.data),
  });

  const totalDue  = fees?.filter((f) => f.status !== 'paid' && f.status !== 'waived').reduce((s, f) => s + (f.amount - f.amountPaid), 0) ?? 0;
  const totalPaid = fees?.filter((f) => f.status === 'paid').reduce((s, f) => s + f.amountPaid, 0) ?? 0;

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Fee Status" subtitle="Your fee payment history" />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="card text-center">
          <p className="text-2xl font-bold text-red-600">₹{totalDue.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500 mt-0.5">Outstanding</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString('en-IN')}</p>
          <p className="text-sm text-gray-500 mt-0.5">Paid</p>
        </div>
      </div>

      {!fees?.length ? <EmptyState title="No fee records" /> : (
        <div className="space-y-3">
          {fees.map((f) => (
            <div key={f._id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{f.batch?.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.batch?.classLevel} · {f.batch?.subject}</p>
                </div>
                <Badge label={f.status} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-semibold text-gray-900">₹{f.amount}</span>
                  {f.amountPaid > 0 && <span className="text-xs text-gray-500 ml-1">(₹{f.amountPaid} paid)</span>}
                </div>
                <span className={`text-xs ${new Date(f.dueDate) < new Date() && f.status !== 'paid' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                  Due {format(new Date(f.dueDate), 'dd MMM yyyy')}
                </span>
              </div>
              {f.receiptNumber && (
                <p className="text-xs text-gray-400 mt-2 font-mono">Receipt: {f.receiptNumber}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

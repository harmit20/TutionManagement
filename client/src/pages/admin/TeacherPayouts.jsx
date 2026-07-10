import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import DataTable from '../../components/shared/DataTable';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now = new Date();

export default function TeacherPayouts() {
  const qc = useQueryClient();
  const [calcModal, setCalcModal] = useState(false);
  const [calc, setCalc] = useState({ teacherId: '', month: now.getMonth() + 1, year: now.getFullYear() });
  const [payConfirm, setPayConfirm] = useState(null); // ledger to confirm before marking paid

  const { data: payouts, isLoading } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: () => api.get('/admin/payouts').then((r) => r.data),
  });

  const { data: teacherData } = useQuery({
    queryKey: ['admin-users-teachers'],
    queryFn: () => api.get('/admin/users', { params: { role: 'teacher' } }).then((r) => r.data),
  });

  const calculateMutation = useMutation({
    mutationFn: (d) => api.post('/admin/payouts/calculate', d),
    onSuccess: () => { toast.success('Payout calculated'); qc.invalidateQueries({ queryKey: ['admin-payouts'] }); setCalcModal(false); },
    onError: (e) => toast.error(e.response?.data?.message || 'Calculation failed'),
  });

  const payMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/payouts/${id}/pay`),
    onSuccess: () => { toast.success('Marked as paid'); qc.invalidateQueries({ queryKey: ['admin-payouts'] }); setPayConfirm(null); },
    onError: () => toast.error('Failed to update payout'),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Teacher Payouts"
        subtitle="Calculate and manage monthly payouts"
        action={<button className="btn-primary" onClick={() => setCalcModal(true)}>Calculate Payout</button>}
      />

      <DataTable
        rows={payouts?.ledgers}
        empty={{
          title: 'No payouts yet',
          description: 'Calculate a payout to get started',
          action: <button className="btn-primary" onClick={() => setCalcModal(true)}>Calculate Payout</button>,
        }}
        columns={[
          { header: 'Teacher', render: (l) => l.teacher?.user?.name, className: 'font-medium' },
          { header: 'Period', render: (l) => `${MONTHS[l.month - 1]} ${l.year}`, className: 'text-gray-600' },
          { header: 'Lectures', render: (l) => l.totalLectures },
          { header: 'Amount', render: (l) => `₹${l.totalAmount.toLocaleString('en-IN')}`, className: 'font-medium' },
          { header: 'Status', render: (l) => <Badge label={l.status} /> },
          {
            header: 'Actions',
            render: (l) => l.status !== 'paid'
              ? <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => setPayConfirm(l)}>Mark Paid</button>
              : <span className="text-xs text-gray-400">Paid {l.paidOn ? format(new Date(l.paidOn), 'dd MMM') : ''}</span>,
          },
        ]}
      />

      {/* Confirm before recording the payout as paid */}
      <Modal
        open={!!payConfirm}
        onClose={() => setPayConfirm(null)}
        title="Confirm Payout"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPayConfirm(null)}>Cancel</button>
            <button className="btn-primary" disabled={payMutation.isPending} onClick={() => payMutation.mutate(payConfirm._id)}>
              {payMutation.isPending ? 'Saving…' : 'Confirm — Mark Paid'}
            </button>
          </>
        }
      >
        {payConfirm && (
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">Mark this payout as paid?</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Teacher</span><strong>{payConfirm.teacher?.user?.name}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Period</span><span>{MONTHS[payConfirm.month - 1]} {payConfirm.year}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Lectures</span><span>{payConfirm.totalLectures}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><strong className="text-lg">₹{payConfirm.totalAmount.toLocaleString('en-IN')}</strong></div>
            </div>
            <p className="text-xs text-gray-400">This cannot be recalculated once marked paid.</p>
          </div>
        )}
      </Modal>

      <Modal
        open={calcModal}
        onClose={() => setCalcModal(false)}
        title="Calculate Payout"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setCalcModal(false)}>Cancel</button>
            <button className="btn-primary" disabled={calculateMutation.isPending} onClick={() => calculateMutation.mutate(calc)}>
              {calculateMutation.isPending ? 'Calculating…' : 'Calculate'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Teacher</label>
            <select className="input" value={calc.teacherId} onChange={(e) => setCalc((p) => ({ ...p, teacherId: e.target.value }))}>
              <option value="">Select teacher…</option>
              {teacherData?.users?.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="label">Month</label>
              <select className="input" value={calc.month} onChange={(e) => setCalc((p) => ({ ...p, month: Number(e.target.value) }))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="label">Year</label>
              <input className="input" type="number" value={calc.year} onChange={(e) => setCalc((p) => ({ ...p, year: Number(e.target.value) }))} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

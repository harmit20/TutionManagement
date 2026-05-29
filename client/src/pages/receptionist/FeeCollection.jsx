import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import EmptyState from '../../components/shared/EmptyState';

const METHODS = ['cash','upi','bank_transfer','cheque','online'];
const blank = { studentId:'', batchId:'', amount:'', dueDate: format(new Date(),'yyyy-MM-dd'), forMonth: new Date().getMonth()+1, forYear: new Date().getFullYear() };

export default function FeeCollection() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [addModal, setAddModal]   = useState(false);
  const [payModal, setPayModal]   = useState(null); // fee record
  const [form, setForm]           = useState(blank);
  const [payForm, setPayForm]     = useState({ amountPaid:'', paymentMethod:'cash' });

  const { data: fees, isLoading } = useQuery({
    queryKey: ['fees', statusFilter],
    queryFn: () => api.get('/receptionist/fees', { params: { status: statusFilter } }).then((r) => r.data),
  });

  const { data: students } = useQuery({ queryKey: ['enroll-students',''], queryFn: () => api.get('/receptionist/students').then((r) => r.data) });
  const { data: batches }  = useQuery({ queryKey: ['receptionist-batches'], queryFn: () => api.get('/receptionist/batches').then((r) => r.data) });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/receptionist/fees', d),
    onSuccess: () => { toast.success('Fee record created'); qc.invalidateQueries({ queryKey: ['fees'] }); setAddModal(false); setForm(blank); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const collectMutation = useMutation({
    mutationFn: ({ id, ...d }) => api.patch(`/receptionist/fees/${id}/collect`, d),
    onSuccess: () => { toast.success('Payment recorded'); qc.invalidateQueries({ queryKey: ['fees'] }); setPayModal(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader title="Fee Collection" action={<button className="btn-primary" onClick={() => setAddModal(true)}>+ Add Fee</button>} />

      <div className="flex gap-2 mb-4 flex-wrap">
        {['pending','partial','paid','overdue'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{s}</button>
        ))}
      </div>

      {isLoading ? <Spinner /> : !fees?.records?.length ? <EmptyState title={`No ${statusFilter} fees`} /> : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Student','Batch','Amount','Due Date','Status',''].map((h) => <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {fees.records.map((f) => (
                  <tr key={f._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{f.student?.user?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{f.batch?.name}</td>
                    <td className="px-4 py-3">₹{f.amount} {f.amountPaid > 0 && <span className="text-xs text-gray-400">(paid ₹{f.amountPaid})</span>}</td>
                    <td className="px-4 py-3 text-gray-600">{format(new Date(f.dueDate), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3"><Badge label={f.status} /></td>
                    <td className="px-4 py-3">
                      {f.status !== 'paid' && <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => { setPayModal(f); setPayForm({ amountPaid: f.amount - f.amountPaid, paymentMethod: 'cash' }); }}>Collect</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Fee Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Fee Record"
        footer={<><button className="btn-secondary" onClick={() => setAddModal(false)}>Cancel</button><button className="btn-primary" disabled={createMutation.isPending} onClick={() => createMutation.mutate({ ...form, amount: Number(form.amount) })}>{createMutation.isPending ? 'Saving…' : 'Create'}</button></>}>
        <div className="space-y-3">
          <div><label className="label">Student</label>
            <select className="input" value={form.studentId} onChange={(e) => set('studentId', e.target.value)}>
              <option value="">Select…</option>{students?.map((s) => <option key={s._id} value={s._id}>{s.user?.name}</option>)}
            </select></div>
          <div><label className="label">Batch</label>
            <select className="input" value={form.batchId} onChange={(e) => set('batchId', e.target.value)}>
              <option value="">Select…</option>{batches?.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select></div>
          <div><label className="label">Amount (₹)</label><input className="input" type="number" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div>
          <div><label className="label">Due Date</label><input className="input" type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} /></div>
        </div>
      </Modal>

      {/* Collect Payment Modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Collect Payment"
        footer={<><button className="btn-secondary" onClick={() => setPayModal(null)}>Cancel</button><button className="btn-primary" disabled={collectMutation.isPending} onClick={() => collectMutation.mutate({ id: payModal._id, amountPaid: Number(payForm.amountPaid), paymentMethod: payForm.paymentMethod })}>{collectMutation.isPending ? 'Saving…' : 'Record Payment'}</button></>}>
        {payModal && <div className="space-y-3">
          <p className="text-sm text-gray-600">Student: <strong>{payModal.student?.user?.name}</strong> · Balance: <strong>₹{payModal.amount - payModal.amountPaid}</strong></p>
          <div><label className="label">Amount (₹)</label><input className="input" type="number" value={payForm.amountPaid} onChange={(e) => setPayForm((p) => ({ ...p, amountPaid: e.target.value }))} /></div>
          <div><label className="label">Payment Method</label>
            <select className="input" value={payForm.paymentMethod} onChange={(e) => setPayForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
              {METHODS.map((m) => <option key={m}>{m}</option>)}
            </select></div>
        </div>}
      </Modal>
    </div>
  );
}

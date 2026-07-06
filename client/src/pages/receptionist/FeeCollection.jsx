import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import DataTable from '../../components/shared/DataTable';
import FilterBar, { PillGroup } from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import ReceiptView from '../../components/shared/ReceiptView';
import Spinner from '../../components/shared/Spinner';

const METHODS = ['cash','upi','bank_transfer','cheque','online'];
const blank = { studentId:'', batchId:'', amount:'', dueDate: format(new Date(),'yyyy-MM-dd'), forMonth: new Date().getMonth()+1, forYear: new Date().getFullYear() };

export default function FeeCollection() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [page, setPage] = useState(1);
  const [addModal, setAddModal]   = useState(false);
  const [payModal, setPayModal]   = useState(null); // fee record
  const [form, setForm]           = useState(blank);
  const [payForm, setPayForm]     = useState({ amountPaid:'', paymentMethod:'cash' });
  const [confirming, setConfirming] = useState(false);
  const [receiptFor, setReceiptFor] = useState(null); // fee id — shows receipt right after collection

  const { data: fees, isLoading } = useQuery({
    queryKey: ['fees', statusFilter, page],
    queryFn: () => api.get('/receptionist/fees', { params: { status: statusFilter, page } }).then((r) => r.data),
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
    onSuccess: (res, { id }) => {
      toast.success('Payment recorded');
      qc.invalidateQueries({ queryKey: ['fees'] });
      setPayModal(null);
      setConfirming(false);
      setReceiptFor(id); // show the receipt immediately
    },
    onError: (e) => { toast.error(e.response?.data?.message || 'Error'); setConfirming(false); },
  });

  const { data: receipt, isLoading: loadingReceipt } = useQuery({
    queryKey: ['receipt', receiptFor],
    queryFn: () => api.get(`/receptionist/fees/${receiptFor}/receipt`).then((r) => r.data),
    enabled: !!receiptFor,
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader title="Fee Collection" action={<button className="btn-primary" onClick={() => setAddModal(true)}>+ Add Fee</button>} />

      <FilterBar className="mb-4">
        <PillGroup options={['pending','partial','paid','overdue']} value={statusFilter} onChange={(s) => { setStatusFilter(s); setPage(1); }} />
      </FilterBar>

      <DataTable
        isLoading={isLoading}
        rows={fees?.records}
        empty={{
          title: `No ${statusFilter} fees`,
          description: statusFilter === 'pending' ? 'Add a fee record to start tracking collections.' : undefined,
          action: statusFilter === 'pending' && <button className="btn-primary" onClick={() => setAddModal(true)}>+ Add Fee</button>,
        }}
        columns={[
          { header: 'Student', render: (f) => f.student?.user?.name, className: 'font-medium' },
          { header: 'Batch', render: (f) => f.batch?.name, className: 'text-gray-600' },
          { header: 'Amount', render: (f) => <>₹{f.amount} {f.amountPaid > 0 && <span className="text-xs text-gray-400">(paid ₹{f.amountPaid})</span>}</> },
          { header: 'Due Date', render: (f) => format(new Date(f.dueDate), 'dd MMM yyyy'), className: 'text-gray-600' },
          { header: 'Status', render: (f) => <Badge label={f.status} /> },
          {
            header: '',
            render: (f) => f.status !== 'paid' && (
              <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => { setPayModal(f); setPayForm({ amountPaid: f.amount - f.amountPaid, paymentMethod: 'cash' }); }}>
                Collect
              </button>
            ),
          },
        ]}
      />
      <Pagination page={fees?.page} pages={fees?.pages} total={fees?.total} onPage={setPage} />

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

      {/* Collect Payment Modal — review step before the money is recorded */}
      <Modal open={!!payModal} onClose={() => { setPayModal(null); setConfirming(false); }} title={confirming ? 'Confirm Payment' : 'Collect Payment'}
        footer={confirming ? (
          <>
            <button className="btn-secondary" onClick={() => setConfirming(false)}>Back</button>
            <button className="btn-primary" disabled={collectMutation.isPending} onClick={() => collectMutation.mutate({ id: payModal._id, amountPaid: Number(payForm.amountPaid), paymentMethod: payForm.paymentMethod })}>
              {collectMutation.isPending ? 'Recording…' : 'Confirm & Record'}
            </button>
          </>
        ) : (
          <>
            <button className="btn-secondary" onClick={() => setPayModal(null)}>Cancel</button>
            <button className="btn-primary" disabled={!Number(payForm.amountPaid)} onClick={() => setConfirming(true)}>Review</button>
          </>
        )}>
        {payModal && (confirming ? (
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">You are about to record:</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Student</span><strong>{payModal.student?.user?.name}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Batch</span><span>{payModal.batch?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><strong className="text-lg">₹{Number(payForm.amountPaid).toLocaleString('en-IN')}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Method</span><span className="capitalize">{payForm.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">After payment</span>
                <Badge label={Number(payForm.amountPaid) >= payModal.amount - payModal.amountPaid ? 'paid' : 'partial'} />
              </div>
            </div>
            <p className="text-xs text-gray-400">A receipt is generated as soon as you confirm.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Student: <strong>{payModal.student?.user?.name}</strong> · Balance: <strong>₹{payModal.amount - payModal.amountPaid}</strong></p>
            <div><label className="label">Amount (₹)</label><input className="input" type="number" value={payForm.amountPaid} onChange={(e) => setPayForm((p) => ({ ...p, amountPaid: e.target.value }))} /></div>
            <div><label className="label">Payment Method</label>
              <select className="input" value={payForm.paymentMethod} onChange={(e) => setPayForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select></div>
          </div>
        ))}
      </Modal>

      {/* Receipt shown immediately after a successful collection */}
      <Modal open={!!receiptFor} onClose={() => setReceiptFor(null)} title="Payment Receipt"
        footer={<><button className="btn-secondary" onClick={() => setReceiptFor(null)}>Close</button><button className="btn-primary" onClick={() => window.print()}>Print</button></>}>
        {loadingReceipt ? <Spinner size="sm" /> : <ReceiptView receipt={receipt} />}
      </Modal>
    </div>
  );
}

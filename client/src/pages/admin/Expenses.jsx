import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import Modal from '../../components/shared/Modal';
import DataTable from '../../components/shared/DataTable';
import FilterBar from '../../components/shared/FilterBar';
import MonthStepper from '../../components/shared/MonthStepper';
import Pagination from '../../components/shared/Pagination';

const CATEGORIES = ['rent', 'utilities', 'salary', 'marketing', 'supplies', 'maintenance', 'other'];
const now = new Date();
const blank = { category: 'rent', amount: '', date: format(now, 'yyyy-MM-dd'), description: '' };

export default function Expenses() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [deleting, setDeleting] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', month, year, page],
    queryFn: () => api.get('/admin/expenses', { params: { month, year, page } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/admin/expenses', { ...d, amount: Number(d.amount) }),
    onSuccess: () => { toast.success('Expense recorded'); qc.invalidateQueries({ queryKey: ['expenses'] }); setModal(false); setForm(blank); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/expenses/${id}`),
    onSuccess: () => { toast.success('Expense deleted'); qc.invalidateQueries({ queryKey: ['expenses'] }); setDeleting(null); },
    onError: () => toast.error('Delete failed'),
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Rent, utilities, marketing — everything the centre spends"
        action={<button className="btn-primary" onClick={() => setModal(true)}>+ Add Expense</button>}
      />

      <FilterBar>
        <MonthStepper month={month} year={year} onChange={({ month: m, year: y }) => { setMonth(m); setYear(y); setPage(1); }} />
        {data && (
          <span className="text-sm text-gray-600 ml-auto">
            Total this month: <strong className="text-gray-900">₹{data.totalAmount.toLocaleString('en-IN')}</strong>
          </span>
        )}
      </FilterBar>

      <DataTable
        isLoading={isLoading}
        rows={data?.expenses}
        empty={{
          title: 'No expenses this month',
          description: 'Record expenses to see true profit on the dashboard.',
          action: <button className="btn-primary" onClick={() => setModal(true)}>+ Add Expense</button>,
        }}
        columns={[
          { header: 'Date', render: (e) => format(new Date(e.date), 'dd MMM yyyy'), className: 'text-gray-600 whitespace-nowrap' },
          { header: 'Category', render: (e) => <Badge label={e.category} /> },
          { header: 'Description', render: (e) => e.description || '—', className: 'text-gray-600' },
          { header: 'Amount', render: (e) => `₹${e.amount.toLocaleString('en-IN')}`, className: 'font-semibold' },
          { header: 'By', render: (e) => e.createdBy?.name, className: 'text-gray-500 text-xs' },
          { header: '', render: (e) => <button className="text-xs font-medium text-red-600 hover:text-red-700" onClick={() => setDeleting(e)}>Delete</button> },
        ]}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={setPage} />

      {/* Add expense */}
      <Modal open={modal} onClose={() => setModal(false)} title="Add Expense"
        footer={<><button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
          <button className="btn-primary" disabled={createMutation.isPending || !form.amount}
            onClick={() => createMutation.mutate(form)}>{createMutation.isPending ? 'Saving…' : 'Save'}</button></>}>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div className="flex-1"><label className="label">Amount (₹)</label>
              <input className="input" type="number" min="0" value={form.amount} onChange={(e) => set('amount', e.target.value)} /></div>
          </div>
          <div><label className="label">Date</label>
            <input className="input" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></div>
          <div><label className="label">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <input className="input" placeholder="e.g. July electricity bill" value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Expense"
        footer={<><button className="btn-secondary" onClick={() => setDeleting(null)}>Cancel</button>
          <button className="btn-danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleting._id)}>
            {deleteMutation.isPending ? 'Deleting…' : 'Delete'}</button></>}>
        {deleting && <p className="text-sm text-gray-600">
          Delete <strong className="capitalize">{deleting.category}</strong> expense of <strong>₹{deleting.amount.toLocaleString('en-IN')}</strong> from {format(new Date(deleting.date), 'dd MMM yyyy')}?
        </p>}
      </Modal>
    </div>
  );
}

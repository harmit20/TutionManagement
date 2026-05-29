import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import EmptyState from '../../components/shared/EmptyState';

const CLASS_LEVELS = ['11th', '12th', 'CET'];
const blank = { classLevel: '11th', subject: '', ratePerLecture: '', effectiveFrom: format(new Date(), 'yyyy-MM-dd') };

export default function DynamicPricing() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState(blank);

  const { data: rules, isLoading } = useQuery({
    queryKey: ['pricing-rules'],
    queryFn: () => api.get('/admin/pricing-rules').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/admin/pricing-rules', d),
    onSuccess: () => { toast.success('Pricing rule created'); qc.invalidateQueries({ queryKey: ['pricing-rules'] }); setModal(false); setForm(blank); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Dynamic Pricing"
        subtitle="Set per-lecture rates by class and subject"
        action={<button className="btn-primary" onClick={() => setModal(true)}>+ New Rule</button>}
      />

      <div className="card overflow-hidden p-0">
        {!rules?.length ? (
          <EmptyState title="No pricing rules" description="Create a rule to enable payout calculations" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>{['Class','Subject','Rate / Lecture','Effective From','Effective To','Created By'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rules.map((r) => (
                  <tr key={r._id} className={`hover:bg-gray-50 ${!r.effectiveTo ? 'bg-green-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium">{r.classLevel}</td>
                    <td className="px-4 py-3">{r.subject}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">₹{r.ratePerLecture}</td>
                    <td className="px-4 py-3 text-gray-600">{format(new Date(r.effectiveFrom), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.effectiveTo ? format(new Date(r.effectiveTo), 'dd MMM yyyy') : <span className="text-green-600 font-medium">Active</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.createdBy?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="New Pricing Rule"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" disabled={createMutation.isPending} onClick={() => createMutation.mutate({ ...form, ratePerLecture: Number(form.ratePerLecture) })}>
              {createMutation.isPending ? 'Saving…' : 'Create Rule'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Class Level</label>
            <select className="input" value={form.classLevel} onChange={(e) => set('classLevel', e.target.value)}>
              {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject</label>
            <input className="input" placeholder="e.g. Physics" value={form.subject} onChange={(e) => set('subject', e.target.value)} />
          </div>
          <div>
            <label className="label">Rate per Lecture (₹)</label>
            <input className="input" type="number" min="0" value={form.ratePerLecture} onChange={(e) => set('ratePerLecture', e.target.value)} />
          </div>
          <div>
            <label className="label">Effective From</label>
            <input className="input" type="date" value={form.effectiveFrom} onChange={(e) => set('effectiveFrom', e.target.value)} />
          </div>
          <p className="text-xs text-gray-500">Any currently active rule for the same class + subject will be automatically closed one day before this date.</p>
        </div>
      </Modal>
    </div>
  );
}

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

const STATUSES = [
  { value: '', label: 'all' },
  { value: 'new', label: 'new' },
  { value: 'follow_up', label: 'follow up' },
  { value: 'demo_scheduled', label: 'demo' },
  { value: 'converted', label: 'converted' },
  { value: 'lost', label: 'lost' },
];
const SOURCES = ['walk_in', 'phone', 'referral', 'online', 'other'];
const CLASS_LEVELS = ['11th', '12th', 'CET'];

const blank = { name: '', phone: '', email: '', classLevel: '11th', subjectInterest: '', source: 'walk_in', note: '' };

export default function Enquiries() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(blank);
  const [detail, setDetail] = useState(null); // enquiry being updated
  const [update, setUpdate] = useState({ status: '', nextFollowUpAt: '', note: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['enquiries', status, page],
    queryFn: () => api.get('/receptionist/enquiries', { params: { status, page } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/receptionist/enquiries', d),
    onSuccess: () => { toast.success('Enquiry recorded'); qc.invalidateQueries({ queryKey: ['enquiries'] }); setAddModal(false); setForm(blank); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }) => api.patch(`/receptionist/enquiries/${id}`, d),
    onSuccess: () => { toast.success('Enquiry updated'); qc.invalidateQueries({ queryKey: ['enquiries'] }); setDetail(null); },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const openDetail = (e) => {
    setDetail(e);
    setUpdate({ status: e.status, nextFollowUpAt: e.nextFollowUpAt ? format(new Date(e.nextFollowUpAt), 'yyyy-MM-dd') : '', note: '' });
  };

  return (
    <div>
      <PageHeader
        title="Enquiries"
        subtitle="Walk-ins and leads — follow up until they enroll"
        action={<button className="btn-primary" onClick={() => setAddModal(true)}>+ New Enquiry</button>}
      />

      <FilterBar className="mb-4">
        <PillGroup options={STATUSES} value={status} onChange={(s) => { setStatus(s); setPage(1); }} />
      </FilterBar>

      <DataTable
        isLoading={isLoading}
        rows={data?.enquiries}
        empty={{
          title: 'No enquiries',
          description: 'Record walk-ins and phone enquiries so no lead is forgotten.',
          action: <button className="btn-primary" onClick={() => setAddModal(true)}>+ New Enquiry</button>,
        }}
        columns={[
          { header: 'Name', render: (e) => e.name, className: 'font-medium' },
          { header: 'Phone', render: (e) => e.phone, className: 'font-mono text-xs' },
          { header: 'Class', render: (e) => e.classLevel, className: 'text-gray-600' },
          { header: 'Source', render: (e) => e.source.replace('_', ' '), className: 'text-gray-600 capitalize' },
          { header: 'Status', render: (e) => <Badge label={e.status.replace('_', ' ')} /> },
          {
            header: 'Follow-up',
            render: (e) => e.nextFollowUpAt
              ? <span className={new Date(e.nextFollowUpAt) < new Date() && !['converted','lost'].includes(e.status) ? 'text-red-600 font-medium' : 'text-gray-600'}>
                  {format(new Date(e.nextFollowUpAt), 'dd MMM')}
                </span>
              : '—',
          },
          { header: '', render: (e) => <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => openDetail(e)}>Update</button> },
        ]}
      />
      <Pagination page={data?.page} pages={data?.pages} total={data?.total} onPage={setPage} />

      {/* New enquiry */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="New Enquiry"
        footer={<><button className="btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
          <button className="btn-primary" disabled={createMutation.isPending || !form.name || !form.phone}
            onClick={() => createMutation.mutate(form)}>{createMutation.isPending ? 'Saving…' : 'Save'}</button></>}>
        <div className="space-y-3">
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Phone</label><input className="input" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
            <div className="flex-1"><label className="label">Email <span className="text-gray-400 font-normal">(optional)</span></label><input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="label">Class</label>
              <select className="input" value={form.classLevel} onChange={(e) => set('classLevel', e.target.value)}>
                {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div className="flex-1"><label className="label">Source</label>
              <select className="input" value={form.source} onChange={(e) => set('source', e.target.value)}>
                {SOURCES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select></div>
          </div>
          <div><label className="label">Subject Interest</label><input className="input" placeholder="e.g. Physics, Maths" value={form.subjectInterest} onChange={(e) => set('subjectInterest', e.target.value)} /></div>
          <div><label className="label">Note</label><input className="input" placeholder="e.g. asked about batch timings" value={form.note} onChange={(e) => set('note', e.target.value)} /></div>
        </div>
      </Modal>

      {/* Update enquiry */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Enquiry — ${detail.name}` : ''}
        footer={<><button className="btn-secondary" onClick={() => setDetail(null)}>Cancel</button>
          <button className="btn-primary" disabled={updateMutation.isPending}
            onClick={() => updateMutation.mutate({ id: detail._id, status: update.status, nextFollowUpAt: update.nextFollowUpAt || null, note: update.note || undefined })}>
            {updateMutation.isPending ? 'Saving…' : 'Save'}</button></>}>
        {detail && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">{detail.phone}{detail.email ? ` · ${detail.email}` : ''} · {detail.classLevel}{detail.subjectInterest ? ` · ${detail.subjectInterest}` : ''}</p>
            <div className="flex gap-3">
              <div className="flex-1"><label className="label">Status</label>
                <select className="input" value={update.status} onChange={(e) => setUpdate((p) => ({ ...p, status: e.target.value }))}>
                  {STATUSES.filter((s) => s.value).map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select></div>
              <div className="flex-1"><label className="label">Next Follow-up</label>
                <input className="input" type="date" value={update.nextFollowUpAt} onChange={(e) => setUpdate((p) => ({ ...p, nextFollowUpAt: e.target.value }))} /></div>
            </div>
            <div><label className="label">Add Note</label><input className="input" value={update.note} onChange={(e) => setUpdate((p) => ({ ...p, note: e.target.value }))} /></div>
            {detail.notes?.length > 0 && (
              <div>
                <p className="label">History</p>
                <div className="bg-gray-50 rounded-lg divide-y divide-gray-100 max-h-40 overflow-y-auto">
                  {[...detail.notes].reverse().map((n, i) => (
                    <div key={i} className="px-3 py-2 text-sm">
                      <p className="text-gray-900">{n.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(n.at), 'dd MMM yyyy, hh:mm a')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

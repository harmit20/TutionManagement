import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Badge from '../../components/shared/Badge';
import EmptyState from '../../components/shared/EmptyState';
import Modal from '../../components/shared/Modal';

export default function MyBatches() {
  const qc = useQueryClient();
  const [announceFor, setAnnounceFor] = useState(null); // batch
  const [form, setForm] = useState({ title: '', message: '' });

  const { data: batches, isLoading } = useQuery({
    queryKey: ['teacher-batches'],
    queryFn: () => api.get('/teacher/batches').then((r) => r.data),
  });

  const { data: announcements } = useQuery({
    queryKey: ['teacher-announcements'],
    queryFn: () => api.get('/teacher/announcements').then((r) => r.data),
  });

  const announceMutation = useMutation({
    mutationFn: (d) => api.post('/teacher/announcements', d),
    onSuccess: () => {
      toast.success('Announcement sent to the batch');
      qc.invalidateQueries({ queryKey: ['teacher-announcements'] });
      setAnnounceFor(null);
      setForm({ title: '', message: '' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader title="My Batches" subtitle="Batches currently assigned to you" />

      {!batches?.length ? <EmptyState title="No batches assigned" description="Contact admin to get assigned to a batch" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((b) => (
            <div key={b._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{b.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{b.classLevel} · {b.subject}</p>
                </div>
                <Badge label={b.classLevel} variant="active" />
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                <span className="flex items-center gap-1">
                  <span className="font-semibold text-gray-900">{b.students?.length ?? 0}</span> students
                </span>
                {b.classroom && <span>{b.classroom.name}</span>}
              </div>

              {b.schedule?.length > 0 && (
                <div className="border-t border-gray-50 pt-3">
                  <p className="text-xs font-medium text-gray-500 mb-1.5">Schedule</p>
                  <div className="flex flex-wrap gap-1.5">
                    {b.schedule.map((s, i) => (
                      <span key={i} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded-md font-medium">
                        {s.day.slice(0,3)} {s.startTime}–{s.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn-secondary w-full mt-3 text-xs" onClick={() => setAnnounceFor(b)}>
                📢 Announce to batch
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Recent announcements */}
      {announcements?.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recent Announcements</h2>
          <div className="card divide-y divide-gray-50 p-0">
            {announcements.slice(0, 8).map((a) => (
              <div key={a._id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-sm text-gray-900">{a.title}</p>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{format(new Date(a.createdAt), 'dd MMM, hh:mm a')}</span>
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{a.message}</p>
                <p className="text-xs text-gray-400 mt-1">{a.batch?.name ?? 'All batches'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announce modal */}
      <Modal open={!!announceFor} onClose={() => setAnnounceFor(null)} title={announceFor ? `Announce — ${announceFor.name}` : ''}
        footer={<>
          <button className="btn-secondary" onClick={() => setAnnounceFor(null)}>Cancel</button>
          <button className="btn-primary" disabled={announceMutation.isPending || !form.title || !form.message}
            onClick={() => announceMutation.mutate({ batchId: announceFor._id, ...form })}>
            {announceMutation.isPending ? 'Sending…' : 'Send Announcement'}
          </button>
        </>}>
        <div className="space-y-3">
          <div><label className="label">Title</label>
            <input className="input" placeholder="e.g. Bring calculators tomorrow" value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} /></div>
          <div><label className="label">Message</label>
            <textarea className="input h-24 py-2" placeholder="Details for the students…" value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} /></div>
          <p className="text-xs text-gray-400">Students in this batch get a push notification and see it in their app.</p>
        </div>
      </Modal>
    </div>
  );
}

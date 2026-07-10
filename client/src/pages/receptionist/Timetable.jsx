import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';
import Modal from '../../components/shared/Modal';
import Badge from '../../components/shared/Badge';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const COLORS = ['bg-indigo-50 border-indigo-200 text-indigo-800','bg-blue-50 border-blue-200 text-blue-800','bg-purple-50 border-purple-200 text-purple-800','bg-teal-50 border-teal-200 text-teal-800','bg-orange-50 border-orange-200 text-orange-800'];

/** Next calendar date (within 7 days) that falls on the given weekday name. */
function nextDateFor(dayName) {
  const target = DAYS.indexOf(dayName) + 1; // Monday=1 … Sunday=7
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const iso = d.getDay() === 0 ? 7 : d.getDay();
    if (iso === target) return format(d, 'yyyy-MM-dd');
  }
  return format(today, 'yyyy-MM-dd');
}

export default function Timetable() {
  const qc = useQueryClient();
  const [change, setChange] = useState(null); // { slot, date, type, substituteTeacherId, reason }

  const { data: slots, isLoading } = useQuery({
    queryKey: ['receptionist-timetable'],
    queryFn: () => api.get('/receptionist/timetable').then((r) => r.data),
  });

  const weekFrom = format(new Date(), 'yyyy-MM-dd');
  const weekTo = format(addDays(new Date(), 7), 'yyyy-MM-dd');
  const { data: exceptions } = useQuery({
    queryKey: ['timetable-exceptions', weekFrom],
    queryFn: () => api.get('/receptionist/timetable/exceptions', { params: { from: weekFrom, to: weekTo } }).then((r) => r.data),
  });

  const { data: teachers } = useQuery({
    queryKey: ['receptionist-teachers'],
    queryFn: () => api.get('/receptionist/teachers').then((r) => r.data),
    enabled: !!change,
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/receptionist/timetable/exceptions', d),
    onSuccess: (_, d) => {
      toast.success(d.type === 'cancelled' ? 'Class cancelled — students & parents notified' : 'Substitute assigned — students & parents notified');
      qc.invalidateQueries({ queryKey: ['timetable-exceptions'] });
      setChange(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error'),
  });

  const undoMutation = useMutation({
    mutationFn: (id) => api.delete(`/receptionist/timetable/exceptions/${id}`),
    onSuccess: () => { toast.success('Class restored'); qc.invalidateQueries({ queryKey: ['timetable-exceptions'] }); },
    onError: () => toast.error('Could not restore'),
  });

  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = (slots || []).filter((s) => s.day === d).sort((a,b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {});

  const colorFor = (id) => COLORS[parseInt(id?.slice(-1), 16) % COLORS.length];

  const openChange = (slot) => setChange({
    slot,
    date: nextDateFor(slot.day),
    type: 'cancelled',
    substituteTeacherId: '',
    reason: '',
  });

  return (
    <div>
      <PageHeader title="Timetable" subtitle="Weekly schedule across all batches" />

      {/* This week's changes */}
      {exceptions?.length > 0 && (
        <div className="card mb-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">This Week's Changes</h3>
          <div className="divide-y divide-gray-50">
            {exceptions.map((e) => (
              <div key={e._id} className="flex items-center justify-between py-2 text-sm gap-3 flex-wrap">
                <div>
                  <span className="font-medium">{e.batch?.name}</span>
                  <span className="text-gray-500"> · {format(new Date(e.date), 'EEE dd MMM')} at {e.startTime}</span>
                  {e.type === 'substituted' && <span className="text-gray-600"> → {e.substituteTeacher?.user?.name}</span>}
                  {e.reason && <span className="text-xs text-gray-400"> ({e.reason})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <Badge label={e.type} />
                  <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700" onClick={() => undoMutation.mutate(e._id)}>Undo</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? <Spinner /> : !slots?.length ? <EmptyState title="No schedule entries" description="Add slots via batch management" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS.filter((d) => byDay[d].length > 0).map((day) => (
            <div key={day} className="card">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">{day}</h3>
              <div className="space-y-2">
                {byDay[day].map((slot, i) => (
                  <div key={i} className={`border rounded-lg p-2.5 text-xs ${colorFor(slot.batchId)}`}>
                    <p className="font-semibold">{slot.batchName}</p>
                    <p className="mt-0.5 opacity-80">{slot.subject} · {slot.classLevel}</p>
                    <p className="mt-1 font-medium">{slot.startTime} – {slot.endTime}</p>
                    {slot.classroom && <p className="mt-0.5 opacity-70">Room: {slot.classroom.name}</p>}
                    {slot.teacher?.user && <p className="opacity-70">{slot.teacher.user.name}</p>}
                    <button
                      className="mt-2 text-[11px] font-semibold underline opacity-80 hover:opacity-100"
                      onClick={() => openChange(slot)}
                    >
                      Cancel / Substitute…
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Change modal */}
      <Modal open={!!change} onClose={() => setChange(null)} title={change ? `${change.slot.batchName} — ${change.slot.day} ${change.slot.startTime}` : ''}
        footer={<>
          <button className="btn-secondary" onClick={() => setChange(null)}>Back</button>
          <button className="btn-primary" disabled={createMutation.isPending || (change?.type === 'substituted' && !change.substituteTeacherId)}
            onClick={() => createMutation.mutate({
              batchId: change.slot.batchId,
              date: change.date,
              startTime: change.slot.startTime,
              type: change.type,
              substituteTeacherId: change.substituteTeacherId || undefined,
              reason: change.reason || undefined,
            })}>
            {createMutation.isPending ? 'Saving…' : change?.type === 'cancelled' ? 'Cancel Class & Notify' : 'Assign Substitute & Notify'}
          </button>
        </>}>
        {change && (
          <div className="space-y-3">
            <div><label className="label">Date</label>
              <input className="input" type="date" value={change.date} min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setChange((p) => ({ ...p, date: e.target.value }))} /></div>
            <div><label className="label">Change</label>
              <select className="input" value={change.type} onChange={(e) => setChange((p) => ({ ...p, type: e.target.value }))}>
                <option value="cancelled">Cancel the class</option>
                <option value="substituted">Assign a substitute teacher</option>
              </select></div>
            {change.type === 'substituted' && (
              <div><label className="label">Substitute Teacher</label>
                <select className="input" value={change.substituteTeacherId} onChange={(e) => setChange((p) => ({ ...p, substituteTeacherId: e.target.value }))}>
                  <option value="">Select…</option>
                  {teachers?.map((t) => <option key={t.id} value={t.id}>{t.name}{t.subjects?.length ? ` — ${t.subjects.join(', ')}` : ''}</option>)}
                </select></div>
            )}
            <div><label className="label">Reason <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input" placeholder="e.g. teacher unwell" value={change.reason}
                onChange={(e) => setChange((p) => ({ ...p, reason: e.target.value }))} /></div>
            <p className="text-xs text-gray-400">Students get a push notification and parents get a WhatsApp/SMS.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

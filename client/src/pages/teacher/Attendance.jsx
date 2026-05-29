import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';

const STATUS = ['present', 'absent', 'late'];
const STATUS_STYLE = {
  present: 'bg-green-500 text-white',
  absent:  'bg-red-500 text-white',
  late:    'bg-orange-400 text-white',
  '':      'bg-gray-100 text-gray-400',
};

export default function Attendance() {
  const qc = useQueryClient();
  const [batchId, setBatchId] = useState('');
  const [date, setDate]       = useState(format(new Date(), 'yyyy-MM-dd'));
  const [marks, setMarks]     = useState({}); // { studentId: status }

  const { data: batches } = useQuery({
    queryKey: ['teacher-batches'],
    queryFn: () => api.get('/teacher/batches').then((r) => r.data),
  });

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['batch-students', batchId],
    queryFn: () => api.get(`/teacher/batches/${batchId}/students`).then((r) => r.data),
    enabled: !!batchId,
  });

  // Reset marks whenever batch or date changes
  useEffect(() => setMarks({}), [batchId, date]);

  const markAll = (status) => {
    if (!students) return;
    setMarks(Object.fromEntries(students.map((s) => [s._id, status])));
  };

  const toggle = (studentId) => {
    setMarks((prev) => {
      const cur = prev[studentId] || '';
      const next = STATUS[(STATUS.indexOf(cur) + 1) % STATUS.length];
      return { ...prev, [studentId]: next };
    });
  };

  const submitMutation = useMutation({
    mutationFn: (payload) => api.post('/teacher/attendance', payload),
    onSuccess: () => { toast.success('Attendance saved'); qc.invalidateQueries({ queryKey: ['batch-attendance'] }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Save failed'),
  });

  const handleSubmit = () => {
    const entries = Object.entries(marks);
    if (!entries.length) return toast.error('Mark at least one student');
    submitMutation.mutate({
      batchId,
      date,
      students: entries.map(([student, status]) => ({ student, status })),
    });
  };

  const markedCount = Object.values(marks).filter(Boolean).length;
  const presentCount = Object.values(marks).filter((s) => s === 'present').length;

  return (
    <div>
      <PageHeader title="Mark Attendance" subtitle="Tap a student card to cycle: Present → Absent → Late" />

      {/* Controls */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <select className="input flex-1 max-w-xs" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
          <option value="">Select batch…</option>
          {batches?.map((b) => <option key={b._id} value={b._id}>{b.name} — {b.subject}</option>)}
        </select>
        <input className="input w-40" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} />
      </div>

      {batchId && (
        <>
          {/* Quick actions + progress */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex gap-2">
              <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => markAll('present')}>All Present</button>
              <button className="btn-secondary text-xs py-1.5 px-3" onClick={() => markAll('absent')}>All Absent</button>
            </div>
            {students?.length > 0 && (
              <span className="text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{markedCount}</span>/{students.length} marked
                {markedCount > 0 && <> · <span className="text-green-600 font-medium">{presentCount} present</span></>}
              </span>
            )}
          </div>

          {loadingStudents ? <Spinner /> : !students?.length ? <EmptyState title="No students in this batch" /> : (
            <>
              {/* Touch-friendly student grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                {students.map((s) => {
                  const status = marks[s._id] || '';
                  return (
                    <button
                      key={s._id}
                      onClick={() => toggle(s._id)}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all active:scale-95 ${
                        status ? `${STATUS_STYLE[status]} border-transparent` : 'bg-white border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div>
                        <p className={`font-medium text-sm ${status ? 'text-white' : 'text-gray-900'}`}>{s.user?.name}</p>
                        <p className={`text-xs mt-0.5 ${status ? 'text-white/70' : 'text-gray-500'}`}>{s.enrollmentNumber}</p>
                      </div>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${status ? 'text-white/90' : 'text-gray-300'}`}>
                        {status || 'tap'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                className="btn-primary w-full py-3 text-base"
                disabled={submitMutation.isPending || !markedCount}
                onClick={handleSubmit}
              >
                {submitMutation.isPending ? 'Saving…' : `Save Attendance (${markedCount}/${students.length})`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

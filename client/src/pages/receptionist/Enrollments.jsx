import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Badge from '../../components/shared/Badge';
import EmptyState from '../../components/shared/EmptyState';
import Modal from '../../components/shared/Modal';

export default function Enrollments() {
  const qc = useQueryClient();
  const [modal, setModal]   = useState(false);
  const [form, setForm]     = useState({ studentId: '', batchId: '' });
  const [search, setSearch] = useState('');

  const { data: students, isLoading: loadingStudents } = useQuery({
    queryKey: ['enroll-students', search],
    queryFn: () => api.get('/receptionist/students', { params: { search } }).then((r) => r.data),
  });

  const { data: batches } = useQuery({
    queryKey: ['receptionist-batches'],
    queryFn: () => api.get('/receptionist/batches').then((r) => r.data),
  });

  const enrollMutation = useMutation({
    mutationFn: (d) => api.post('/receptionist/enrollments', d),
    onSuccess: () => { toast.success('Student enrolled'); qc.invalidateQueries({ queryKey: ['enroll-students'] }); setModal(false); setForm({ studentId: '', batchId: '' }); },
    onError: (e) => toast.error(e.response?.data?.message || 'Enrollment failed'),
  });

  const unenrollMutation = useMutation({
    mutationFn: ({ studentId, batchId }) => api.delete(`/receptionist/enrollments/${studentId}/${batchId}`),
    onSuccess: () => { toast.success('Unenrolled'); qc.invalidateQueries({ queryKey: ['enroll-students'] }); },
    onError: () => toast.error('Unenroll failed'),
  });

  return (
    <div>
      <PageHeader
        title="Enrollments"
        subtitle="Manage student batch assignments"
        action={<button className="btn-primary" onClick={() => setModal(true)}>+ Enroll Student</button>}
      />

      <div className="mb-4">
        <input className="input max-w-sm" placeholder="Search students…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loadingStudents ? <Spinner /> : !students?.length ? (
        <EmptyState
          title="No students found"
          description={search ? 'Try a different search term.' : 'Students appear here once accounts are created by the admin.'}
        />
      ) : (
        <div className="space-y-3">
          {students.map((s) => (
            <div key={s._id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-900">{s.user?.name}</p>
                  <p className="text-xs text-gray-500">{s.user?.email} · {s.enrollmentNumber} · {s.classLevel}</p>
                </div>
                <Badge label={s.classLevel} variant="active" />
              </div>
              {s.batches?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.batches.map((b) => (
                    <span key={b._id || b} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                      {b.name || b}
                      <button className="ml-1 text-indigo-400 hover:text-red-500" onClick={() => unenrollMutation.mutate({ studentId: s._id, batchId: b._id || b })}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Enroll Student"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" disabled={enrollMutation.isPending || !form.studentId || !form.batchId} onClick={() => enrollMutation.mutate(form)}>
              {enrollMutation.isPending ? 'Enrolling…' : 'Enroll'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label">Student</label>
            <select className="input" value={form.studentId} onChange={(e) => setForm((p) => ({ ...p, studentId: e.target.value }))}>
              <option value="">Select student…</option>
              {students?.map((s) => <option key={s._id} value={s._id}>{s.user?.name} ({s.enrollmentNumber})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Batch</label>
            <select className="input" value={form.batchId} onChange={(e) => setForm((p) => ({ ...p, batchId: e.target.value }))}>
              <option value="">Select batch…</option>
              {batches?.map((b) => <option key={b._id} value={b._id}>{b.name} — {b.classLevel} {b.subject}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Badge from '../../components/shared/Badge';
import Spinner from '../../components/shared/Spinner';
import Modal from '../../components/shared/Modal';
import EmptyState from '../../components/shared/EmptyState';

const ROLES = ['admin', 'receptionist', 'teacher', 'student'];
const CLASS_LEVELS = ['11th', '12th', 'CET'];

const blank = { name: '', email: '', password: '', role: 'student', phone: '', enrollmentNumber: '', classLevel: '11th', parentName: '', parentPhone: '' };

export default function UserManagement() {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') ?? '');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blank);

  // Edit state
  const [editModal, setEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, roleFilter],
    queryFn: () => api.get('/admin/users', { params: { search, role: roleFilter } }).then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d) => api.post('/auth/users', d),
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setModal(false);
      setForm(blank);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error creating user'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.patch(`/auth/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: () => toast.error('Update failed'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/admin/users/${id}/profile`, data),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setEditModal(false);
      setEditUser(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const openEdit = async (user) => {
    try {
      const { data } = await api.get(`/admin/users/${user._id}`);
      setEditUser(data.user);
      setEditForm({
        name: data.user.name ?? '',
        phone: data.user.phone ?? '',
        // student fields
        classLevel: data.profile?.classLevel ?? '11th',
        enrollmentNumber: data.profile?.enrollmentNumber ?? '',
        parentName: data.profile?.parentName ?? '',
        parentPhone: data.profile?.parentPhone ?? '',
        // teacher fields
        qualifications: data.profile?.qualifications?.join(', ') ?? '',
        subjects: data.profile?.subjects?.join(', ') ?? '',
      });
      setEditModal(true);
    } catch {
      toast.error('Could not load user details');
    }
  };

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setE = (k, v) => setEditForm((p) => ({ ...p, [k]: v }));

  const submitEdit = () => {
    const payload = { name: editForm.name, phone: editForm.phone };
    if (editUser.role === 'student') {
      payload.classLevel = editForm.classLevel;
      payload.enrollmentNumber = editForm.enrollmentNumber;
      payload.parentName = editForm.parentName;
      payload.parentPhone = editForm.parentPhone;
    } else if (editUser.role === 'teacher') {
      payload.qualifications = editForm.qualifications.split(',').map((s) => s.trim()).filter(Boolean);
      payload.subjects = editForm.subjects.split(',').map((s) => s.trim()).filter(Boolean);
    }
    editMutation.mutate({ id: editUser._id, data: payload });
  };

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Create and manage all user accounts"
        action={<button className="btn-primary" onClick={() => setModal(true)}>+ New User</button>}
      />

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input className="input max-w-xs" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input w-40" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {isLoading ? <Spinner /> : (
        <div className="card overflow-hidden p-0">
          {!data?.users?.length ? <EmptyState title="No users found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>{['Name','Email','Role','Status','Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.users.map((u) => (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3"><Badge label={u.role} /></td>
                      <td className="px-4 py-3"><Badge label={u.isActive ? 'active' : 'inactive'} /></td>
                      <td className="px-4 py-3 flex items-center gap-3">
                        <button
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        <button
                          className={`text-xs font-medium ${u.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}`}
                          onClick={() => toggleMutation.mutate({ id: u._id, isActive: !u.isActive })}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Create New User"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" disabled={createMutation.isPending} onClick={() => createMutation.mutate(form)}>
              {createMutation.isPending ? 'Creating…' : 'Create User'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          {[['Name','name','text'],['Email','email','email'],['Password','password','password'],['Phone','phone','tel']].map(([l,k,t]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input className="input" type={t} value={form[k]} onChange={(e) => set(k, e.target.value)} />
            </div>
          ))}
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => set('role', e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {form.role === 'student' && (
            <>
              <div>
                <label className="label">Enrollment Number</label>
                <input className="input" value={form.enrollmentNumber} onChange={(e) => set('enrollmentNumber', e.target.value)} />
              </div>
              <div>
                <label className="label">Class Level</label>
                <select className="input" value={form.classLevel} onChange={(e) => set('classLevel', e.target.value)}>
                  {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Parent Name</label>
                <input className="input" value={form.parentName} onChange={(e) => set('parentName', e.target.value)} />
              </div>
              <div>
                <label className="label">Parent Phone</label>
                <input className="input" value={form.parentPhone} onChange={(e) => set('parentPhone', e.target.value)} />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Edit User Modal */}
      {editUser && (
        <Modal
          open={editModal}
          onClose={() => { setEditModal(false); setEditUser(null); }}
          title={`Edit ${editUser.role.charAt(0).toUpperCase() + editUser.role.slice(1)}: ${editUser.name}`}
          footer={
            <>
              <button className="btn-secondary" onClick={() => { setEditModal(false); setEditUser(null); }}>Cancel</button>
              <button className="btn-primary" disabled={editMutation.isPending} onClick={submitEdit}>
                {editMutation.isPending ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="label">Name</label>
              <input className="input" value={editForm.name} onChange={(e) => setE('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" type="tel" value={editForm.phone} onChange={(e) => setE('phone', e.target.value)} />
            </div>

            {editUser.role === 'student' && (
              <>
                <div>
                  <label className="label">Enrollment Number</label>
                  <input className="input" value={editForm.enrollmentNumber} onChange={(e) => setE('enrollmentNumber', e.target.value)} />
                </div>
                <div>
                  <label className="label">Class Level</label>
                  <select className="input" value={editForm.classLevel} onChange={(e) => setE('classLevel', e.target.value)}>
                    {CLASS_LEVELS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Parent Name</label>
                  <input className="input" value={editForm.parentName} onChange={(e) => setE('parentName', e.target.value)} />
                </div>
                <div>
                  <label className="label">Parent Phone</label>
                  <input className="input" type="tel" value={editForm.parentPhone} onChange={(e) => setE('parentPhone', e.target.value)} />
                </div>
              </>
            )}

            {editUser.role === 'teacher' && (
              <>
                <div>
                  <label className="label">Subjects <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                  <input className="input" value={editForm.subjects} onChange={(e) => setE('subjects', e.target.value)} placeholder="e.g. Maths, Physics" />
                </div>
                <div>
                  <label className="label">Qualifications <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                  <input className="input" value={editForm.qualifications} onChange={(e) => setE('qualifications', e.target.value)} placeholder="e.g. B.Sc, M.Sc" />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Topbar student search for admin/receptionist — find a student by name,
 * phone, email, or enrollment number and jump to their profile.
 */
export default function GlobalSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const base = user?.role === 'admin' ? '/admin' : '/receptionist';

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const { data: results } = useQuery({
    queryKey: ['student-search', debounced],
    queryFn: () => api.get(`${base}/students/search`, { params: { q: debounced } }).then((r) => r.data),
    enabled: debounced.length >= 2,
  });

  const go = (id) => {
    setQ('');
    setOpen(false);
    navigate(`${base}/students/${id}`);
  };

  return (
    <div className="relative w-full max-w-md" ref={boxRef}>
      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        className="input pl-9"
        placeholder="Find a student — name, phone, or enrollment no."
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && debounced.length >= 2 && (
        <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden">
          {!results?.length ? (
            <p className="px-4 py-3 text-sm text-gray-500">No students match “{debounced}”</p>
          ) : results.map((s) => (
            <button
              key={s.id}
              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors"
              onClick={() => go(s.id)}
            >
              <p className="text-sm font-medium text-gray-900">{s.name}</p>
              <p className="text-xs text-gray-500">{s.enrollmentNumber} · {s.classLevel}{s.phone ? ` · ${s.phone}` : ''}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

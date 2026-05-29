import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DocumentArrowDownIcon, LinkIcon, FilmIcon, PhotoIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';

const TYPE_ICON = {
  pdf:   DocumentTextIcon,
  image: PhotoIcon,
  video: FilmIcon,
  doc:   DocumentTextIcon,
  link:  LinkIcon,
  other: DocumentTextIcon,
};

const TYPE_COLOR = {
  pdf:   'bg-red-50 text-red-600',
  image: 'bg-green-50 text-green-600',
  video: 'bg-purple-50 text-purple-600',
  doc:   'bg-blue-50 text-blue-600',
  link:  'bg-teal-50 text-teal-600',
  other: 'bg-gray-50 text-gray-600',
};

export default function StudyMaterials() {
  const [batchFilter, setBatchFilter] = useState('');
  const [typeFilter, setTypeFilter]   = useState('');

  const { data: materials, isLoading } = useQuery({
    queryKey: ['student-materials'],
    queryFn: () => api.get('/student/materials').then((r) => r.data),
  });

  const batches = [...new Map((materials || []).map((m) => [m.batch?._id, m.batch])).values()].filter(Boolean);

  const filtered = (materials || []).filter((m) => {
    if (batchFilter && m.batch?._id !== batchFilter) return false;
    if (typeFilter  && m.fileType !== typeFilter)     return false;
    return true;
  });

  const BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

  return (
    <div>
      <PageHeader title="Study Materials" subtitle="Downloads and resources from your batches" />

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select className="input w-44" value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
          <option value="">All batches</option>
          {batches.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select className="input w-36" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {['pdf','image','video','doc','link','other'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? <Spinner /> : !filtered.length ? <EmptyState title="No materials found" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((m) => {
            const Icon = TYPE_ICON[m.fileType] || DocumentTextIcon;
            const iconCls = TYPE_COLOR[m.fileType] || TYPE_COLOR.other;
            const href = m.fileType === 'link' ? m.fileUrl : `${BASE}${m.fileUrl}`;
            return (
              <a
                key={m._id}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="card flex items-center gap-4 hover:shadow-md transition-shadow group"
              >
                <div className={`p-3 rounded-xl flex-shrink-0 ${iconCls}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate group-hover:text-indigo-700 transition-colors">{m.title}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{m.batch?.name} · {m.subject}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(m.createdAt), 'dd MMM yyyy')}
                    {m.fileSizeBytes && ` · ${(m.fileSizeBytes / 1024).toFixed(0)} KB`}
                  </p>
                </div>
                <DocumentArrowDownIcon className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 flex-shrink-0 transition-colors" />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

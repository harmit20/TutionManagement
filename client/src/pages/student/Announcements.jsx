import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';

export default function Announcements() {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['student-announcements'],
    queryFn: () => api.get('/student/announcements').then((r) => r.data),
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      <PageHeader title="Announcements" subtitle="Updates from your teachers and the centre" />

      {!announcements?.length ? (
        <EmptyState title="No announcements yet" description="Your teachers' updates will appear here." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a._id} className="card">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-gray-900">{a.title}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap">{format(new Date(a.createdAt), 'dd MMM, hh:mm a')}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.message}</p>
              <p className="text-xs text-gray-400 mt-2">
                {a.batch?.name ?? 'All students'} · {a.createdBy?.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

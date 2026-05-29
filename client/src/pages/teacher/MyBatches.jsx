import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import Badge from '../../components/shared/Badge';
import EmptyState from '../../components/shared/EmptyState';

export default function MyBatches() {
  const { data: batches, isLoading } = useQuery({
    queryKey: ['teacher-batches'],
    queryFn: () => api.get('/teacher/batches').then((r) => r.data),
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

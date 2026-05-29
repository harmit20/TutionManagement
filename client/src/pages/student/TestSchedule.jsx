import { useQuery } from '@tanstack/react-query';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';

function Countdown({ date }) {
  const days = differenceInDays(new Date(date), new Date());
  if (isPast(new Date(date)) && !isToday(new Date(date))) return <span className="text-gray-400 text-xs">Completed</span>;
  if (isToday(new Date(date))) return <span className="text-orange-600 font-semibold text-xs">Today!</span>;
  if (days <= 3) return <span className="text-red-600 font-semibold text-xs">In {days} day{days !== 1 ? 's' : ''}</span>;
  return <span className="text-gray-500 text-xs">In {days} days</span>;
}

export default function TestSchedule() {
  const { data: tests, isLoading } = useQuery({
    queryKey: ['student-tests'],
    queryFn: () => api.get('/student/tests').then((r) => r.data),
  });

  const { data: results } = useQuery({
    queryKey: ['student-results'],
    queryFn: () => api.get('/student/results').then((r) => r.data),
  });

  const resultMap = Object.fromEntries((results || []).map((r) => [r.test?._id, r]));

  if (isLoading) return <Spinner />;

  const upcoming = tests?.filter((t) => !isPast(new Date(t.scheduledDate)) || isToday(new Date(t.scheduledDate))) ?? [];
  const past     = tests?.filter((t) => isPast(new Date(t.scheduledDate)) && !isToday(new Date(t.scheduledDate))) ?? [];

  return (
    <div>
      <PageHeader title="Tests" subtitle="Upcoming and past assessments" />

      {!tests?.length ? <EmptyState title="No tests scheduled" /> : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map((t) => (
                  <div key={t._id} className="card border-l-4 border-l-indigo-500">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{t.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{t.subject} · {t.batch?.name}</p>
                      </div>
                      <Countdown date={t.scheduledDate} />
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-gray-600">
                      <span>{format(new Date(t.scheduledDate), 'dd MMM yyyy, EEEE')}</span>
                      <span>Total: {t.totalMarks} marks</span>
                      {t.duration && <span>{t.duration} min</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past Tests</h2>
              <div className="space-y-3">
                {past.map((t) => {
                  const res = resultMap[t._id];
                  return (
                    <div key={t._id} className="card opacity-80">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{t.title}</p>
                          <p className="text-xs text-gray-500">{t.subject} · {format(new Date(t.scheduledDate), 'dd MMM yyyy')}</p>
                        </div>
                        {res ? (
                          <div className="text-right">
                            <p className="font-bold text-lg text-indigo-700">{res.marksObtained}<span className="text-sm text-gray-400">/{t.totalMarks}</span></p>
                            {res.grade && <p className="text-xs text-gray-500">Grade: {res.grade}</p>}
                          </div>
                        ) : <span className="text-xs text-gray-400">Result pending</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

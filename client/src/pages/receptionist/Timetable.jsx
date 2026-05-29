import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import PageHeader from '../../components/shared/PageHeader';
import Spinner from '../../components/shared/Spinner';
import EmptyState from '../../components/shared/EmptyState';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const COLORS = ['bg-indigo-50 border-indigo-200 text-indigo-800','bg-blue-50 border-blue-200 text-blue-800','bg-purple-50 border-purple-200 text-purple-800','bg-teal-50 border-teal-200 text-teal-800','bg-orange-50 border-orange-200 text-orange-800'];

export default function Timetable() {
  const { data: slots, isLoading } = useQuery({
    queryKey: ['receptionist-timetable'],
    queryFn: () => api.get('/receptionist/timetable').then((r) => r.data),
  });

  const byDay = DAYS.reduce((acc, d) => {
    acc[d] = (slots || []).filter((s) => s.day === d).sort((a,b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {});

  const colorFor = (id) => COLORS[parseInt(id?.slice(-1), 16) % COLORS.length];

  return (
    <div>
      <PageHeader title="Timetable" subtitle="Weekly schedule across all batches" />

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
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

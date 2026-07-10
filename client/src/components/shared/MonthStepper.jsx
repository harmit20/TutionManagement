import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * ← July 2026 → month picker. Faster and typo-proof compared to separate
 * month/year inputs. month is 1-based.
 */
export default function MonthStepper({ month, year, onChange }) {
  const step = (delta) => {
    const d = new Date(year, month - 1 + delta, 1);
    onChange({ month: d.getMonth() + 1, year: d.getFullYear() });
  };

  return (
    <div className="flex items-center h-10 rounded-lg border border-gray-300 bg-white shadow-sm overflow-hidden">
      <button aria-label="Previous month" className="h-full px-2.5 text-gray-500 hover:bg-gray-50 transition-colors" onClick={() => step(-1)}>
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      <span className="px-3 text-sm font-medium text-gray-900 min-w-[8.5rem] text-center select-none">
        {MONTHS[month - 1]} {year}
      </span>
      <button aria-label="Next month" className="h-full px-2.5 text-gray-500 hover:bg-gray-50 transition-colors" onClick={() => step(1)}>
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Horizontal filter toolbar — keeps every control the same height and spacing.
 * Pair with the .input class (h-10) for selects/inputs placed inside.
 */
export default function FilterBar({ children, className = '' }) {
  return <div className={`flex gap-3 mb-6 flex-wrap items-center ${className}`}>{children}</div>;
}

/** Pill-style filter (status chips). */
export function PillGroup({ options, value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              value === val ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented tab toggle (e.g. Fees / Attendance) sized to match .input controls. */
export function TabGroup({ options, value, onChange }) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
      {options.map((opt) => {
        const val = typeof opt === 'string' ? opt : opt.value;
        const label = typeof opt === 'string' ? opt : opt.label;
        return (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={`h-10 px-4 flex items-center text-sm font-medium capitalize transition-colors ${
              value === val ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

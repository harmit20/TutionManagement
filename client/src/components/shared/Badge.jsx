const VARIANTS = {
  // fee status
  paid:     'bg-green-100 text-green-800',
  pending:  'bg-yellow-100 text-yellow-800',
  overdue:  'bg-red-100 text-red-800',
  partial:  'bg-blue-100 text-blue-800',
  waived:   'bg-gray-100 text-gray-600',
  // attendance
  present:  'bg-green-100 text-green-800',
  absent:   'bg-red-100 text-red-800',
  late:     'bg-orange-100 text-orange-800',
  // payout
  on_hold:  'bg-gray-100 text-gray-600',
  // generic
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  admin:    'bg-purple-100 text-purple-800',
  teacher:  'bg-blue-100 text-blue-800',
  student:  'bg-indigo-100 text-indigo-800',
  receptionist: 'bg-teal-100 text-teal-800',
};

export default function Badge({ label, variant }) {
  const cls = VARIANTS[variant] ?? VARIANTS[label?.toLowerCase()] ?? 'bg-gray-100 text-gray-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {label}
    </span>
  );
}

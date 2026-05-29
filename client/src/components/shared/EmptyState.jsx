import { InboxIcon } from '@heroicons/react/24/outline';

export default function EmptyState({ title = 'No data', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <InboxIcon className="h-12 w-12 text-gray-300 mb-3" />
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

import Spinner from './Spinner';
import EmptyState from './EmptyState';

/**
 * Standard table used across the app.
 *
 * columns: [{ header, render(row), className? }]
 * rows:    array of records
 * rowKey:  (row) => unique key, defaults to row._id
 * empty:   { title, description?, action? } — shown when rows is empty
 */
export default function DataTable({ columns, rows, rowKey = (r) => r._id, isLoading, empty = {} }) {
  if (isLoading) return <Spinner />;

  if (!rows?.length) {
    return (
      <div className="card p-0">
        <EmptyState title={empty.title ?? 'No data'} description={empty.description} action={empty.action} />
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="hover:bg-gray-50">
                {columns.map((col, i) => (
                  <td key={i} className={`px-4 py-3 ${col.className ?? ''}`}>{col.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

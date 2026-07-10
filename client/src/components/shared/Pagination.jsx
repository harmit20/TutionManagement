/**
 * Prev/next pager for endpoints returning { total, page, pages }.
 * Renders nothing when everything fits on one page.
 */
export default function Pagination({ page, pages, total, onPage }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-xs text-gray-500">{total} records · page {page} of {pages}</p>
      <div className="flex gap-2">
        <button className="btn-secondary text-xs px-3 py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          ← Previous
        </button>
        <button className="btn-secondary text-xs px-3 py-1.5" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}

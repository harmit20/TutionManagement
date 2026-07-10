import { format } from 'date-fns';
import Badge from './Badge';

/** Printable payment receipt body, shared by Receipts page and Fee Collection. */
export default function ReceiptView({ receipt }) {
  if (!receipt) return null;
  return (
    <div className="space-y-3 font-mono text-sm">
      <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
        <p className="text-lg font-bold text-gray-900">TuitionApp</p>
        <p className="text-xs text-gray-500">Payment Receipt</p>
      </div>
      {[
        ['Receipt No.', receipt.receiptNumber],
        ['Student', receipt.studentName],
        ['Batch', receipt.batchName],
        ['Amount', `₹${receipt.amountPaid}`],
        ['Method', receipt.paymentMethod],
        ['Date', receipt.paidDate ? format(new Date(receipt.paidDate), 'dd MMM yyyy, hh:mm a') : '—'],
        ['Collected By', receipt.collectedBy],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between">
          <span className="text-gray-500">{k}</span>
          <span className="font-medium text-gray-900">{v}</span>
        </div>
      ))}
      <div className="border-t border-dashed border-gray-300 pt-3 text-center">
        <Badge label={receipt.status} />
      </div>
    </div>
  );
}

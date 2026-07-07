import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Modal from './Modal';

/** Loads Razorpay checkout.js once and resolves when available. */
function loadRazorpay() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Could not load payment gateway'));
    document.body.appendChild(s);
  });
}

/**
 * "Pay Now" for a fee record. basePath is '/student' or '/parent'.
 * Runs Razorpay checkout when the server has keys; otherwise a simulated
 * gateway modal so the flow works end-to-end in local dev.
 */
export default function PayNowButton({ feeId, basePath, onPaid }) {
  const qc = useQueryClient();
  const [sim, setSim] = useState(null); // simulated-order details awaiting confirm

  const confirm = useMutation({
    mutationFn: ({ txnId, paymentId, signature }) =>
      api.post(`${basePath}/fees/${feeId}/pay/confirm`, { txnId, paymentId, signature }).then((r) => r.data),
    onSuccess: (d) => {
      toast.success(`Payment successful — receipt ${d.receiptNumber}`);
      setSim(null);
      qc.invalidateQueries();
      onPaid?.(d);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Payment failed'),
  });

  const initiate = useMutation({
    mutationFn: () => api.post(`${basePath}/fees/${feeId}/pay/initiate`).then((r) => r.data),
    onSuccess: async (order) => {
      if (order.provider === 'simulated') {
        setSim(order);
        return;
      }
      try {
        await loadRazorpay();
        new window.Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: Math.round(order.amount * 100),
          currency: order.currency,
          name: 'TuitionApp',
          description: `Fee payment — ${order.studentName}`,
          handler: (rsp) => confirm.mutate({
            txnId: order.txnId,
            paymentId: rsp.razorpay_payment_id,
            signature: rsp.razorpay_signature,
          }),
        }).open();
      } catch (err) {
        toast.error(err.message);
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not start payment'),
  });

  return (
    <>
      <button className="btn-primary text-xs px-3 py-1.5" disabled={initiate.isPending} onClick={() => initiate.mutate()}>
        {initiate.isPending ? 'Starting…' : 'Pay Now'}
      </button>

      {/* Simulated gateway (no Razorpay keys configured) */}
      <Modal open={!!sim} onClose={() => setSim(null)} title="Demo Payment Gateway"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setSim(null)}>Cancel</button>
            <button className="btn-primary" disabled={confirm.isPending}
              onClick={() => confirm.mutate({ txnId: sim.txnId })}>
              {confirm.isPending ? 'Processing…' : `Pay ₹${sim?.amount?.toLocaleString('en-IN')}`}
            </button>
          </>
        }>
        {sim && (
          <div className="space-y-2 text-sm">
            <p className="text-gray-600">This is the built-in demo gateway (no Razorpay keys configured on the server).</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-500">Student</span><strong>{sim.studentName}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Amount</span><strong className="text-lg">₹{sim.amount?.toLocaleString('en-IN')}</strong></div>
              <div className="flex justify-between"><span className="text-gray-500">Order</span><span className="font-mono text-xs">{sim.orderId}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

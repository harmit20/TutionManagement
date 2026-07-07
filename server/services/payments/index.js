const crypto = require('crypto');

/**
 * Online payment gateway adapter.
 *
 * With RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET set, orders are created on
 * Razorpay and signatures verified per their checkout docs. Without keys,
 * a 'simulated' provider lets the whole flow run locally end-to-end.
 */
const getProvider = () =>
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET ? 'razorpay' : 'simulated';

async function createOrder({ amountRupees, receipt }) {
  if (getProvider() === 'simulated') {
    return {
      provider: 'simulated',
      orderId: `sim_${crypto.randomBytes(8).toString('hex')}`,
    };
  }

  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(amountRupees * 100), // paise
      currency: 'INR',
      receipt,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Razorpay order failed ${res.status}: ${detail.slice(0, 200)}`);
  }

  const order = await res.json();
  return { provider: 'razorpay', orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID };
}

/** Razorpay checkout signature check: HMAC-SHA256(orderId|paymentId, keySecret). */
function verifySignature({ orderId, paymentId, signature }) {
  if (getProvider() === 'simulated') return true;
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
}

module.exports = { getProvider, createOrder, verifySignature };

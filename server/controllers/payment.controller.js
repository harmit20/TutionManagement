const asyncHandler = require('../utils/asyncHandler');
const FeeRecord = require('../models/FeeRecord');
const StudentProfile = require('../models/StudentProfile');
const PaymentTransaction = require('../models/PaymentTransaction');
const { getProvider, createOrder, verifySignature } = require('../services/payments');
const { generateReceiptNumber } = require('../utils/receiptNumber');
const { audit } = require('../utils/audit');
const { sendMessage } = require('../services/messaging');
const templates = require('../services/messaging/templates');

/**
 * A student may pay their own fee; a parent may pay a linked child's fee.
 * Returns the fee (with student populated) or null if not permitted.
 */
async function findPayableFee(req) {
  const fee = await FeeRecord.findById(req.params.id).populate({
    path: 'student',
    populate: [{ path: 'user', select: 'name' }, { path: 'parentUser', select: 'phone' }],
  });
  if (!fee) return null;

  if (req.user.role === 'student') {
    const own = await StudentProfile.findOne({ user: req.user._id }).select('_id');
    if (!own || fee.student._id.toString() !== own._id.toString()) return null;
  } else if (req.user.role === 'parent') {
    if (fee.student.parentUser?._id?.toString() !== req.user._id.toString()) return null;
  } else {
    return null;
  }
  return fee;
}

exports.initiatePayment = asyncHandler(async (req, res) => {
  const fee = await findPayableFee(req);
  if (!fee) return res.status(404).json({ message: 'Fee record not found' });
  if (fee.status === 'paid') return res.status(409).json({ message: 'Fee is already paid' });

  const balance = fee.amount - (fee.amountPaid || 0);
  const order = await createOrder({ amountRupees: balance, receipt: `fee_${fee._id}` });

  const txn = await PaymentTransaction.create({
    fee: fee._id,
    student: fee.student._id,
    initiatedBy: req.user._id,
    provider: order.provider,
    orderId: order.orderId,
    amount: balance,
  });

  res.json({
    txnId: txn._id,
    provider: order.provider,
    orderId: order.orderId,
    keyId: order.keyId,
    amount: balance,
    currency: 'INR',
    studentName: fee.student.user?.name,
  });
});

exports.confirmPayment = asyncHandler(async (req, res) => {
  const { txnId, paymentId, signature } = req.body;
  const fee = await findPayableFee(req);
  if (!fee) return res.status(404).json({ message: 'Fee record not found' });

  const txn = await PaymentTransaction.findOne({ _id: txnId, fee: fee._id, status: 'created' });
  if (!txn) return res.status(404).json({ message: 'Payment transaction not found' });

  if (!verifySignature({ orderId: txn.orderId, paymentId, signature })) {
    txn.status = 'failed';
    txn.error = 'Signature verification failed';
    await txn.save();
    return res.status(400).json({ message: 'Payment verification failed' });
  }

  txn.status = 'paid';
  txn.paymentId = paymentId || `sim_pay_${txn.orderId}`;
  await txn.save();

  fee.amountPaid = (fee.amountPaid || 0) + txn.amount;
  fee.paymentMethod = 'online';
  fee.paidDate = new Date();
  fee.receiptNumber = fee.receiptNumber || generateReceiptNumber();
  fee.status = fee.amountPaid >= fee.amount ? 'paid' : 'partial';
  await fee.save();

  audit(req, 'fee.payOnline', 'FeeRecord', fee._id, {
    amount: txn.amount,
    provider: txn.provider,
    orderId: txn.orderId,
  });

  sendMessage({
    to: fee.student.parentUser?.phone || fee.student.parentPhone,
    template: 'fee_receipt',
    body: templates.feeReceipt({
      studentName: fee.student.user?.name,
      amount: txn.amount,
      receiptNumber: fee.receiptNumber,
    }),
    studentId: fee.student._id,
  });

  res.json({ message: 'Payment successful', receiptNumber: fee.receiptNumber, status: fee.status });
});

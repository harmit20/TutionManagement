const asyncHandler = require('../utils/asyncHandler');
const FeeRecord = require('../models/FeeRecord');
const StudentProfile = require('../models/StudentProfile');

const generateReceiptNumber = () =>
  `RCP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// ─── Admin / Receptionist ─────────────────────────────────────────────────────

exports.createFeeRecord = asyncHandler(async (req, res) => {
  const { studentId, batchId, amount, dueDate, forMonth, forYear } = req.body;
  if (!studentId || !batchId || !amount || !dueDate) {
    return res.status(400).json({ message: 'studentId, batchId, amount, dueDate are required' });
  }

  const record = await FeeRecord.create({
    student: studentId,
    batch: batchId,
    amount,
    dueDate,
    forMonth,
    forYear,
    status: 'pending',
  });

  res.status(201).json(record);
});

exports.collectPayment = asyncHandler(async (req, res) => {
  const { amountPaid, paymentMethod, remarks } = req.body;
  if (!amountPaid || !paymentMethod) {
    return res.status(400).json({ message: 'amountPaid and paymentMethod are required' });
  }

  const record = await FeeRecord.findById(req.params.id);
  if (!record) return res.status(404).json({ message: 'Fee record not found' });
  if (record.status === 'paid') return res.status(409).json({ message: 'Fee already marked as paid' });

  record.amountPaid = (record.amountPaid || 0) + amountPaid;
  record.paymentMethod = paymentMethod;
  record.collectedBy = req.user._id;
  record.paidDate = new Date();
  record.remarks = remarks;
  record.receiptNumber = record.receiptNumber || generateReceiptNumber();
  record.status = record.amountPaid >= record.amount ? 'paid' : 'partial';

  await record.save();
  res.json(record);
});

exports.listFees = asyncHandler(async (req, res) => {
  const { studentId, batchId, status, month, year, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (studentId) filter.student = studentId;
  if (batchId) filter.batch = batchId;
  if (status) filter.status = status;
  if (month) filter.forMonth = Number(month);
  if (year) filter.forYear = Number(year);

  const [records, total] = await Promise.all([
    FeeRecord.find(filter)
      .populate({ path: 'student', populate: { path: 'user', select: 'name email' } })
      .populate('batch', 'name classLevel subject')
      .populate('collectedBy', 'name')
      .sort({ dueDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    FeeRecord.countDocuments(filter),
  ]);

  res.json({ records, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.getReceipt = asyncHandler(async (req, res) => {
  const record = await FeeRecord.findById(req.params.id)
    .populate({ path: 'student', populate: { path: 'user', select: 'name email phone' } })
    .populate('batch', 'name classLevel subject')
    .populate('collectedBy', 'name');

  if (!record) return res.status(404).json({ message: 'Fee record not found' });
  if (!record.receiptNumber) return res.status(400).json({ message: 'Payment not collected yet' });

  res.json({
    receiptNumber: record.receiptNumber,
    studentName: record.student?.user?.name,
    batchName: record.batch?.name,
    amount: record.amount,
    amountPaid: record.amountPaid,
    paymentMethod: record.paymentMethod,
    paidDate: record.paidDate,
    collectedBy: record.collectedBy?.name,
    status: record.status,
  });
});

// ─── Student (own fees) ───────────────────────────────────────────────────────

exports.getMyFees = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Student profile not found' });

  const records = await FeeRecord.find({ student: profile._id })
    .populate('batch', 'name classLevel subject')
    .sort({ dueDate: -1 });

  res.json(records);
});

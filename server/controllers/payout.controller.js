const asyncHandler = require('../utils/asyncHandler');
const PaymentLedger = require('../models/PaymentLedger');
const TeacherProfile = require('../models/TeacherProfile');
const { buildPayoutLines } = require('../utils/payoutCalculator');

// ─── Admin ────────────────────────────────────────────────────────────────────

exports.calculatePayout = asyncHandler(async (req, res) => {
  const { teacherId, month, year } = req.body;
  if (!teacherId || !month || !year) {
    return res.status(400).json({ message: 'teacherId, month, and year are required' });
  }

  // teacherId may be a User _id (from admin UI) or TeacherProfile _id — resolve either
  let teacher = await TeacherProfile.findById(teacherId).catch(() => null);
  if (!teacher) teacher = await TeacherProfile.findOne({ user: teacherId });
  if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });

  const { lines, totalAmount, totalLectures } = await buildPayoutLines(teacher._id, Number(month), Number(year));

  // Upsert: recalculating replaces the ledger (only if still pending)
  const existing = await PaymentLedger.findOne({ teacher: teacher._id, month, year });
  if (existing && existing.status === 'paid') {
    return res.status(409).json({ message: 'Payout for this period is already marked as paid' });
  }

  const ledger = await PaymentLedger.findOneAndUpdate(
    { teacher: teacher._id, month: Number(month), year: Number(year) },
    { lines, totalAmount, totalLectures, status: 'pending' },
    { upsert: true, new: true }
  );

  res.status(201).json(ledger);
});

exports.listPayouts = asyncHandler(async (req, res) => {
  const { teacherId, status, month, year, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (teacherId) filter.teacher = teacherId;
  if (status) filter.status = status;
  if (month) filter.month = Number(month);
  if (year) filter.year = Number(year);

  const [ledgers, total] = await Promise.all([
    PaymentLedger.find(filter)
      .populate({ path: 'teacher', populate: { path: 'user', select: 'name email' } })
      .sort({ year: -1, month: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    PaymentLedger.countDocuments(filter),
  ]);

  res.json({ ledgers, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.markPaid = asyncHandler(async (req, res) => {
  const { remarks } = req.body;
  const ledger = await PaymentLedger.findById(req.params.id);
  if (!ledger) return res.status(404).json({ message: 'Payout ledger not found' });
  if (ledger.status === 'paid') return res.status(409).json({ message: 'Already marked as paid' });

  ledger.status = 'paid';
  ledger.paidOn = new Date();
  ledger.paidBy = req.user._id;
  ledger.remarks = remarks;
  await ledger.save();

  res.json(ledger);
});

// ─── Teacher (own ledger) ─────────────────────────────────────────────────────

exports.getMyPayouts = asyncHandler(async (req, res) => {
  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });

  const ledgers = await PaymentLedger.find({ teacher: profile._id })
    .sort({ year: -1, month: -1 });

  res.json(ledgers);
});

exports.getMyPayoutDetail = asyncHandler(async (req, res) => {
  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });

  const ledger = await PaymentLedger.findOne({ _id: req.params.id, teacher: profile._id })
    .populate({ path: 'lines.batch', select: 'name classLevel subject' });

  if (!ledger) return res.status(404).json({ message: 'Payout record not found' });
  res.json(ledger);
});

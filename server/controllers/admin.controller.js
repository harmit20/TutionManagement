const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const Batch = require('../models/Batch');
const FeeRecord = require('../models/FeeRecord');
const AttendanceRecord = require('../models/AttendanceRecord');
const PricingRule = require('../models/PricingRule');
const PaymentLedger = require('../models/PaymentLedger');
const Classroom = require('../models/Classroom');

// ─── Dashboard ────────────────────────────────────────────────────────────────

exports.getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [
    totalStudents,
    totalTeachers,
    totalBatches,
    pendingFees,
    feeAgg,
    recentEnrollments,
  ] = await Promise.all([
    User.countDocuments({ role: 'student', isActive: true }),
    User.countDocuments({ role: 'teacher', isActive: true }),
    Batch.countDocuments({ isActive: true }),
    FeeRecord.countDocuments({ status: { $in: ['pending', 'overdue'] } }),
    FeeRecord.aggregate([
      { $match: { status: 'paid', paidDate: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amountPaid' } } },
    ]),
    StudentProfile.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email'),
  ]);

  res.json({
    totalStudents,
    totalTeachers,
    totalBatches,
    pendingFees,
    feeCollectedThisMonth: feeAgg[0]?.total ?? 0,
    recentEnrollments,
  });
});

// ─── Users ────────────────────────────────────────────────────────────────────

exports.listUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (role) filter.role = role;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash')
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),
    User.countDocuments(filter),
  ]);

  res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ─── Pricing Rules ────────────────────────────────────────────────────────────

exports.listPricingRules = asyncHandler(async (req, res) => {
  const rules = await PricingRule.find()
    .populate('createdBy', 'name')
    .sort({ classLevel: 1, subject: 1, effectiveFrom: -1 });
  res.json(rules);
});

exports.createPricingRule = asyncHandler(async (req, res) => {
  const { classLevel, subject, ratePerLecture, effectiveFrom } = req.body;
  if (!classLevel || !subject || ratePerLecture == null || !effectiveFrom) {
    return res.status(400).json({ message: 'classLevel, subject, ratePerLecture, effectiveFrom are required' });
  }

  const from = new Date(effectiveFrom);

  // Close out any open rule for the same class+subject that would overlap
  await PricingRule.updateMany(
    { classLevel, subject, effectiveTo: null, effectiveFrom: { $lt: from } },
    { effectiveTo: new Date(from.getTime() - 86400000) } // day before new rule starts
  );

  const rule = await PricingRule.create({
    classLevel,
    subject,
    ratePerLecture,
    effectiveFrom: from,
    effectiveTo: null,
    createdBy: req.user._id,
  });

  res.status(201).json(rule);
});

// ─── Classrooms ───────────────────────────────────────────────────────────────

exports.listClassrooms = asyncHandler(async (req, res) => {
  const classrooms = await Classroom.find().sort({ name: 1 });
  res.json(classrooms);
});

exports.createClassroom = asyncHandler(async (req, res) => {
  const { name, capacity, facilities } = req.body;
  if (!name || !capacity) {
    return res.status(400).json({ message: 'name and capacity are required' });
  }
  const classroom = await Classroom.create({ name, capacity, facilities });
  res.status(201).json(classroom);
});

exports.updateClassroom = asyncHandler(async (req, res) => {
  const classroom = await Classroom.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!classroom) return res.status(404).json({ message: 'Classroom not found' });
  res.json(classroom);
});

// ─── Reports ──────────────────────────────────────────────────────────────────

exports.feeReport = asyncHandler(async (req, res) => {
  const { month, year, batchId } = req.query;
  const match = {};
  if (month && year) {
    match.forMonth = Number(month);
    match.forYear = Number(year);
  }
  if (batchId) match.batch = batchId;

  const data = await FeeRecord.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        total: { $sum: '$amount' },
        collected: { $sum: '$amountPaid' },
      },
    },
  ]);

  res.json(data);
});

exports.attendanceReport = asyncHandler(async (req, res) => {
  const { batchId, month, year } = req.query;
  const match = {};
  if (batchId) match.batch = batchId;
  if (month && year) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    match.date = { $gte: start, $lte: end };
  }

  const records = await AttendanceRecord.find(match)
    .populate('batch', 'name classLevel subject')
    .sort({ date: -1 });

  const summary = records.map((r) => {
    const present = r.students.filter((s) => s.status === 'present').length;
    const total = r.students.length;
    return {
      batch: r.batch,
      date: r.date,
      present,
      absent: total - present,
      attendanceRate: total ? Math.round((present / total) * 100) : 0,
    };
  });

  res.json(summary);
});

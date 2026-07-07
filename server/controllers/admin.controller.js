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
const AuditLog = require('../models/AuditLog');
const MessageLog = require('../models/MessageLog');
const Expense = require('../models/Expense');
const { audit } = require('../utils/audit');

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
    expenseAgg,
    payoutAgg,
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
    Expense.aggregate([
      { $match: { isDeleted: { $ne: true }, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    PaymentLedger.aggregate([
      { $match: { status: 'paid', paidOn: { $gte: monthStart, $lte: monthEnd } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]),
    StudentProfile.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('user', 'name email'),
  ]);

  const feeCollectedThisMonth = feeAgg[0]?.total ?? 0;
  const expensesThisMonth = expenseAgg[0]?.total ?? 0;
  const payoutsPaidThisMonth = payoutAgg[0]?.total ?? 0;

  res.json({
    totalStudents,
    totalTeachers,
    totalBatches,
    pendingFees,
    feeCollectedThisMonth,
    expensesThisMonth,
    payoutsPaidThisMonth,
    netThisMonth: feeCollectedThisMonth - expensesThisMonth - payoutsPaidThisMonth,
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

// ─── User detail + profile update ────────────────────────────────────────────

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found' });

  let profile = null;
  if (user.role === 'student')
    profile = await StudentProfile.findOne({ user: user._id });
  else if (user.role === 'teacher')
    profile = await TeacherProfile.findOne({ user: user._id });

  res.json({ user, profile });
});

exports.updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash');
  if (!user) return res.status(404).json({ message: 'User not found' });

  // Always update base user fields if provided
  const { name, phone, classLevel, parentName, parentPhone, enrollmentNumber, qualifications, subjects } = req.body;
  if (name !== undefined) user.name = name;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  let profile = null;
  if (user.role === 'student') {
    profile = await StudentProfile.findOneAndUpdate(
      { user: user._id },
      { classLevel, parentName, parentPhone, enrollmentNumber },
      { new: true, runValidators: true }
    );
  } else if (user.role === 'teacher') {
    profile = await TeacherProfile.findOneAndUpdate(
      { user: user._id },
      { qualifications, subjects },
      { new: true, runValidators: true }
    );
  }

  res.json({ user, profile });
});

// ─── Pricing Rules ────────────────────────────────────────────────────────────

exports.listPricingRules = asyncHandler(async (req, res) => {
  const rules = await PricingRule.find()
    .populate('createdBy', 'name')
    .populate({ path: 'teacher', populate: { path: 'user', select: 'name' } })
    .sort({ effectiveFrom: -1 });
  res.json(rules);
});

exports.createPricingRule = asyncHandler(async (req, res) => {
  const { teacher: userId, ratePerLecture, effectiveFrom } = req.body;
  if (!userId || ratePerLecture == null || !effectiveFrom) {
    return res.status(400).json({ message: 'teacher, ratePerLecture, effectiveFrom are required' });
  }

  const profile = await TeacherProfile.findOne({ user: userId });
  if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });

  const from = new Date(effectiveFrom);

  // Close out any open rule for the same teacher that would overlap
  await PricingRule.updateMany(
    { teacher: profile._id, effectiveTo: null, effectiveFrom: { $lt: from } },
    { effectiveTo: new Date(from.getTime() - 86400000) } // day before new rule starts
  );

  const rule = await PricingRule.create({
    teacher: profile._id,
    ratePerLecture,
    effectiveFrom: from,
    effectiveTo: null,
    createdBy: req.user._id,
  });

  audit(req, 'pricing.create', 'PricingRule', rule._id, { teacherId: profile._id, ratePerLecture });
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

// ─── Parent linking ───────────────────────────────────────────────────────────

exports.linkParentChildren = asyncHandler(async (req, res) => {
  const { childStudentIds = [] } = req.body;
  const parent = await User.findOne({ _id: req.params.userId, role: 'parent' });
  if (!parent) return res.status(404).json({ message: 'Parent user not found' });

  // Replace this parent's links with the given set
  await StudentProfile.updateMany({ parentUser: parent._id }, { $unset: { parentUser: 1 } });
  if (childStudentIds.length) {
    await StudentProfile.updateMany({ _id: { $in: childStudentIds } }, { parentUser: parent._id });
  }

  audit(req, 'parent.linkChildren', 'User', parent._id, { childStudentIds });
  const children = await StudentProfile.find({ parentUser: parent._id }).populate('user', 'name');
  res.json({ children });
});

// ─── Audit Log ────────────────────────────────────────────────────────────────

exports.listAuditLogs = asyncHandler(async (req, res) => {
  const { action, entityType, page = 1, limit = 25 } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
});

// ─── Message Log ──────────────────────────────────────────────────────────────

exports.listMessageLogs = asyncHandler(async (req, res) => {
  const { template, status, page = 1, limit = 25 } = req.query;
  const filter = {};
  if (template) filter.template = template;
  if (status) filter.status = status;

  const [logs, total] = await Promise.all([
    MessageLog.find(filter)
      .populate({ path: 'student', select: 'user', populate: { path: 'user', select: 'name' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    MessageLog.countDocuments(filter),
  ]);

  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / limit) });
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

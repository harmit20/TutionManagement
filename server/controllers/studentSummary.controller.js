const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const FeeRecord = require('../models/FeeRecord');
const AttendanceRecord = require('../models/AttendanceRecord');
const TestResult = require('../models/TestResult');
const Test = require('../models/Test');

/**
 * Quick lookup for the global search box: matches student name, email,
 * phone, or enrollment number. Returns at most 8 results.
 */
exports.searchStudents = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  const regex = { $regex: q, $options: 'i' };

  const [users, byEnrollment] = await Promise.all([
    User.find({ role: 'student', $or: [{ name: regex }, { email: regex }, { phone: regex }] })
      .select('_id')
      .limit(8),
    StudentProfile.find({ enrollmentNumber: regex }).select('_id').limit(8),
  ]);

  const profiles = await StudentProfile.find({
    $or: [
      { user: { $in: users.map((u) => u._id) } },
      { _id: { $in: byEnrollment.map((p) => p._id) } },
    ],
  })
    .populate('user', 'name email phone')
    .limit(8);

  res.json(profiles.map((p) => ({
    id: p._id,
    name: p.user?.name,
    email: p.user?.email,
    phone: p.user?.phone,
    enrollmentNumber: p.enrollmentNumber,
    classLevel: p.classLevel,
  })));
});

/**
 * One student's complete picture: profile, batches, fees, attendance
 * stats, and test results — the page every role eventually needs.
 */
exports.getStudentSummary = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findById(req.params.id)
    .populate('user', 'name email phone isActive')
    .populate('batches', 'name classLevel subject');

  if (!profile) return res.status(404).json({ message: 'Student not found' });

  const [fees, attendanceRecords, results] = await Promise.all([
    FeeRecord.find({ student: profile._id })
      .populate('batch', 'name')
      .sort({ dueDate: -1 })
      .limit(24),
    AttendanceRecord.find({ 'students.student': profile._id })
      .select('date students.$ batch')
      .populate('batch', 'name')
      .sort({ date: -1 })
      .limit(60),
    TestResult.find({ student: profile._id })
      .populate({ path: 'test', select: 'title subject totalMarks scheduledDate', populate: { path: 'batch', select: 'name' } })
      .sort({ createdAt: -1 })
      .limit(20),
  ]);

  const present = attendanceRecords.filter((r) => r.students[0]?.status === 'present').length;
  const attendanceRate = attendanceRecords.length
    ? Math.round((present / attendanceRecords.length) * 100)
    : null;

  const pendingAmount = fees
    .filter((f) => f.status !== 'paid')
    .reduce((sum, f) => sum + (f.amount - (f.amountPaid || 0)), 0);

  res.json({
    profile: {
      id: profile._id,
      name: profile.user?.name,
      email: profile.user?.email,
      phone: profile.user?.phone,
      isActive: profile.user?.isActive,
      enrollmentNumber: profile.enrollmentNumber,
      classLevel: profile.classLevel,
      parentName: profile.parentName,
      parentPhone: profile.parentPhone,
      address: profile.address,
      joinedAt: profile.joinedAt,
      batches: profile.batches,
    },
    stats: {
      attendanceRate,
      attendanceSampled: attendanceRecords.length,
      pendingAmount,
      batchCount: profile.batches?.length ?? 0,
    },
    fees,
    recentAttendance: attendanceRecords.slice(0, 10).map((r) => ({
      date: r.date,
      batch: r.batch,
      status: r.students[0]?.status,
    })),
    testResults: results,
  });
});

/**
 * Printable report card for a date range: every test in the period with
 * the student's marks, the batch average, and their rank in the batch.
 */
exports.getReportCard = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const profile = await StudentProfile.findById(req.params.id)
    .populate('user', 'name')
    .populate('batches', 'name');
  if (!profile) return res.status(404).json({ message: 'Student not found' });

  const range = {};
  if (from) range.$gte = new Date(from);
  if (to) range.$lte = new Date(`${to}T23:59:59`);

  const results = await TestResult.find({ student: profile._id })
    .populate({
      path: 'test',
      select: 'title subject totalMarks passingMarks scheduledDate',
      match: Object.keys(range).length ? { scheduledDate: range } : {},
      populate: { path: 'batch', select: 'name' },
    })
    .sort({ createdAt: 1 });

  const inRange = results.filter((r) => r.test);

  // Batch average + rank per test
  const rows = await Promise.all(inRange.map(async (r) => {
    const all = await TestResult.find({ test: r.test._id }).select('marksObtained').lean();
    const avg = all.length ? all.reduce((s, x) => s + x.marksObtained, 0) / all.length : null;
    const rank = all.filter((x) => x.marksObtained > r.marksObtained).length + 1;
    return {
      test: r.test.title,
      subject: r.test.subject,
      batch: r.test.batch?.name,
      date: r.test.scheduledDate,
      marks: r.marksObtained,
      totalMarks: r.test.totalMarks,
      grade: r.grade,
      remarks: r.remarks,
      batchAverage: avg == null ? null : Math.round(avg * 10) / 10,
      rank,
      outOf: all.length,
    };
  }));

  // Attendance over the same period
  const attFilter = { 'students.student': profile._id };
  if (Object.keys(range).length) attFilter.date = range;
  const attendance = await AttendanceRecord.find(attFilter).select('students.$').lean();
  const present = attendance.filter((r) => r.students[0]?.status === 'present').length;

  res.json({
    student: {
      name: profile.user?.name,
      enrollmentNumber: profile.enrollmentNumber,
      classLevel: profile.classLevel,
      batches: profile.batches.map((b) => b.name),
    },
    period: { from: from || null, to: to || null },
    tests: rows,
    attendance: {
      total: attendance.length,
      present,
      rate: attendance.length ? Math.round((present / attendance.length) * 100) : null,
    },
  });
});

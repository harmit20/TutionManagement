const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const FeeRecord = require('../models/FeeRecord');
const AttendanceRecord = require('../models/AttendanceRecord');
const TestResult = require('../models/TestResult');

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
      .populate({ path: 'test', select: 'title subject totalMarks scheduledAt', populate: { path: 'batch', select: 'name' } })
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

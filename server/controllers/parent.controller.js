const asyncHandler = require('../utils/asyncHandler');
const StudentProfile = require('../models/StudentProfile');
const FeeRecord = require('../models/FeeRecord');
const AttendanceRecord = require('../models/AttendanceRecord');

/** Children linked to the logged-in parent, with headline stats per child. */
exports.listChildren = asyncHandler(async (req, res) => {
  const children = await StudentProfile.find({ parentUser: req.user._id })
    .populate('user', 'name email')
    .populate('batches', 'name classLevel subject');

  const withStats = await Promise.all(children.map(async (child) => {
    const [fees, attendance] = await Promise.all([
      FeeRecord.find({ student: child._id, status: { $ne: 'paid' } }),
      AttendanceRecord.find({ 'students.student': child._id })
        .select('students.$')
        .sort({ date: -1 })
        .limit(60),
    ]);

    const present = attendance.filter((r) => r.students[0]?.status === 'present').length;

    return {
      id: child._id,
      name: child.user?.name,
      enrollmentNumber: child.enrollmentNumber,
      classLevel: child.classLevel,
      batches: child.batches,
      pendingAmount: fees.reduce((sum, f) => sum + (f.amount - (f.amountPaid || 0)), 0),
      attendanceRate: attendance.length ? Math.round((present / attendance.length) * 100) : null,
    };
  }));

  res.json(withStats);
});

/** Guard: the requested child must belong to this parent. */
exports.requireOwnChild = asyncHandler(async (req, res, next) => {
  const child = await StudentProfile.findOne({ _id: req.params.id, parentUser: req.user._id });
  if (!child) return res.status(404).json({ message: 'Child not found' });
  next();
});

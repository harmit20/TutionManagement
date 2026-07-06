const asyncHandler = require('../utils/asyncHandler');
const Batch = require('../models/Batch');
const StudentProfile = require('../models/StudentProfile');
const { audit } = require('../utils/audit');

exports.enrollStudent = asyncHandler(async (req, res) => {
  const { studentId, batchId } = req.body;
  if (!studentId || !batchId) {
    return res.status(400).json({ message: 'studentId and batchId are required' });
  }

  const [student, batch] = await Promise.all([
    StudentProfile.findById(studentId),
    Batch.findById(batchId),
  ]);

  if (!student) return res.status(404).json({ message: 'Student not found' });
  if (!batch || !batch.isActive) return res.status(404).json({ message: 'Batch not found or inactive' });

  if (batch.maxCapacity && batch.students.length >= batch.maxCapacity) {
    return res.status(409).json({ message: 'Batch is at full capacity' });
  }

  if (batch.students.includes(studentId)) {
    return res.status(409).json({ message: 'Student is already enrolled in this batch' });
  }

  await Promise.all([
    Batch.findByIdAndUpdate(batchId, { $addToSet: { students: studentId } }),
    StudentProfile.findByIdAndUpdate(studentId, { $addToSet: { batches: batchId } }),
  ]);

  audit(req, 'enrollment.enroll', 'StudentProfile', studentId, { batchId });
  res.status(201).json({ message: 'Student enrolled successfully' });
});

exports.unenrollStudent = asyncHandler(async (req, res) => {
  const { studentId, batchId } = req.params;

  await Promise.all([
    Batch.findByIdAndUpdate(batchId, { $pull: { students: studentId } }),
    StudentProfile.findByIdAndUpdate(studentId, { $pull: { batches: batchId } }),
  ]);

  audit(req, 'enrollment.unenroll', 'StudentProfile', studentId, { batchId });
  res.json({ message: 'Student unenrolled successfully' });
});

exports.listStudentsForEnrollment = asyncHandler(async (req, res) => {
  const { search, classLevel, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (classLevel) filter.classLevel = classLevel;

  const students = await StudentProfile.find(filter)
    .populate({
      path: 'user',
      match: search
        ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
        : {},
      select: 'name email phone',
    })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // populate match can return null user; filter those out
  const filtered = students.filter((s) => s.user !== null);
  res.json(filtered);
});

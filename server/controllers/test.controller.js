const asyncHandler = require('../utils/asyncHandler');
const Test = require('../models/Test');
const TestResult = require('../models/TestResult');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const Batch = require('../models/Batch');

// ─── Tests ────────────────────────────────────────────────────────────────────

exports.createTest = asyncHandler(async (req, res) => {
  const { title, batchId, subject, scheduledDate, totalMarks, passingMarks, duration, description } = req.body;
  if (!title || !batchId || !subject || !scheduledDate || !totalMarks) {
    return res.status(400).json({ message: 'title, batchId, subject, scheduledDate, totalMarks are required' });
  }

  const test = await Test.create({
    title,
    batch: batchId,
    subject,
    scheduledDate,
    totalMarks,
    passingMarks,
    duration,
    description,
    createdBy: req.user._id,
  });

  res.status(201).json(test);
});

exports.listTests = asyncHandler(async (req, res) => {
  const { batchId, upcoming, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (batchId) filter.batch = batchId;
  if (upcoming === 'true') filter.scheduledDate = { $gte: new Date() };

  const [tests, total] = await Promise.all([
    Test.find(filter)
      .populate('batch', 'name classLevel subject')
      .populate('createdBy', 'name')
      .sort({ scheduledDate: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Test.countDocuments(filter),
  ]);

  res.json({ tests, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.getTest = asyncHandler(async (req, res) => {
  const test = await Test.findById(req.params.id)
    .populate('batch', 'name classLevel subject')
    .populate('createdBy', 'name');
  if (!test) return res.status(404).json({ message: 'Test not found' });
  res.json(test);
});

exports.updateTest = asyncHandler(async (req, res) => {
  const test = await Test.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!test) return res.status(404).json({ message: 'Test not found' });
  res.json(test);
});

// ─── Results ──────────────────────────────────────────────────────────────────

/**
 * Bulk upsert results for a test. Body: { results: [{studentId, marksObtained, grade, remarks}] }
 * Idempotent — re-submitting the same student corrects their result.
 */
exports.enterResults = asyncHandler(async (req, res) => {
  const { results } = req.body;
  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ message: 'results[] is required' });
  }

  const test = await Test.findById(req.params.testId);
  if (!test) return res.status(404).json({ message: 'Test not found' });

  const ops = results.map(({ studentId, marksObtained, grade, remarks, percentile }) => ({
    updateOne: {
      filter: { test: test._id, student: studentId },
      update: { test: test._id, student: studentId, marksObtained, grade, remarks, percentile, enteredBy: req.user._id },
      upsert: true,
    },
  }));

  await TestResult.bulkWrite(ops);
  const saved = await TestResult.find({ test: test._id }).populate('student', 'enrollmentNumber');

  res.status(201).json(saved);
});

exports.listResults = asyncHandler(async (req, res) => {
  const results = await TestResult.find({ test: req.params.testId })
    .populate({ path: 'student', populate: { path: 'user', select: 'name' } })
    .sort({ marksObtained: -1 });
  res.json(results);
});

// ─── Student (own results) ────────────────────────────────────────────────────

exports.getMyTests = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Student profile not found' });

  const tests = await Test.find({
    batch: { $in: profile.batches },
    isPublished: true,
  })
    .populate('batch', 'name subject')
    .sort({ scheduledDate: 1 });

  res.json(tests);
});

exports.getMyResults = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Student profile not found' });

  const results = await TestResult.find({ student: profile._id })
    .populate({
      path: 'test',
      select: 'title subject scheduledDate totalMarks passingMarks batch',
      populate: { path: 'batch', select: 'name' },
    })
    .sort({ createdAt: -1 });

  res.json(results);
});

// ─── Teacher: tests for assigned batches ─────────────────────────────────────

exports.getMyBatchTests = asyncHandler(async (req, res) => {
  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });

  const tests = await Test.find({ batch: { $in: profile.assignedBatches } })
    .populate('batch', 'name classLevel subject')
    .sort({ scheduledDate: 1 });

  res.json(tests);
});

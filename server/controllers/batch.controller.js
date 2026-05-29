const asyncHandler = require('../utils/asyncHandler');
const Batch = require('../models/Batch');

exports.listBatches = asyncHandler(async (req, res) => {
  const { classLevel, subject, teacherId, isActive = 'true' } = req.query;
  const filter = {};
  if (classLevel) filter.classLevel = classLevel;
  if (subject) filter.subject = { $regex: subject, $options: 'i' };
  if (teacherId) filter.assignedTeacher = teacherId;
  if (isActive !== 'all') filter.isActive = isActive === 'true';

  const batches = await Batch.find(filter)
    .populate('assignedTeacher', 'user')
    .populate({ path: 'assignedTeacher', populate: { path: 'user', select: 'name' } })
    .populate('classroom', 'name capacity')
    .sort({ classLevel: 1, name: 1 });

  res.json(batches);
});

exports.getBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id)
    .populate({ path: 'assignedTeacher', populate: { path: 'user', select: 'name email' } })
    .populate('classroom', 'name capacity')
    .populate({ path: 'students', populate: { path: 'user', select: 'name email' } });

  if (!batch) return res.status(404).json({ message: 'Batch not found' });
  res.json(batch);
});

exports.createBatch = asyncHandler(async (req, res) => {
  const { name, classLevel, subject, assignedTeacher, classroom, schedule, maxCapacity } = req.body;
  if (!name || !classLevel || !subject || !assignedTeacher) {
    return res.status(400).json({ message: 'name, classLevel, subject, assignedTeacher are required' });
  }

  const batch = await Batch.create({ name, classLevel, subject, assignedTeacher, classroom, schedule, maxCapacity });
  res.status(201).json(batch);
});

exports.updateBatch = asyncHandler(async (req, res) => {
  const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!batch) return res.status(404).json({ message: 'Batch not found' });
  res.json(batch);
});

exports.getBatchStudents = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.id)
    .populate({ path: 'students', populate: { path: 'user', select: 'name email phone' } });
  if (!batch) return res.status(404).json({ message: 'Batch not found' });
  res.json(batch.students);
});

const asyncHandler = require('../utils/asyncHandler');
const Batch = require('../models/Batch');
const { findConflict, toMinutes } = require('../utils/conflictChecker');

// ─── Controllers ──────────────────────────────────────────────────────────────

exports.getBatchSchedule = asyncHandler(async (req, res) => {
  const batch = await Batch.findById(req.params.batchId)
    .select('name classLevel subject schedule classroom assignedTeacher')
    .populate('classroom', 'name')
    .populate({ path: 'assignedTeacher', populate: { path: 'user', select: 'name' } });

  if (!batch) return res.status(404).json({ message: 'Batch not found' });
  res.json(batch);
});

exports.addScheduleSlot = asyncHandler(async (req, res) => {
  const { day, startTime, endTime } = req.body;
  if (!day || !startTime || !endTime) {
    return res.status(400).json({ message: 'day, startTime, endTime are required' });
  }

  if (toMinutes(startTime) >= toMinutes(endTime)) {
    return res.status(400).json({ message: 'startTime must be before endTime' });
  }

  const batch = await Batch.findById(req.params.batchId);
  if (!batch || !batch.isActive) return res.status(404).json({ message: 'Batch not found or inactive' });

  const conflict = await findConflict(
    day, startTime, endTime,
    batch.classroom?.toString(),
    batch.assignedTeacher?.toString(),
    batch._id
  );

  if (conflict) {
    return res.status(409).json({
      message: `Schedule conflict: ${conflict.type} is already booked`,
      conflict,
    });
  }

  batch.schedule.push({ day, startTime, endTime });
  await batch.save();
  res.status(201).json(batch.schedule);
});

exports.removeScheduleSlot = asyncHandler(async (req, res) => {
  const { batchId, slotIndex } = req.params;

  const batch = await Batch.findById(batchId);
  if (!batch) return res.status(404).json({ message: 'Batch not found' });

  const idx = Number(slotIndex);
  if (idx < 0 || idx >= batch.schedule.length) {
    return res.status(400).json({ message: 'Invalid slot index' });
  }

  batch.schedule.splice(idx, 1);
  await batch.save();
  res.json(batch.schedule);
});

exports.checkConflict = asyncHandler(async (req, res) => {
  const { day, startTime, endTime, classroomId, teacherId, excludeBatchId } = req.query;
  if (!day || !startTime || !endTime) {
    return res.status(400).json({ message: 'day, startTime, endTime are required' });
  }

  const conflict = await findConflict(day, startTime, endTime, classroomId, teacherId, excludeBatchId);
  res.json({ hasConflict: !!conflict, conflict: conflict ?? null });
});

exports.getFullTimetable = asyncHandler(async (req, res) => {
  const { classroomId, teacherId, day } = req.query;
  const filter = { isActive: true };
  if (classroomId) filter.classroom = classroomId;
  if (teacherId)   filter.assignedTeacher = teacherId;
  if (day)         filter['schedule.day'] = day;

  const batches = await Batch.find(filter)
    .select('name classLevel subject schedule classroom assignedTeacher')
    .populate('classroom', 'name')
    .populate({ path: 'assignedTeacher', populate: { path: 'user', select: 'name' } });

  const slots = batches.flatMap((b) =>
    b.schedule.map((s) => ({
      batchId:    b._id,
      batchName:  b.name,
      classLevel: b.classLevel,
      subject:    b.subject,
      classroom:  b.classroom,
      teacher:    b.assignedTeacher,
      day:        s.day,
      startTime:  s.startTime,
      endTime:    s.endTime,
    }))
  );

  res.json(slots);
});

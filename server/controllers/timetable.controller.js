const asyncHandler = require('../utils/asyncHandler');
const Batch = require('../models/Batch');
const ScheduleException = require('../models/ScheduleException');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const FCMToken = require('../models/FCMToken');
const { findConflict, toMinutes } = require('../utils/conflictChecker');
const { sendMulticast, deactivateTokens } = require('../utils/fcm.util');
const { sendMessage } = require('../services/messaging');
const templates = require('../services/messaging/templates');
const { audit } = require('../utils/audit');

/** Notify a batch's students (push) and their parents (WhatsApp/SMS). Fire-and-forget. */
async function notifyBatchOfChange({ batch, exception, teacherName }) {
  try {
    const students = await StudentProfile.find({ batches: batch._id })
      .populate('user', '_id')
      .populate('parentUser', 'phone');

    const body = exception.type === 'cancelled'
      ? templates.classCancelled({ batchName: batch.name, onDate: exception.date, startTime: exception.startTime, reason: exception.reason })
      : templates.classSubstituted({ batchName: batch.name, onDate: exception.date, startTime: exception.startTime, teacherName });

    // WhatsApp/SMS to parents
    for (const s of students) {
      await sendMessage({
        to: s.parentUser?.phone || s.parentPhone,
        template: exception.type === 'cancelled' ? 'class_cancelled' : 'class_substituted',
        body,
        studentId: s._id,
      });
    }

    // Push to students who have the app
    const userIds = students.map((s) => s.user?._id).filter(Boolean);
    const tokenDocs = await FCMToken.find({ user: { $in: userIds }, isActive: true }).select('token').lean();
    if (tokenDocs.length) {
      const result = await sendMulticast(
        tokenDocs.map((t) => t.token),
        { title: exception.type === 'cancelled' ? '❌ Class Cancelled' : '🔄 Substitute Teacher', body, link: '/student/attendance' },
        { type: 'schedule_change', batchId: batch._id.toString() }
      );
      if (result.failedTokens.length) await deactivateTokens(result.failedTokens);
    }
  } catch (err) {
    console.error('[ScheduleChange notify] failed:', err.message);
  }
}

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

// ─── Exceptions (cancellations & substitutions) ───────────────────────────────

exports.createException = asyncHandler(async (req, res) => {
  const { batchId, date, startTime, type, substituteTeacherId, reason } = req.body;
  if (!batchId || !date || !startTime || !type) {
    return res.status(400).json({ message: 'batchId, date, startTime, and type are required' });
  }
  if (type === 'substituted' && !substituteTeacherId) {
    return res.status(400).json({ message: 'substituteTeacherId is required for substitutions' });
  }

  const batch = await Batch.findById(batchId).select('name schedule');
  if (!batch) return res.status(404).json({ message: 'Batch not found' });

  const day = new Date(date);
  day.setHours(0, 0, 0, 0);

  let teacherName;
  if (type === 'substituted') {
    const sub = await TeacherProfile.findById(substituteTeacherId).populate('user', 'name');
    if (!sub) return res.status(404).json({ message: 'Substitute teacher not found' });
    teacherName = sub.user?.name;
  }

  let exception;
  try {
    exception = await ScheduleException.create({
      batch: batchId,
      date: day,
      startTime,
      type,
      substituteTeacher: type === 'substituted' ? substituteTeacherId : undefined,
      reason,
      createdBy: req.user._id,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'A change already exists for this class on that date' });
    }
    throw err;
  }

  audit(req, `timetable.${type}`, 'ScheduleException', exception._id, { batchId, date, startTime, reason });
  notifyBatchOfChange({ batch, exception, teacherName });

  res.status(201).json(exception);
});

exports.listExceptions = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const filter = {};
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(`${to}T23:59:59`);
  }

  const exceptions = await ScheduleException.find(filter)
    .populate('batch', 'name classLevel subject')
    .populate({ path: 'substituteTeacher', populate: { path: 'user', select: 'name' } })
    .populate('createdBy', 'name')
    .sort({ date: 1, startTime: 1 });

  res.json(exceptions);
});

exports.deleteException = asyncHandler(async (req, res) => {
  const exception = await ScheduleException.findByIdAndDelete(req.params.id);
  if (!exception) return res.status(404).json({ message: 'Schedule change not found' });
  audit(req, 'timetable.restoreClass', 'ScheduleException', exception._id);
  res.json({ message: 'Schedule change removed' });
});

/** Teacher list for the substitution picker. */
exports.listTeachers = asyncHandler(async (req, res) => {
  const teachers = await TeacherProfile.find().populate('user', 'name').select('user subjects');
  res.json(teachers.map((t) => ({ id: t._id, name: t.user?.name, subjects: t.subjects })));
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

const asyncHandler = require('../utils/asyncHandler');
const AttendanceRecord = require('../models/AttendanceRecord');
const TeacherProfile = require('../models/TeacherProfile');
const StudentProfile = require('../models/StudentProfile');
const Batch = require('../models/Batch');
const { sendMessage } = require('../services/messaging');
const templates = require('../services/messaging/templates');

/**
 * Alert parents of newly-absent students. Fire-and-forget — marking
 * attendance must never fail because a message could not be sent.
 */
async function alertAbsentees({ record, previousStudents, batchId }) {
  try {
    const prevStatus = new Map(
      (previousStudents || []).map((s) => [s.student.toString(), s.status])
    );
    const newlyAbsent = record.students.filter(
      (s) => s.status === 'absent' && prevStatus.get(s.student.toString()) !== 'absent'
    );
    if (!newlyAbsent.length) return;

    const [profiles, batch] = await Promise.all([
      StudentProfile.find({ _id: { $in: newlyAbsent.map((s) => s.student) } })
        .populate('user', 'name')
        .populate('parentUser', 'phone'),
      Batch.findById(batchId).select('name'),
    ]);

    for (const p of profiles) {
      const to = p.parentUser?.phone || p.parentPhone;
      await sendMessage({
        to,
        template: 'absence_alert',
        body: templates.absenceAlert({
          studentName: p.user?.name,
          batchName: batch?.name ?? 'class',
          onDate: record.date,
        }),
        studentId: p._id,
      });
    }
  } catch (err) {
    console.error('[AbsenceAlert] failed:', err.message);
  }
}

// ─── Teacher ──────────────────────────────────────────────────────────────────

exports.markAttendance = asyncHandler(async (req, res) => {
  const { batchId, date, students, lectureStartTime, lectureEndTime } = req.body;
  if (!batchId || !date || !Array.isArray(students)) {
    return res.status(400).json({ message: 'batchId, date, and students[] are required' });
  }

  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });

  const lectureDate = new Date(date);
  lectureDate.setHours(0, 0, 0, 0);

  // Remember the previous marks so corrections don't re-alert parents
  const previous = await AttendanceRecord.findOne({ batch: batchId, date: lectureDate })
    .select('students')
    .lean();

  // Upsert: allow teachers to correct a session they already marked
  const record = await AttendanceRecord.findOneAndUpdate(
    { batch: batchId, date: lectureDate },
    {
      batch: batchId,
      teacher: profile._id,
      date: lectureDate,
      students,
      lectureStartTime,
      lectureEndTime,
      markedAt: new Date(),
      markedBy: req.user._id,
    },
    { upsert: true, new: true, runValidators: true }
  );

  alertAbsentees({ record, previousStudents: previous?.students, batchId });

  res.status(201).json(record);
});

exports.getAttendanceByBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { from, to, page = 1, limit = 30 } = req.query;

  const filter = { batch: batchId };
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const [records, total] = await Promise.all([
    AttendanceRecord.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    AttendanceRecord.countDocuments(filter),
  ]);

  res.json({ records, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.updateAttendance = asyncHandler(async (req, res) => {
  const record = await AttendanceRecord.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!record) return res.status(404).json({ message: 'Attendance record not found' });
  res.json(record);
});

// ─── QR check-in ──────────────────────────────────────────────────────────────

const crypto = require('crypto');
const AttendanceSession = require('../models/AttendanceSession');

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Teacher: open a QR check-in session for one of their batches (today). */
exports.createCheckInSession = asyncHandler(async (req, res) => {
  const { batchId } = req.body;
  if (!batchId) return res.status(400).json({ message: 'batchId is required' });

  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });

  const batch = await Batch.findOne({ _id: batchId, assignedTeacher: profile._id });
  if (!batch) return res.status(403).json({ message: 'Not your batch' });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const session = await AttendanceSession.create({
    batch: batchId,
    teacher: profile._id,
    date: today,
    token: crypto.randomBytes(16).toString('hex'),
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });

  res.status(201).json({ token: session.token, expiresAt: session.expiresAt });
});

/** Student: check in by scanning (or typing) the session token. */
exports.checkIn = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'token is required' });

  const session = await AttendanceSession.findOne({ token: token.trim() }).populate('batch', 'name students');
  if (!session || session.expiresAt < new Date()) {
    return res.status(410).json({ message: 'This check-in code has expired — ask your teacher for a new one' });
  }

  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Student profile not found' });

  const enrolled = session.batch.students.some((s) => s.toString() === profile._id.toString());
  if (!enrolled) return res.status(403).json({ message: 'You are not enrolled in this batch' });

  // Upsert today's record and mark this student present
  const record = await AttendanceRecord.findOne({ batch: session.batch._id, date: session.date });
  if (record) {
    const entry = record.students.find((s) => s.student.toString() === profile._id.toString());
    if (entry) entry.status = 'present';
    else record.students.push({ student: profile._id, status: 'present' });
    record.markedAt = new Date();
    await record.save();
  } else {
    await AttendanceRecord.create({
      batch: session.batch._id,
      teacher: session.teacher,
      date: session.date,
      students: [{ student: profile._id, status: 'present' }],
      markedBy: req.user._id,
    });
  }

  res.json({ message: `Checked in to ${session.batch.name}`, batch: session.batch.name });
});

/** Teacher: live count of who has checked in for a session's class. */
exports.getCheckInStatus = asyncHandler(async (req, res) => {
  const session = await AttendanceSession.findOne({ token: req.params.token });
  if (!session) return res.status(404).json({ message: 'Session not found' });

  const record = await AttendanceRecord.findOne({ batch: session.batch, date: session.date })
    .populate({ path: 'students.student', select: 'user', populate: { path: 'user', select: 'name' } });

  const present = (record?.students || []).filter((s) => s.status === 'present');
  res.json({
    presentCount: present.length,
    present: present.map((s) => s.student?.user?.name).filter(Boolean),
    expiresAt: session.expiresAt,
  });
});

// ─── Student (own attendance) ─────────────────────────────────────────────────

exports.getMyAttendance = asyncHandler(async (req, res) => {
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Student profile not found' });

  const { batchId, from, to } = req.query;

  // Find batches the student is in (optionally filtered)
  const batchFilter = { students: profile._id };
  if (batchId) batchFilter._id = batchId;
  const batches = await Batch.find(batchFilter).select('_id name subject');
  const batchIds = batches.map((b) => b._id);

  const dateFilter = {};
  if (from) dateFilter.$gte = new Date(from);
  if (to) dateFilter.$lte = new Date(to);

  const records = await AttendanceRecord.find({
    batch: { $in: batchIds },
    ...(Object.keys(dateFilter).length && { date: dateFilter }),
  })
    .populate('batch', 'name subject')
    .sort({ date: -1 });

  // Shape response: per record, expose only this student's status
  const shaped = records.map((r) => {
    const entry = r.students.find((s) => s.student?.toString() === profile._id.toString());
    return {
      batch: r.batch,
      date: r.date,
      status: entry?.status ?? 'absent',
    };
  });

  // Aggregate summary per batch
  const summary = batches.map((b) => {
    const bRecords = shaped.filter((r) => r.batch?._id?.toString() === b._id.toString());
    const present = bRecords.filter((r) => r.status === 'present').length;
    return {
      batch: b,
      totalClasses: bRecords.length,
      present,
      attendancePercent: bRecords.length ? Math.round((present / bRecords.length) * 100) : 0,
    };
  });

  res.json({ records: shaped, summary });
});

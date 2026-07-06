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

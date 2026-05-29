const mongoose  = require('mongoose');
const Batch     = require('../models/Batch');
const User      = require('../models/User');
const TeacherProfile  = require('../models/TeacherProfile');
const Classroom       = require('../models/Classroom');
const { findConflict, overlaps, toMinutes } = require('../utils/conflictChecker');

// ─── Pure function unit tests ─────────────────────────────────────────────────

describe('toMinutes', () => {
  it('converts HH:MM to minutes', () => {
    expect(toMinutes('00:00')).toBe(0);
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('23:59')).toBe(1439);
  });
});

describe('overlaps', () => {
  it('returns true for overlapping intervals',    () => expect(overlaps(60, 120, 90, 150)).toBe(true));
  it('returns true when one contains the other',  () => expect(overlaps(60, 180, 90, 120)).toBe(true));
  it('returns false for adjacent intervals',      () => expect(overlaps(60, 120, 120, 180)).toBe(false));
  it('returns false for non-overlapping',         () => expect(overlaps(60, 90, 120, 180)).toBe(false));
  it('returns true for identical intervals',      () => expect(overlaps(60, 120, 60, 120)).toBe(true));
});

// ─── Integration tests (require MongoDB) ─────────────────────────────────────

async function buildFixture() {
  const adminUser = await User.create({ name: 'Admin', email: 'a@test.com', passwordHash: 'x', role: 'admin' });
  const teacherUser = await User.create({ name: 'T', email: 't@test.com', passwordHash: 'x', role: 'teacher' });
  const teacher   = await TeacherProfile.create({ user: teacherUser._id });
  const classroom = await Classroom.create({ name: 'Room 101', capacity: 30 });

  // Existing batch: Monday 09:00–10:00 in Room 101, with teacher
  const existing = await Batch.create({
    name: 'Existing Batch', classLevel: '11th', subject: 'Maths',
    assignedTeacher: teacher._id, classroom: classroom._id,
    schedule: [{ day: 'Monday', startTime: '09:00', endTime: '10:00' }],
  });

  return { teacher, classroom, existing };
}

describe('findConflict (integration)', () => {
  it('returns null when no batches exist', async () => {
    const result = await findConflict('Monday', '09:00', '10:00', new mongoose.Types.ObjectId().toString(), null, null);
    expect(result).toBeNull();
  });

  it('detects a classroom overlap', async () => {
    const { classroom } = await buildFixture();
    const conflict = await findConflict('Monday', '09:30', '10:30', classroom._id.toString(), null, null);
    expect(conflict).not.toBeNull();
    expect(conflict.type).toBe('classroom');
  });

  it('detects a teacher double-booking', async () => {
    const { teacher } = await buildFixture();
    const conflict = await findConflict('Monday', '09:30', '10:30', null, teacher._id.toString(), null);
    expect(conflict).not.toBeNull();
    expect(conflict.type).toBe('teacher');
  });

  it('does NOT flag adjacent slots as conflicting', async () => {
    const { classroom } = await buildFixture();
    // 10:00 starts exactly when existing ends at 10:00 — adjacent, not overlapping
    const conflict = await findConflict('Monday', '10:00', '11:00', classroom._id.toString(), null, null);
    expect(conflict).toBeNull();
  });

  it('does NOT flag slots on a different day', async () => {
    const { classroom } = await buildFixture();
    const conflict = await findConflict('Tuesday', '09:00', '10:00', classroom._id.toString(), null, null);
    expect(conflict).toBeNull();
  });

  it('excludes the batch being edited (excludeBatchId)', async () => {
    const { classroom, existing } = await buildFixture();
    // Same slot, but we're editing the existing batch itself — should be no conflict
    const conflict = await findConflict(
      'Monday', '09:00', '10:00',
      classroom._id.toString(), null,
      existing._id.toString()
    );
    expect(conflict).toBeNull();
  });

  it('does NOT flag inactive batches', async () => {
    const { classroom, existing } = await buildFixture();
    await Batch.findByIdAndUpdate(existing._id, { isActive: false });
    const conflict = await findConflict('Monday', '09:00', '10:00', classroom._id.toString(), null, null);
    expect(conflict).toBeNull();
  });
});

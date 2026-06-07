const { buildPayoutLines } = require('../utils/payoutCalculator');
const User             = require('../models/User');
const TeacherProfile   = require('../models/TeacherProfile');
const Batch            = require('../models/Batch');
const PricingRule      = require('../models/PricingRule');
const AttendanceRecord = require('../models/AttendanceRecord');

async function scaffold() {
  const user    = await User.create({ name: 'Teacher', email: 't@test.com', passwordHash: 'x', role: 'teacher' });
  const admin   = await User.create({ name: 'Admin',   email: 'a@test.com', passwordHash: 'x', role: 'admin' });
  const teacher = await TeacherProfile.create({ user: user._id });
  const batch   = await Batch.create({
    name: 'Batch A', classLevel: '11th', subject: 'Physics', assignedTeacher: teacher._id,
  });
  return { user, admin, teacher, batch };
}

describe('buildPayoutLines', () => {
  it('returns empty lines when teacher has no attendance records', async () => {
    const { teacher } = await scaffold();
    const { lines, totalAmount, totalLectures } = await buildPayoutLines(teacher._id, 1, 2024);
    expect(lines).toHaveLength(0);
    expect(totalAmount).toBe(0);
    expect(totalLectures).toBe(0);
  });

  it('applies the rate active on each lecture date (historical accuracy)', async () => {
    const { admin, teacher, batch } = await scaffold();

    // Rule 1: ₹500 — Jan 1–15
    await PricingRule.create({
      teacher: teacher._id, ratePerLecture: 500,
      effectiveFrom: new Date('2024-01-01'), effectiveTo: new Date('2024-01-15'),
      createdBy: admin._id,
    });
    // Rule 2: ₹600 — Jan 16 onwards (still active)
    await PricingRule.create({
      teacher: teacher._id, ratePerLecture: 600,
      effectiveFrom: new Date('2024-01-16'), effectiveTo: null,
      createdBy: admin._id,
    });

    await AttendanceRecord.create([
      { batch: batch._id, teacher: teacher._id, date: new Date('2024-01-10'), students: [] },
      { batch: batch._id, teacher: teacher._id, date: new Date('2024-01-15'), students: [] },
      { batch: batch._id, teacher: teacher._id, date: new Date('2024-01-20'), students: [] },
    ]);

    const { lines, totalAmount, totalLectures } = await buildPayoutLines(teacher._id, 1, 2024);

    expect(totalLectures).toBe(3);
    expect(totalAmount).toBe(500 + 500 + 600); // 1600

    const sorted = lines.sort((a, b) => new Date(a.lectureDate) - new Date(b.lectureDate));
    expect(sorted[0].rateApplied).toBe(500);
    expect(sorted[1].rateApplied).toBe(500);
    expect(sorted[2].rateApplied).toBe(600);
  });

  it('snapshots the rate so future rule changes do not alter historical payouts', async () => {
    const { admin, teacher, batch } = await scaffold();

    const rule = await PricingRule.create({
      teacher: teacher._id, ratePerLecture: 500,
      effectiveFrom: new Date('2024-01-01'), effectiveTo: null,
      createdBy: admin._id,
    });
    await AttendanceRecord.create({
      batch: batch._id, teacher: teacher._id, date: new Date('2024-01-10'), students: [],
    });

    const { lines } = await buildPayoutLines(teacher._id, 1, 2024);

    expect(lines[0].pricingSnapshot.ratePerLecture).toBe(500);
    expect(lines[0].pricingSnapshot.pricingRuleId.toString()).toBe(rule._id.toString());
  });

  it('skips lectures when teacher has no matching pricing rule', async () => {
    const { teacher, batch } = await scaffold();
    // No PricingRule created at all
    await AttendanceRecord.create({
      batch: batch._id, teacher: teacher._id, date: new Date('2024-01-10'), students: [],
    });

    const { lines, totalLectures } = await buildPayoutLines(teacher._id, 1, 2024);
    expect(totalLectures).toBe(0);
    expect(lines).toHaveLength(0);
  });

  it('only counts lectures in the requested month', async () => {
    const { admin, teacher, batch } = await scaffold();

    await PricingRule.create({
      teacher: teacher._id, ratePerLecture: 400,
      effectiveFrom: new Date('2024-01-01'), effectiveTo: null, createdBy: admin._id,
    });

    await AttendanceRecord.create([
      { batch: batch._id, teacher: teacher._id, date: new Date('2024-01-20'), students: [] }, // Jan
      { batch: batch._id, teacher: teacher._id, date: new Date('2024-02-05'), students: [] }, // Feb
    ]);

    const jan = await buildPayoutLines(teacher._id, 1, 2024);
    const feb = await buildPayoutLines(teacher._id, 2, 2024);

    expect(jan.totalLectures).toBe(1);
    expect(feb.totalLectures).toBe(1);
    expect(jan.totalAmount).toBe(400);
  });

  it('uses separate rates for different teachers', async () => {
    const user2    = await User.create({ name: 'Teacher2', email: 't2@test.com', passwordHash: 'x', role: 'teacher' });
    const admin    = await User.create({ name: 'Admin2',   email: 'a2@test.com', passwordHash: 'x', role: 'admin' });
    const teacher1 = await TeacherProfile.create({ user: (await User.create({ name: 'T1', email: 't1@test.com', passwordHash: 'x', role: 'teacher' }))._id });
    const teacher2 = await TeacherProfile.create({ user: user2._id });
    const batch1   = await Batch.create({ name: 'B1', classLevel: '11th', subject: 'Math', assignedTeacher: teacher1._id });
    const batch2   = await Batch.create({ name: 'B2', classLevel: '12th', subject: 'Math', assignedTeacher: teacher2._id });

    await PricingRule.create({ teacher: teacher1._id, ratePerLecture: 300, effectiveFrom: new Date('2024-01-01'), effectiveTo: null, createdBy: admin._id });
    await PricingRule.create({ teacher: teacher2._id, ratePerLecture: 700, effectiveFrom: new Date('2024-01-01'), effectiveTo: null, createdBy: admin._id });

    await AttendanceRecord.create({ batch: batch1._id, teacher: teacher1._id, date: new Date('2024-01-10'), students: [] });
    await AttendanceRecord.create({ batch: batch2._id, teacher: teacher2._id, date: new Date('2024-01-10'), students: [] });

    const r1 = await buildPayoutLines(teacher1._id, 1, 2024);
    const r2 = await buildPayoutLines(teacher2._id, 1, 2024);

    expect(r1.totalAmount).toBe(300);
    expect(r2.totalAmount).toBe(700);
  });
});

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
      classLevel: '11th', subject: 'Physics', ratePerLecture: 500,
      effectiveFrom: new Date('2024-01-01'), effectiveTo: new Date('2024-01-15'),
      createdBy: admin._id,
    });
    // Rule 2: ₹600 — Jan 16 onwards (still active)
    await PricingRule.create({
      classLevel: '11th', subject: 'Physics', ratePerLecture: 600,
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
      classLevel: '11th', subject: 'Physics', ratePerLecture: 500,
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

  it('skips lectures whose class+subject has no matching pricing rule', async () => {
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
      classLevel: '11th', subject: 'Physics', ratePerLecture: 400,
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
});

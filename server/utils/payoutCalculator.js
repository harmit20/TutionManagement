const AttendanceRecord = require('../models/AttendanceRecord');
const PricingRule = require('../models/PricingRule');

const startOfDay = (d) => { const dt = new Date(d); dt.setHours(0, 0, 0, 0); return dt; };
const endOfDay = (d) => { const dt = new Date(d); dt.setHours(23, 59, 59, 999); return dt; };

/**
 * For each lecture a teacher gave in [month, year], finds the PricingRule
 * active on that lecture's date (effectiveFrom ≤ date ≤ effectiveTo | null)
 * and snapshots the rate. Historical accuracy is preserved even when rates
 * change later.
 */
async function buildPayoutLines(teacherId, month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const records = await AttendanceRecord.find({
    teacher: teacherId,
    date: { $gte: start, $lte: end },
  }).populate({ path: 'batch', select: 'classLevel subject name' });

  const lines = [];
  let totalAmount = 0;

  for (const record of records) {
    if (!record.batch) continue;

    const { classLevel, subject } = record.batch;
    const lectureDate = startOfDay(record.date);

    // Most-recently-started rule that covers this lecture date
    const rule = await PricingRule.findOne({
      classLevel,
      subject,
      effectiveFrom: { $lte: endOfDay(lectureDate) },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gte: lectureDate } }],
    }).sort({ effectiveFrom: -1 });

    if (!rule) continue; // no pricing configured — skip silently

    lines.push({
      attendanceRecord: record._id,
      lectureDate: record.date,
      batch: record.batch._id,
      rateApplied: rule.ratePerLecture,
      pricingSnapshot: {
        classLevel: rule.classLevel,
        subject: rule.subject,
        ratePerLecture: rule.ratePerLecture,
        effectiveFrom: rule.effectiveFrom,
        effectiveTo: rule.effectiveTo,
        pricingRuleId: rule._id,
      },
    });

    totalAmount += rule.ratePerLecture;
  }

  return { lines, totalAmount, totalLectures: lines.length };
}

module.exports = { buildPayoutLines };

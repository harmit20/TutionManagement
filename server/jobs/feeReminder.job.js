const cron = require('node-cron');
const FeeRecord = require('../models/FeeRecord');
const FCMToken = require('../models/FCMToken');
const StudentProfile = require('../models/StudentProfile');
const { sendMulticast, deactivateTokens } = require('../utils/fcm.util');

/**
 * Builds a date-range filter for a specific calendar day N days from now.
 * e.g. dayWindow(1) → { $gte: start-of-tomorrow, $lte: end-of-tomorrow }
 */
function dayWindow(offsetDays) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { $gte: d, $lte: end };
}

async function runFeeReminder() {
  try {
    // Notify at T-3 and T-1 so the student gets two warnings
    const fees = await FeeRecord.find({
      status: { $in: ['pending', 'partial'] },
      $or: [
        { dueDate: dayWindow(1) },
        { dueDate: dayWindow(3) },
      ],
    })
      .select('student batch amount dueDate')
      .populate({ path: 'student', select: 'user', populate: { path: 'user', select: '_id' } })
      .populate('batch', 'name subject')
      .lean();

    if (!fees.length) {
      console.log('[FeeReminder] No upcoming fees — nothing to do');
      return;
    }

    // Deduplicate: one notification per student (even if multiple fees due)
    const byStudent = new Map();
    for (const fee of fees) {
      const userId = fee.student?.user?._id?.toString();
      if (!userId) continue;

      if (!byStudent.has(userId)) {
        byStudent.set(userId, { userId: fee.student.user._id, fee });
      }
    }

    let dispatched = 0;
    let skipped = 0;

    for (const { userId, fee } of byStudent.values()) {
      const tokenDocs = await FCMToken.find({ user: userId, isActive: true })
        .select('token')
        .lean();

      if (!tokenDocs.length) {
        skipped++;
        continue;
      }

      const dueDate = new Date(fee.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((dueDate - today) / 86_400_000);
      const urgency = daysLeft <= 1 ? '⚠️ Due Tomorrow!' : `Due in ${daysLeft} days`;

      const tokens = tokenDocs.map((t) => t.token);
      const result = await sendMulticast(
        tokens,
        {
          title: `💰 Fee Reminder — ${urgency}`,
          body: `₹${fee.amount} for ${fee.batch?.name ?? 'your batch'} is due on ${dueDate.toLocaleDateString('en-IN')}.`,
          link: '/student/fees',
        },
        {
          type: 'fee_reminder',
          feeId: fee._id.toString(),
          daysLeft: String(daysLeft),
        }
      );

      if (result.failedTokens.length) {
        await deactivateTokens(result.failedTokens);
      }

      dispatched++;
    }

    console.log(
      `[FeeReminder] Done — dispatched: ${dispatched}, skipped (no token): ${skipped}`
    );
  } catch (err) {
    console.error('[FeeReminder] Job failed:', err.message);
  }
}

/**
 * Registers the cron schedule.
 * Runs every day at 08:00 AM server local time.
 * Call this once from server.js after DB connects.
 */
function scheduleJob() {
  cron.schedule('0 8 * * *', runFeeReminder, { timezone: 'Asia/Kolkata' });
  console.log('[FeeReminder] Scheduled — daily at 08:00 IST');
}

module.exports = { scheduleJob, runFeeReminder };

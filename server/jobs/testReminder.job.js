const cron = require('node-cron');
const Test = require('../models/Test');
const StudentProfile = require('../models/StudentProfile');
const FCMToken = require('../models/FCMToken');
const { sendMulticast, deactivateTokens } = require('../utils/fcm.util');

function dayWindow(offsetDays) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const end = new Date(d);
  end.setHours(23, 59, 59, 999);
  return { $gte: d, $lte: end };
}

async function runTestReminder() {
  try {
    // Remind students 1 day and 2 days before the test
    const tests = await Test.find({
      isPublished: true,
      $or: [
        { scheduledDate: dayWindow(1) },
        { scheduledDate: dayWindow(2) },
      ],
    })
      .select('title subject scheduledDate batch totalMarks')
      .populate({
        path: 'batch',
        select: 'name subject students',
        populate: { path: 'students', select: 'user' },
      })
      .lean();

    if (!tests.length) {
      console.log('[TestReminder] No upcoming tests — nothing to do');
      return;
    }

    let totalDispatched = 0;

    for (const test of tests) {
      const studentProfiles = test.batch?.students ?? [];
      if (!studentProfiles.length) continue;

      // Gather user IDs for all enrolled students
      const userIds = studentProfiles
        .map((p) => p.user)
        .filter(Boolean);

      if (!userIds.length) continue;

      const tokenDocs = await FCMToken.find({
        user: { $in: userIds },
        isActive: true,
      })
        .select('token')
        .lean();

      if (!tokenDocs.length) continue;

      const testDate = new Date(test.scheduledDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((testDate - today) / 86_400_000);
      const when = daysLeft === 1 ? 'tomorrow' : 'in 2 days';

      const tokens = tokenDocs.map((t) => t.token);
      const result = await sendMulticast(
        tokens,
        {
          title: `📝 Test Reminder — ${test.title}`,
          body: `${test.subject} test for ${test.batch.name} is scheduled ${when} (${testDate.toLocaleDateString('en-IN')}). Marks: ${test.totalMarks}.`,
          link: '/student/tests',
        },
        {
          type: 'test_reminder',
          testId: test._id.toString(),
          daysLeft: String(daysLeft),
        }
      );

      if (result.failedTokens.length) {
        await deactivateTokens(result.failedTokens);
      }

      totalDispatched += result.successCount;
    }

    console.log(
      `[TestReminder] Done — ${tests.length} test(s), ~${totalDispatched} notification(s) sent`
    );
  } catch (err) {
    console.error('[TestReminder] Job failed:', err.message);
  }
}

/**
 * Runs every day at 08:30 AM (30 min after fee reminders to avoid burst).
 */
function scheduleJob() {
  cron.schedule('30 8 * * *', runTestReminder, { timezone: 'Asia/Kolkata' });
  console.log('[TestReminder] Scheduled — daily at 08:30 IST');
}

module.exports = { scheduleJob, runTestReminder };

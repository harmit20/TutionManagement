/** Message bodies for parent/student alerts. Keep them short — SMS-friendly. */

const inr = (n) => `₹${Number(n).toLocaleString('en-IN')}`;
const date = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

module.exports = {
  absenceAlert: ({ studentName, batchName, onDate }) =>
    `TuitionApp: ${studentName} was marked ABSENT for ${batchName} on ${date(onDate)}. ` +
    `Please contact the centre if this is unexpected.`,

  feeReminder: ({ studentName, batchName, amount, dueDate, daysLeft }) =>
    `TuitionApp: Fee of ${inr(amount)} for ${studentName} (${batchName}) is due on ${date(dueDate)}` +
    (daysLeft <= 1 ? ' — due tomorrow!' : ` (${daysLeft} days left).`),

  feeReceipt: ({ studentName, amount, receiptNumber }) =>
    `TuitionApp: Payment of ${inr(amount)} received for ${studentName}. Receipt: ${receiptNumber}. Thank you!`,

  classCancelled: ({ batchName, onDate, startTime, reason }) =>
    `TuitionApp: ${batchName} class on ${date(onDate)} at ${startTime} is CANCELLED.` +
    (reason ? ` Reason: ${reason}.` : ''),

  classSubstituted: ({ batchName, onDate, startTime, teacherName }) =>
    `TuitionApp: ${batchName} class on ${date(onDate)} at ${startTime} will be taken by ${teacherName}.`,
};

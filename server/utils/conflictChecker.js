const Batch = require('../models/Batch');

/** Convert "HH:MM" to total minutes since midnight */
const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/**
 * True when [s1,e1) and [s2,e2) overlap.
 * Adjacent slots (e1 === s2) are intentionally NOT flagged.
 */
const overlaps = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

/**
 * Returns the first scheduling conflict for the proposed slot, or null.
 *
 * @param {string}   day           – day of week, e.g. "Monday"
 * @param {string}   startTime     – "HH:MM" 24-hour
 * @param {string}   endTime       – "HH:MM" 24-hour
 * @param {string}   [classroomId] – ObjectId string; check classroom occupancy
 * @param {string}   [teacherId]   – TeacherProfile ObjectId; check double-booking
 * @param {string}   [excludeBatchId] – skip this batch (used when editing existing)
 *
 * @returns {{ type: 'classroom'|'teacher', batchId, batchName, slot } | null}
 */
async function findConflict(day, startTime, endTime, classroomId, teacherId, excludeBatchId) {
  const start = toMinutes(startTime);
  const end   = toMinutes(endTime);

  const base = {
    isActive: true,
    'schedule.day': day,
    ...(excludeBatchId && { _id: { $ne: excludeBatchId } }),
  };

  const scan = async (filter) => {
    const batches = await Batch.find(filter).lean();
    for (const b of batches) {
      for (const slot of b.schedule) {
        if (
          slot.day === day &&
          overlaps(start, end, toMinutes(slot.startTime), toMinutes(slot.endTime))
        ) {
          return { batchId: b._id, batchName: b.name, slot };
        }
      }
    }
    return null;
  };

  if (classroomId) {
    const hit = await scan({ ...base, classroom: classroomId });
    if (hit) return { type: 'classroom', ...hit };
  }

  if (teacherId) {
    const hit = await scan({ ...base, assignedTeacher: teacherId });
    if (hit) return { type: 'teacher', ...hit };
  }

  return null;
}

module.exports = { findConflict, toMinutes, overlaps };

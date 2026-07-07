const mongoose = require('mongoose');

/**
 * A date-specific change to the weekly schedule: one class cancelled or
 * taught by a substitute teacher. The weekly Batch.schedule stays intact.
 */
const scheduleExceptionSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    date: { type: Date, required: true },
    startTime: { type: String, required: true }, // matches the slot's startTime
    type: { type: String, enum: ['cancelled', 'substituted'], required: true },
    substituteTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherProfile' },
    reason: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

scheduleExceptionSchema.index({ batch: 1, date: 1, startTime: 1 }, { unique: true });
scheduleExceptionSchema.index({ date: 1 });

module.exports = mongoose.model('ScheduleException', scheduleExceptionSchema);

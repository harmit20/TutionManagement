const mongoose = require('mongoose');

/** Short-lived QR check-in session a teacher opens for one class. */
const attendanceSessionSchema = new mongoose.Schema(
  {
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'TeacherProfile', required: true },
    date: { type: Date, required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Mongo TTL cleanup once expired
attendanceSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);

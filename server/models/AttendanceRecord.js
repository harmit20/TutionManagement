const mongoose = require('mongoose');
const centrePlugin = require('../utils/centrePlugin');

const ATTENDANCE_STATUS = ['present', 'absent', 'late'];

const studentAttendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUS,
      required: true,
    },
  },
  { _id: false }
);

const attendanceRecordSchema = new mongoose.Schema(
  {
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherProfile',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    students: [studentAttendanceSchema],
    // Payout engine reads this to know which pricing rule to apply
    lectureStartTime: { type: String },
    lectureEndTime: { type: String },
    markedAt: {
      type: Date,
      default: Date.now,
    },
    markedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance record for same batch+date
attendanceRecordSchema.index({ batch: 1, date: 1 }, { unique: true });
attendanceRecordSchema.index({ teacher: 1, date: 1 }); // payout calculation query
attendanceRecordSchema.index({ date: 1 });

attendanceRecordSchema.plugin(centrePlugin);

module.exports = mongoose.model('AttendanceRecord', attendanceRecordSchema);

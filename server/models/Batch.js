const mongoose = require('mongoose');
const centrePlugin = require('../utils/centrePlugin');

const CLASS_LEVELS = ['11th', '12th', 'CET'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const scheduleSlotSchema = new mongoose.Schema(
  {
    day: { type: String, enum: DAYS, required: true },
    startTime: { type: String, required: true }, // "HH:MM" 24-hour
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    classLevel: {
      type: String,
      enum: CLASS_LEVELS,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    assignedTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherProfile',
      required: true,
    },
    classroom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
    },
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudentProfile',
      },
    ],
    schedule: [scheduleSlotSchema],
    maxCapacity: {
      type: Number,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

batchSchema.index({ classLevel: 1, subject: 1 });
batchSchema.index({ assignedTeacher: 1 });

batchSchema.plugin(centrePlugin);

module.exports = mongoose.model('Batch', batchSchema);

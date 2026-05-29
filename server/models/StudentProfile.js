const mongoose = require('mongoose');

const CLASS_LEVELS = ['11th', '12th', 'CET'];

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    enrollmentNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    dateOfBirth: {
      type: Date,
    },
    classLevel: {
      type: String,
      enum: CLASS_LEVELS,
      required: true,
    },
    parentName: {
      type: String,
      trim: true,
    },
    parentPhone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    batches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
      },
    ],
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

studentProfileSchema.index({ user: 1 });
studentProfileSchema.index({ enrollmentNumber: 1 });
studentProfileSchema.index({ classLevel: 1 });

module.exports = mongoose.model('StudentProfile', studentProfileSchema);

const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema(
  {
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Test',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
    },
    marksObtained: {
      type: Number,
      required: true,
      min: 0,
    },
    grade: {
      type: String,
      trim: true,
    },
    percentile: {
      type: Number,
      min: 0,
      max: 100,
    },
    remarks: {
      type: String,
      trim: true,
    },
    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// One result per student per test
testResultSchema.index({ test: 1, student: 1 }, { unique: true });
testResultSchema.index({ student: 1 });

module.exports = mongoose.model('TestResult', testResultSchema);

const mongoose = require('mongoose');
const centrePlugin = require('../utils/centrePlugin');

const testSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    passingMarks: {
      type: Number,
      min: 0,
    },
    duration: {
      type: Number, // in minutes
      min: 1,
    },
    description: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Test reminder cron queries by scheduledDate
testSchema.index({ batch: 1, scheduledDate: 1 });
testSchema.index({ scheduledDate: 1 });

testSchema.plugin(centrePlugin);

module.exports = mongoose.model('Test', testSchema);

const mongoose = require('mongoose');

const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolder: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, trim: true },
    bankName: { type: String, trim: true },
    upiId: { type: String, trim: true },
  },
  { _id: false }
);

const teacherProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    qualifications: [{ type: String, trim: true }],
    subjects: [{ type: String, trim: true }],
    assignedBatches: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
      },
    ],
    bankDetails: bankDetailsSchema,
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

teacherProfileSchema.index({ user: 1 });

module.exports = mongoose.model('TeacherProfile', teacherProfileSchema);

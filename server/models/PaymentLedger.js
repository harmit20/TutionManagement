const mongoose = require('mongoose');
const centrePlugin = require('../utils/centrePlugin');

const LEDGER_STATUS = ['pending', 'paid', 'on_hold'];

// Snapshot of the pricing rule at the time of calculation to preserve
// historical accuracy even if rates change later
const pricingSnapshotSchema = new mongoose.Schema(
  {
    ratePerLecture: Number,
    effectiveFrom: Date,
    effectiveTo: Date,
    pricingRuleId: { type: mongoose.Schema.Types.ObjectId, ref: 'PricingRule' },
  },
  { _id: false }
);

const ledgerLineSchema = new mongoose.Schema(
  {
    attendanceRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AttendanceRecord',
      required: true,
    },
    lectureDate: { type: Date, required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    rateApplied: { type: Number, required: true },
    pricingSnapshot: pricingSnapshotSchema,
  },
  { _id: false }
);

const paymentLedgerSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherProfile',
      required: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    lines: [ledgerLineSchema],
    totalLectures: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: LEDGER_STATUS,
      default: 'pending',
    },
    paidOn: { type: Date },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks: { type: String, trim: true },
  },
  { timestamps: true }
);

paymentLedgerSchema.index({ teacher: 1, month: 1, year: 1 }, { unique: true });
paymentLedgerSchema.index({ status: 1 });

paymentLedgerSchema.plugin(centrePlugin);

module.exports = mongoose.model('PaymentLedger', paymentLedgerSchema);

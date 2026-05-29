const mongoose = require('mongoose');

const FEE_STATUS = ['pending', 'paid', 'overdue', 'partial', 'waived'];
const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'cheque', 'online'];

const feeRecordSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudentProfile',
      required: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paidDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: FEE_STATUS,
      default: 'pending',
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    remarks: {
      type: String,
      trim: true,
    },
    // Month/year this fee covers — used for fee reminder cron
    forMonth: { type: Number, min: 1, max: 12 },
    forYear: { type: Number },
  },
  { timestamps: true }
);

feeRecordSchema.index({ student: 1, forMonth: 1, forYear: 1 });
feeRecordSchema.index({ status: 1, dueDate: 1 }); // cron job query
feeRecordSchema.index({ batch: 1 });

module.exports = mongoose.model('FeeRecord', feeRecordSchema);

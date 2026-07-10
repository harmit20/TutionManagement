const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    fee: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeRecord', required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, enum: ['razorpay', 'simulated'], required: true },
    orderId: { type: String, required: true },
    paymentId: { type: String },
    amount: { type: Number, required: true }, // rupees
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    error: { type: String },
  },
  { timestamps: true }
);

paymentTransactionSchema.index({ fee: 1 });
paymentTransactionSchema.index({ orderId: 1 });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);

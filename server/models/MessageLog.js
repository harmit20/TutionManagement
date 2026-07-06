const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema(
  {
    to: { type: String, required: true, trim: true },
    channel: { type: String, required: true, trim: true }, // whatsapp | sms | console
    template: { type: String, required: true, trim: true }, // e.g. absence_alert
    body: { type: String, required: true },
    status: { type: String, enum: ['sent', 'simulated', 'failed'], required: true },
    error: { type: String },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

messageLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('MessageLog', messageLogSchema);

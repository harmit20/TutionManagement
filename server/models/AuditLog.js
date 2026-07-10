const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Denormalised so entries stay readable even if the user is later removed
    actorName: {
      type: String,
      trim: true,
    },
    actorRole: {
      type: String,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true, // e.g. 'fee.collect', 'payout.markPaid', 'user.deactivate'
    },
    entityType: {
      type: String,
      required: true,
      trim: true, // e.g. 'FeeRecord', 'User'
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

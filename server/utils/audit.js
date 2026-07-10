const AuditLog = require('../models/AuditLog');

/**
 * Fire-and-forget audit trail entry. Never throws — a failed audit write
 * must not break the business operation it records.
 *
 *   audit(req, 'fee.collect', 'FeeRecord', record._id, { amountPaid: 500 });
 */
function audit(req, action, entityType, entityId, meta) {
  AuditLog.create({
    actor: req.user._id,
    actorName: req.user.name,
    actorRole: req.user.role,
    action,
    entityType,
    entityId,
    meta,
  }).catch((err) => console.error('[Audit] write failed:', err.message));
}

module.exports = { audit };

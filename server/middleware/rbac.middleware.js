const { PERMISSIONS } = require('../../shared/constants');

/**
 * permit('FEE_COLLECT') — passes if req.user.role is in PERMISSIONS.FEE_COLLECT.
 * Multiple keys are AND-ed: the user must satisfy every one.
 */
const permit = (...permissionKeys) => (req, res, next) => {
  const { role } = req.user ?? {};

  if (!role) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const denied = permissionKeys.find((key) => {
    const allowed = PERMISSIONS[key];
    return !allowed || !allowed.includes(role);
  });

  if (denied) {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }

  next();
};

/**
 * permitSelf(resolveOwnerId) — passes when:
 *   - the requester is an admin, OR
 *   - resolveOwnerId(req) returns the same userId as req.user._id
 *
 * resolveOwnerId is an async fn(req) → ObjectId | string
 * Example:
 *   permitSelf(req => FeeRecord.findById(req.params.id).select('student').then(r => r?.student))
 */
const permitSelf = (resolveOwnerId) => async (req, res, next) => {
  const { _id: userId, role } = req.user ?? {};

  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  if (role === 'admin') return next();

  try {
    const ownerId = await resolveOwnerId(req);
    if (ownerId?.toString() === userId.toString()) return next();
    return res.status(403).json({ message: 'Access denied' });
  } catch {
    return res.status(500).json({ message: 'Authorization check failed' });
  }
};

module.exports = { permit, permitSelf };

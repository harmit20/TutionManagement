const asyncHandler = require('../utils/asyncHandler');
const FCMToken = require('../models/FCMToken');
const User = require('../models/User');
const { sendToUsers, isConfigured } = require('../utils/fcm.util');

// ─── Token lifecycle ──────────────────────────────────────────────────────────

/**
 * Called by the PWA after the service worker obtains a registration token.
 * Upserts on the token string so refreshed tokens don't create duplicates.
 */
exports.registerToken = asyncHandler(async (req, res) => {
  const { token, deviceType } = req.body;
  if (!token) return res.status(400).json({ message: 'token is required' });

  await FCMToken.findOneAndUpdate(
    { token },
    {
      user: req.user._id,
      token,
      deviceType: deviceType || 'web',
      isActive: true,
      lastRefreshedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  res.json({ message: 'Token registered' });
});

/**
 * Called on logout so the device stops receiving pushes.
 * Scoped to req.user so one user can't revoke another's token.
 */
exports.revokeToken = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'token is required' });

  await FCMToken.findOneAndUpdate(
    { token, user: req.user._id },
    { isActive: false }
  );

  res.json({ message: 'Token revoked' });
});

// ─── Admin: manual push ───────────────────────────────────────────────────────

/**
 * Send a push to: specific userIds, all users of a role, or everyone.
 * Body: { title, body, link?, data?, userIds?, role? }
 */
exports.sendManual = asyncHandler(async (req, res) => {
  const { title, body, link, data, userIds, role } = req.body;
  if (!title || !body) {
    return res.status(400).json({ message: 'title and body are required' });
  }

  let targetIds;

  if (userIds?.length) {
    targetIds = userIds;
  } else if (role) {
    const users = await User.find({ role, isActive: true }).select('_id').lean();
    targetIds = users.map((u) => u._id);
  } else {
    const users = await User.find({ isActive: true }).select('_id').lean();
    targetIds = users.map((u) => u._id);
  }

  if (!targetIds.length) {
    return res.status(400).json({ message: 'No target users found' });
  }

  const result = await sendToUsers(targetIds, { title, body, link }, data ?? {});

  res.json({
    message: 'Push notifications dispatched',
    targetCount: targetIds.length,
    ...result,
  });
});

// ─── Admin: stats ─────────────────────────────────────────────────────────────

exports.getStats = asyncHandler(async (req, res) => {
  const [activeTokens, byDevice] = await Promise.all([
    FCMToken.countDocuments({ isActive: true }),
    FCMToken.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$deviceType', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    activeTokens,
    byDevice,
    firebaseConfigured: isConfigured(),
  });
});

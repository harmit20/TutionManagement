const mongoose = require('mongoose');

const DEVICE_TYPES = ['web', 'android', 'ios'];

const fcmTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    deviceType: {
      type: String,
      enum: DEVICE_TYPES,
      default: 'web',
    },
    // Cron jobs skip tokens that haven't been refreshed in 60 days (likely stale)
    lastRefreshedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

fcmTokenSchema.index({ user: 1 });
// Cron queries: fetch all active tokens for a set of users efficiently
fcmTokenSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model('FCMToken', fcmTokenSchema);

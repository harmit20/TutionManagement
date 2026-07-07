const mongoose = require('mongoose');
const centrePlugin = require('../utils/centrePlugin');

const announcementSchema = new mongoose.Schema(
  {
    // null batch = centre-wide announcement (admin only)
    batch: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

announcementSchema.index({ batch: 1, createdAt: -1 });
announcementSchema.index({ createdAt: -1 });

announcementSchema.plugin(centrePlugin);

module.exports = mongoose.model('Announcement', announcementSchema);

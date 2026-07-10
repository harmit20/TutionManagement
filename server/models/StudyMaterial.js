const mongoose = require('mongoose');
const centrePlugin = require('../utils/centrePlugin');

const FILE_TYPES = ['pdf', 'image', 'video', 'doc', 'link', 'other'];

const studyMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    fileType: {
      type: String,
      enum: FILE_TYPES,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    fileSizeBytes: {
      type: Number,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Service Worker caches this for offline access
    isCacheable: {
      type: Boolean,
      default: true,
    },
    // Soft delete — deleted materials are hidden from queries but retained
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

studyMaterialSchema.index({ batch: 1 });
studyMaterialSchema.index({ uploadedBy: 1 });

studyMaterialSchema.plugin(centrePlugin);

module.exports = mongoose.model('StudyMaterial', studyMaterialSchema);

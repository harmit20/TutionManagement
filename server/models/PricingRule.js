const mongoose = require('mongoose');

const CLASS_LEVELS = ['11th', '12th', 'CET'];

const pricingRuleSchema = new mongoose.Schema(
  {
    classLevel: {
      type: String,
      enum: CLASS_LEVELS,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    ratePerLecture: {
      type: Number,
      required: true,
      min: 0,
    },
    // effectiveTo: null means this is the currently active rule
    effectiveFrom: {
      type: Date,
      required: true,
    },
    effectiveTo: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Payout engine queries: classLevel + subject + date range overlap
pricingRuleSchema.index({ classLevel: 1, subject: 1, effectiveFrom: 1, effectiveTo: 1 });

module.exports = mongoose.model('PricingRule', pricingRuleSchema);

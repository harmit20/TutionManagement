const mongoose = require('mongoose');
const centrePlugin = require('../utils/centrePlugin');

const pricingRuleSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeacherProfile',
      required: true,
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

// Payout engine queries: teacher + date range overlap
pricingRuleSchema.index({ teacher: 1, effectiveFrom: 1, effectiveTo: 1 });

pricingRuleSchema.plugin(centrePlugin);

module.exports = mongoose.model('PricingRule', pricingRuleSchema);

const mongoose = require('mongoose');
const centrePlugin = require('../utils/centrePlugin');

const ENQUIRY_STATUS = ['new', 'follow_up', 'demo_scheduled', 'converted', 'lost'];
const ENQUIRY_SOURCE = ['walk_in', 'phone', 'referral', 'online', 'other'];

const noteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, trim: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    classLevel: { type: String, enum: ['11th', '12th', 'CET'], required: true },
    subjectInterest: { type: String, trim: true },
    source: { type: String, enum: ENQUIRY_SOURCE, default: 'walk_in' },
    status: { type: String, enum: ENQUIRY_STATUS, default: 'new' },
    nextFollowUpAt: { type: Date },
    notes: [noteSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    convertedStudent: { type: mongoose.Schema.Types.ObjectId, ref: 'StudentProfile' },
  },
  { timestamps: true }
);

enquirySchema.index({ status: 1, nextFollowUpAt: 1 });
enquirySchema.index({ createdAt: -1 });

enquirySchema.plugin(centrePlugin);

module.exports = mongoose.model('Enquiry', enquirySchema);
module.exports.ENQUIRY_STATUS = ENQUIRY_STATUS;
module.exports.ENQUIRY_SOURCE = ENQUIRY_SOURCE;

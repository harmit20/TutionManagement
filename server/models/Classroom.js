const mongoose = require('mongoose');
const centrePlugin = require('../utils/centrePlugin');

const classroomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    facilities: [{ type: String, trim: true }],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

classroomSchema.plugin(centrePlugin);

module.exports = mongoose.model('Classroom', classroomSchema);

const mongoose = require('mongoose');

/**
 * Adds an indexed `centre` ref to a schema.
 *
 * Multi-branch groundwork: every scoped record carries the branch it
 * belongs to (null = the default/only centre). Query-level isolation is
 * enabled per-controller when a deployment actually runs multiple
 * branches — having the field on day one makes that a filter change
 * instead of a data migration.
 */
module.exports = function centrePlugin(schema) {
  schema.add({
    centre: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Centre',
      default: null,
      index: true,
    },
  });
};

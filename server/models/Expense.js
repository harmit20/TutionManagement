const mongoose = require('mongoose');

const EXPENSE_CATEGORIES = ['rent', 'utilities', 'salary', 'marketing', 'supplies', 'maintenance', 'other'];

const expenseSchema = new mongoose.Schema(
  {
    category: { type: String, enum: EXPENSE_CATEGORIES, required: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    description: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.EXPENSE_CATEGORIES = EXPENSE_CATEGORIES;

const asyncHandler = require('../utils/asyncHandler');
const Expense = require('../models/Expense');
const { audit } = require('../utils/audit');

const monthRange = (month, year) => ({
  $gte: new Date(year, month - 1, 1),
  $lte: new Date(year, month, 0, 23, 59, 59),
});

exports.createExpense = asyncHandler(async (req, res) => {
  const { category, amount, date, description } = req.body;
  if (!category || amount == null || !date) {
    return res.status(400).json({ message: 'category, amount, and date are required' });
  }

  const expense = await Expense.create({ category, amount, date, description, createdBy: req.user._id });
  audit(req, 'expense.create', 'Expense', expense._id, { category, amount });
  res.status(201).json(expense);
});

exports.listExpenses = asyncHandler(async (req, res) => {
  const { month, year, category, page = 1, limit = 20 } = req.query;
  const filter = { isDeleted: { $ne: true } };
  if (month && year) filter.date = monthRange(Number(month), Number(year));
  if (category) filter.category = category;

  const [expenses, total, agg] = await Promise.all([
    Expense.find(filter)
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Expense.countDocuments(filter),
    Expense.aggregate([
      { $match: { ...filter } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
    ]),
  ]);

  res.json({
    expenses,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    totalsByCategory: agg,
    totalAmount: agg.reduce((s, a) => s + a.total, 0),
  });
});

exports.deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense || expense.isDeleted) return res.status(404).json({ message: 'Expense not found' });

  expense.isDeleted = true;
  await expense.save();
  audit(req, 'expense.delete', 'Expense', expense._id, { category: expense.category, amount: expense.amount });
  res.json({ message: 'Expense deleted' });
});

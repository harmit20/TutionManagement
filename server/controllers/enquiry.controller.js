const asyncHandler = require('../utils/asyncHandler');
const Enquiry = require('../models/Enquiry');
const { audit } = require('../utils/audit');

exports.createEnquiry = asyncHandler(async (req, res) => {
  const { name, phone, email, classLevel, subjectInterest, source, nextFollowUpAt, note } = req.body;
  if (!name || !phone || !classLevel) {
    return res.status(400).json({ message: 'name, phone, and classLevel are required' });
  }

  const enquiry = await Enquiry.create({
    name,
    phone,
    email,
    classLevel,
    subjectInterest,
    source,
    nextFollowUpAt,
    notes: note ? [{ text: note, by: req.user._id }] : [],
    createdBy: req.user._id,
  });

  audit(req, 'enquiry.create', 'Enquiry', enquiry._id, { name, phone, classLevel });
  res.status(201).json(enquiry);
});

exports.listEnquiries = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { phone: { $regex: search, $options: 'i' } },
  ];

  const [enquiries, total] = await Promise.all([
    Enquiry.find(filter)
      .populate('createdBy', 'name')
      .sort({ nextFollowUpAt: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit)),
    Enquiry.countDocuments(filter),
  ]);

  res.json({ enquiries, total, page: Number(page), pages: Math.ceil(total / limit) });
});

exports.updateEnquiry = asyncHandler(async (req, res) => {
  const { status, nextFollowUpAt, note, convertedStudent } = req.body;
  const enquiry = await Enquiry.findById(req.params.id);
  if (!enquiry) return res.status(404).json({ message: 'Enquiry not found' });

  if (status) enquiry.status = status;
  if (nextFollowUpAt !== undefined) enquiry.nextFollowUpAt = nextFollowUpAt || undefined;
  if (convertedStudent) enquiry.convertedStudent = convertedStudent;
  if (note) enquiry.notes.push({ text: note, by: req.user._id });
  await enquiry.save();

  audit(req, 'enquiry.update', 'Enquiry', enquiry._id, { status, note: !!note });
  res.json(enquiry);
});

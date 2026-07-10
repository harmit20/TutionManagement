const asyncHandler = require('../utils/asyncHandler');
const Announcement = require('../models/Announcement');
const Batch = require('../models/Batch');
const StudentProfile = require('../models/StudentProfile');
const TeacherProfile = require('../models/TeacherProfile');
const FCMToken = require('../models/FCMToken');
const { sendMulticast, deactivateTokens } = require('../utils/fcm.util');
const { audit } = require('../utils/audit');

/** Push the announcement to its audience (batch students, or everyone). */
async function pushAnnouncement(announcement, batch) {
  try {
    const students = batch
      ? await StudentProfile.find({ batches: batch._id }).select('user')
      : await StudentProfile.find().select('user');

    const userIds = students.map((s) => s.user).filter(Boolean);
    const tokenDocs = await FCMToken.find({ user: { $in: userIds }, isActive: true }).select('token').lean();
    if (!tokenDocs.length) return;

    const result = await sendMulticast(
      tokenDocs.map((t) => t.token),
      { title: `📢 ${announcement.title}`, body: announcement.message, link: '/student/announcements' },
      { type: 'announcement', announcementId: announcement._id.toString() }
    );
    if (result.failedTokens.length) await deactivateTokens(result.failedTokens);
  } catch (err) {
    console.error('[Announcement push] failed:', err.message);
  }
}

/** Teacher: announce to one of their own batches. Admin: any batch or centre-wide. */
exports.createAnnouncement = asyncHandler(async (req, res) => {
  const { batchId, title, message } = req.body;
  if (!title || !message) return res.status(400).json({ message: 'title and message are required' });

  let batch = null;
  if (batchId) {
    batch = await Batch.findById(batchId).select('name assignedTeacher');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    if (req.user.role === 'teacher') {
      const profile = await TeacherProfile.findOne({ user: req.user._id }).select('_id');
      if (!profile || batch.assignedTeacher?.toString() !== profile._id.toString()) {
        return res.status(403).json({ message: 'You can only announce to your own batches' });
      }
    }
  } else if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admin can make centre-wide announcements' });
  }

  const announcement = await Announcement.create({
    batch: batchId || null,
    title,
    message,
    createdBy: req.user._id,
  });

  audit(req, 'announcement.create', 'Announcement', announcement._id, { batchId: batchId || 'all', title });
  pushAnnouncement(announcement, batch);

  res.status(201).json(announcement);
});

/** List announcements relevant to the caller. */
exports.listAnnouncements = asyncHandler(async (req, res) => {
  let filter = {};

  if (req.user.role === 'student') {
    const profile = await StudentProfile.findOne({ user: req.user._id }).select('batches');
    if (!profile) return res.status(404).json({ message: 'Student profile not found' });
    filter = { $or: [{ batch: { $in: profile.batches } }, { batch: null }] };
  } else if (req.user.role === 'teacher') {
    const profile = await TeacherProfile.findOne({ user: req.user._id }).select('_id');
    const batches = await Batch.find({ assignedTeacher: profile?._id }).select('_id');
    filter = { $or: [{ batch: { $in: batches.map((b) => b._id) } }, { batch: null }] };
  }
  // admin/receptionist: everything

  const announcements = await Announcement.find(filter)
    .populate('batch', 'name')
    .populate('createdBy', 'name role')
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(announcements);
});

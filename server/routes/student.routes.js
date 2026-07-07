const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const feeCtrl = require('../controllers/fee.controller');
const attendanceCtrl = require('../controllers/attendance.controller');
const testCtrl = require('../controllers/test.controller');
const materialCtrl = require('../controllers/studyMaterial.controller');
const timetableCtrl = require('../controllers/timetable.controller');

router.use(protect);

// Profile (own)
router.get('/profile', async (req, res) => {
  const StudentProfile = require('../models/StudentProfile');
  const profile = await StudentProfile.findOne({ user: req.user._id })
    .populate('user', 'name email phone')
    .populate('batches', 'name classLevel subject');
  if (!profile) return res.status(404).json({ message: 'Student profile not found' });
  res.json(profile);
});

// Fees (own)
router.get('/fees', feeCtrl.getMyFees);

// Online fee payment (own)
const paymentCtrl = require('../controllers/payment.controller');
router.post('/fees/:id/pay/initiate', paymentCtrl.initiatePayment);
router.post('/fees/:id/pay/confirm', paymentCtrl.confirmPayment);

// Attendance (own)
router.get('/attendance', attendanceCtrl.getMyAttendance);

// Tests & Results (own)
router.get('/tests', testCtrl.getMyTests);
router.get('/results', testCtrl.getMyResults);

// Study Materials (own batches)
router.get('/materials', materialCtrl.getMyMaterials);

// Timetable (own batches)
router.get('/timetable', async (req, res) => {
  const StudentProfile = require('../models/StudentProfile');
  const Batch = require('../models/Batch');
  const profile = await StudentProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Student profile not found' });

  const batches = await Batch.find({ _id: { $in: profile.batches }, isActive: true })
    .select('name classLevel subject schedule classroom')
    .populate('classroom', 'name');

  const slots = batches.flatMap((b) =>
    b.schedule.map((s) => ({
      batchId: b._id,
      batchName: b.name,
      classLevel: b.classLevel,
      subject: b.subject,
      classroom: b.classroom,
      day: s.day,
      startTime: s.startTime,
      endTime: s.endTime,
    }))
  );

  res.json(slots);
});

module.exports = router;

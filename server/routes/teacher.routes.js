const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const attendanceCtrl = require('../controllers/attendance.controller');
const payoutCtrl = require('../controllers/payout.controller');
const testCtrl = require('../controllers/test.controller');
const materialCtrl = require('../controllers/studyMaterial.controller');
const batchCtrl = require('../controllers/batch.controller');
const timetableCtrl = require('../controllers/timetable.controller');

// All teacher routes require a valid JWT; role is implicitly 'teacher'
// (enforced by mounting only on /api/teacher and the fact that non-teachers
//  have no profile — controllers return 404 if TeacherProfile is missing)
router.use(protect);

// Batches assigned to this teacher
router.get('/batches', (req, res, next) => {
  // Inject teacherId filter via query so the shared controller handles it
  req.query.teacherUser = req.user._id.toString();
  next();
}, async (req, res) => {
  const TeacherProfile = require('../models/TeacherProfile');
  const Batch = require('../models/Batch');
  const profile = await TeacherProfile.findOne({ user: req.user._id });
  if (!profile) return res.status(404).json({ message: 'Teacher profile not found' });
  const batches = await Batch.find({ assignedTeacher: profile._id, isActive: true })
    .populate('classroom', 'name')
    .sort({ name: 1 });
  res.json(batches);
});
router.get('/batches/:id/students', batchCtrl.getBatchStudents);

// Attendance
router.post('/attendance', attendanceCtrl.markAttendance);
router.get('/attendance/:batchId', attendanceCtrl.getAttendanceByBatch);
router.patch('/attendance/:id', attendanceCtrl.updateAttendance);

// Timetable (read-only)
router.get('/timetable', timetableCtrl.getFullTimetable);

// Payout ledger (own)
router.get('/payouts', payoutCtrl.getMyPayouts);
router.get('/payouts/:id', payoutCtrl.getMyPayoutDetail);

// Tests for assigned batches
router.get('/tests', testCtrl.getMyBatchTests);
router.post('/tests/:testId/results', testCtrl.enterResults);
router.get('/tests/:testId/results', testCtrl.listResults);

// Study materials
router.get('/materials', materialCtrl.getMyBatchMaterials);
router.post('/materials', materialCtrl.uploadMiddleware, materialCtrl.uploadMaterial);
router.delete('/materials/:id', materialCtrl.deleteMaterial);

module.exports = router;

const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { permit } = require('../middleware/rbac.middleware');
const enrollCtrl = require('../controllers/enrollment.controller');
const feeCtrl = require('../controllers/fee.controller');
const batchCtrl = require('../controllers/batch.controller');
const timetableCtrl = require('../controllers/timetable.controller');
const studentSummaryCtrl = require('../controllers/studentSummary.controller');

router.use(protect);

// Batches (read-only for enrollment forms)
router.get('/batches', batchCtrl.listBatches);
router.get('/batches/:id', batchCtrl.getBatch);
router.get('/batches/:id/students', batchCtrl.getBatchStudents);

// Enquiries (pre-enrollment leads)
const enquiryCtrl = require('../controllers/enquiry.controller');
router.get('/enquiries', permit('ENROLLMENT_MANAGE'), enquiryCtrl.listEnquiries);
router.post('/enquiries', permit('ENROLLMENT_MANAGE'), enquiryCtrl.createEnquiry);
router.patch('/enquiries/:id', permit('ENROLLMENT_MANAGE'), enquiryCtrl.updateEnquiry);

// Student search + full profile summary
router.get('/students/search', permit('ENROLLMENT_MANAGE'), studentSummaryCtrl.searchStudents);
router.get('/students/:id/summary', permit('ENROLLMENT_MANAGE'), studentSummaryCtrl.getStudentSummary);
router.get('/students/:id/report-card', permit('ENROLLMENT_MANAGE'), studentSummaryCtrl.getReportCard);

// Enrollments
router.get('/students', permit('ENROLLMENT_MANAGE'), enrollCtrl.listStudentsForEnrollment);
router.post('/enrollments', permit('ENROLLMENT_MANAGE'), enrollCtrl.enrollStudent);
router.delete('/enrollments/:studentId/:batchId', permit('ENROLLMENT_MANAGE'), enrollCtrl.unenrollStudent);

// Fee collection
router.get('/fees', permit('FEE_COLLECT'), feeCtrl.listFees);
router.post('/fees', permit('FEE_COLLECT'), feeCtrl.createFeeRecord);
router.patch('/fees/:id/collect', permit('FEE_COLLECT'), feeCtrl.collectPayment);
router.get('/fees/:id/receipt', permit('FEE_COLLECT'), feeCtrl.getReceipt);

// Timetable (read + schedule management)
router.get('/timetable', timetableCtrl.getFullTimetable);
router.get('/timetable/batches/:batchId', timetableCtrl.getBatchSchedule);
router.get('/timetable/conflict-check', timetableCtrl.checkConflict);
router.post('/timetable/batches/:batchId/slots', permit('TIMETABLE_MANAGE'), timetableCtrl.addScheduleSlot);
router.delete('/timetable/batches/:batchId/slots/:slotIndex', permit('TIMETABLE_MANAGE'), timetableCtrl.removeScheduleSlot);

module.exports = router;

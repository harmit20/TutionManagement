const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { permit } = require('../middleware/rbac.middleware');
const adminCtrl = require('../controllers/admin.controller');
const batchCtrl = require('../controllers/batch.controller');
const payoutCtrl = require('../controllers/payout.controller');
const authCtrl = require('../controllers/auth.controller');
const studentSummaryCtrl = require('../controllers/studentSummary.controller');

// All admin routes require authentication + admin role
router.use(protect, permit('USER_READ_ALL'));

// Dashboard
router.get('/dashboard', adminCtrl.getDashboard);

// Users
router.get('/users', adminCtrl.listUsers);
router.post('/users', permit('USER_CREATE'), authCtrl.createUser);
router.get('/users/:id', adminCtrl.getUser);
router.patch('/users/:id', permit('USER_UPDATE'), authCtrl.updateUser);
router.patch('/users/:id/profile', permit('USER_UPDATE'), adminCtrl.updateUserProfile);
router.patch('/users/:id/password', permit('USER_UPDATE'), authCtrl.changePassword);

// Batches
router.get('/batches', batchCtrl.listBatches);
router.post('/batches', batchCtrl.createBatch);
router.get('/batches/:id', batchCtrl.getBatch);
router.patch('/batches/:id', batchCtrl.updateBatch);

// Classrooms
router.get('/classrooms', adminCtrl.listClassrooms);
router.post('/classrooms', adminCtrl.createClassroom);
router.patch('/classrooms/:id', adminCtrl.updateClassroom);

// Pricing Rules
router.get('/pricing-rules', permit('PRICING_MANAGE'), adminCtrl.listPricingRules);
router.post('/pricing-rules', permit('PRICING_MANAGE'), adminCtrl.createPricingRule);

// Payouts
router.get('/payouts', permit('PAYOUT_MANAGE'), payoutCtrl.listPayouts);
router.post('/payouts/calculate', permit('PAYOUT_MANAGE'), payoutCtrl.calculatePayout);
router.patch('/payouts/:id/pay', permit('PAYOUT_MANAGE'), payoutCtrl.markPaid);

// Reports
router.get('/reports/fees', adminCtrl.feeReport);
router.get('/reports/attendance', adminCtrl.attendanceReport);

// Audit log
router.get('/audit-logs', adminCtrl.listAuditLogs);

// Outbound message log (WhatsApp/SMS alerts)
router.get('/message-logs', adminCtrl.listMessageLogs);

// Parent → children linking
router.patch('/parents/:userId/children', permit('USER_UPDATE'), adminCtrl.linkParentChildren);

// Student search + full profile summary
router.get('/students/search', studentSummaryCtrl.searchStudents);
router.get('/students/:id/summary', studentSummaryCtrl.getStudentSummary);
router.get('/students/:id/report-card', studentSummaryCtrl.getReportCard);

module.exports = router;

const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { permit } = require('../middleware/rbac.middleware');
const parentCtrl = require('../controllers/parent.controller');
const studentSummaryCtrl = require('../controllers/studentSummary.controller');

router.use(protect, permit('PARENT_VIEW_CHILDREN'));

const paymentCtrl = require('../controllers/payment.controller');

router.get('/children', parentCtrl.listChildren);
router.get('/children/:id/summary', parentCtrl.requireOwnChild, studentSummaryCtrl.getStudentSummary);

// Pay a child's fee online (ownership enforced inside the controller)
router.post('/fees/:id/pay/initiate', paymentCtrl.initiatePayment);
router.post('/fees/:id/pay/confirm', paymentCtrl.confirmPayment);

module.exports = router;

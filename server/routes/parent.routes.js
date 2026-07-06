const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { permit } = require('../middleware/rbac.middleware');
const parentCtrl = require('../controllers/parent.controller');
const studentSummaryCtrl = require('../controllers/studentSummary.controller');

router.use(protect, permit('PARENT_VIEW_CHILDREN'));

router.get('/children', parentCtrl.listChildren);
router.get('/children/:id/summary', parentCtrl.requireOwnChild, studentSummaryCtrl.getStudentSummary);

module.exports = router;

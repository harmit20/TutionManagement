const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { permit } = require('../middleware/rbac.middleware');
const ctrl = require('../controllers/timetable.controller');

router.use(protect);

// All authenticated users can read
router.get('/', ctrl.getFullTimetable);
router.get('/batches/:batchId', ctrl.getBatchSchedule);
router.get('/conflict-check', permit('TIMETABLE_MANAGE'), ctrl.checkConflict);

// Write access: admin + receptionist
router.post('/batches/:batchId/slots', permit('TIMETABLE_MANAGE'), ctrl.addScheduleSlot);
router.delete('/batches/:batchId/slots/:slotIndex', permit('TIMETABLE_MANAGE'), ctrl.removeScheduleSlot);

module.exports = router;

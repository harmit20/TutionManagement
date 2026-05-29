const router = require('express').Router();
const { protect } = require('../middleware/auth.middleware');
const { permit } = require('../middleware/rbac.middleware');
const ctrl = require('../controllers/notification.controller');

router.use(protect);

// Any authenticated user registers/revokes their own device token
router.post('/token', ctrl.registerToken);
router.post('/token/revoke', ctrl.revokeToken);

// Admin only: manual push + stats
router.post('/send', permit('NOTIFICATION_SEND'), ctrl.sendManual);
router.get('/stats', permit('NOTIFICATION_SEND'), ctrl.getStats);

module.exports = router;

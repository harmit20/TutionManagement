const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { permit } = require('../middleware/rbac.middleware');

// Public
router.post('/login', ctrl.login);
router.post('/refresh', ctrl.refresh);

// Authenticated
router.post('/logout', protect, ctrl.logout);
router.get('/me', protect, ctrl.getMe);

// Admin-only user management
router.post('/users', protect, permit('USER_CREATE'), ctrl.createUser);
router.patch('/users/:id', protect, permit('USER_UPDATE'), ctrl.updateUser);
router.patch('/users/:id/password', protect, permit('USER_UPDATE'), ctrl.changePassword);

module.exports = router;

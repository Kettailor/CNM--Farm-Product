const router = require('express').Router();
const authMiddleware = require('../middleware/auth.middleware');

router.use('/auth', require('./auth.routes'));
router.use(authMiddleware);
router.use('/users', require('./users.routes'));
router.use('/projects', require('./projects.routes'));
router.use('/tasks', require('./tasks.routes'));
router.use('/resources', require('./resources.routes'));
router.use('/reports', require('./reports.routes'));

module.exports = router;

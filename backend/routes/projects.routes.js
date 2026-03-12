const router = require('express').Router();
const controller = require('../controllers/projects.controller');
const allowRoles = require('../middleware/rbac.middleware');

router.get('/', controller.listProjects);
router.post('/', allowRoles('ADMIN', 'PROJECT_MANAGER'), controller.createProject);

module.exports = router;

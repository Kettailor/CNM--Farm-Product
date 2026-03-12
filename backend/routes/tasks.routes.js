const router = require('express').Router();
const controller = require('../controllers/tasks.controller');
const allowRoles = require('../middleware/rbac.middleware');

router.post('/', allowRoles('PROJECT_MANAGER', 'SUPERVISOR'), controller.createTask);
router.get('/project/:projectId', controller.listTasks);
router.patch('/:taskId/progress', allowRoles('PROJECT_MANAGER', 'SUPERVISOR', 'WORKER'), controller.updateProgress);
router.patch('/:taskId/complete', allowRoles('WORKER', 'SUPERVISOR', 'PROJECT_MANAGER'), controller.markCompleted);
router.post('/:taskId/resources', allowRoles('PROJECT_MANAGER', 'SUPERVISOR'), controller.assignResource);
router.post('/:taskId/assign-user', allowRoles('PROJECT_MANAGER', 'SUPERVISOR'), controller.assignUser);
router.post('/:taskId/dependencies', allowRoles('PROJECT_MANAGER', 'SUPERVISOR'), controller.addDependency);

module.exports = router;

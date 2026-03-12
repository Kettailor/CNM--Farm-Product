const router = require('express').Router();
const controller = require('../controllers/resources.controller');
const allowRoles = require('../middleware/rbac.middleware');

router.post('/', allowRoles('ADMIN', 'PROJECT_MANAGER'), controller.createResource);
router.get('/workload', controller.getWorkload);

module.exports = router;

const router = require('express').Router();
const controller = require('../controllers/users.controller');
const allowRoles = require('../middleware/rbac.middleware');

router.get('/', allowRoles('ADMIN'), controller.listUsers);

module.exports = router;

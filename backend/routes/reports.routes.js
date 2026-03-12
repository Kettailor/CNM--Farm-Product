const router = require('express').Router();
const controller = require('../controllers/reports.controller');

router.get('/dashboard', controller.dashboard);

module.exports = router;

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');

// GET /api/dashboard/monitoring atau GET /api/dashboard/stats
router.get('/monitoring', dashboardController.getMonitoringStats);
router.get('/stats', dashboardController.getMonitoringStats);
router.get('/', dashboardController.getMonitoringStats);

module.exports = router;

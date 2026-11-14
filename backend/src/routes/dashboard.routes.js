const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth, requireRole('Super Admin', 'Admin', 'Area Admin', 'Divisi Teknis', 'Teknis'));

// GET /api/dashboard/monitoring atau GET /api/dashboard/stats
router.get('/monitoring', dashboardController.getMonitoringStats);
router.get('/stats', dashboardController.getMonitoringStats);
router.get('/', dashboardController.getMonitoringStats);

module.exports = router;

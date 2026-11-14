const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth, requireRole('Super Admin', 'Admin', 'Area Admin', 'Divisi Teknis', 'Teknis'));

router.get('/meta', reportController.getReportMeta);
router.get('/:id', reportController.getReportById);
router.get('/', reportController.getAllReports);

module.exports = router;

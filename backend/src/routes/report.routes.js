const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');

router.get('/meta', reportController.getReportMeta);
router.get('/:id', reportController.getReportById);
router.get('/', reportController.getAllReports);

module.exports = router;

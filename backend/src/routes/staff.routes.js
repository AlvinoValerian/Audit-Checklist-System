const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

const MANAGER_ROLES = ['Super Admin', 'Admin', 'Area Admin', 'Divisi Teknis', 'Teknis'];
const MOBILE_AND_MANAGER_ROLES = ['Staff', 'Auditor Lapangan', ...MANAGER_ROLES];

router.use(requireAuth);

// Mobile Staff & Manager Preview Routes (harus di atas /:id)
router.get('/my-schedules', requireRole(...MOBILE_AND_MANAGER_ROLES), staffController.getMySchedules);
router.get('/history', requireRole(...MOBILE_AND_MANAGER_ROLES), staffController.getMyHistory);
router.get('/schedules/:id', requireRole(...MOBILE_AND_MANAGER_ROLES), staffController.getStaffScheduleDetail);
router.post('/schedules/:id/submit', requireRole(...MOBILE_AND_MANAGER_ROLES), staffController.submitStaffAudit);
router.get('/reports/:id', requireRole(...MOBILE_AND_MANAGER_ROLES), staffController.getReportDetail);

// Staff Management CRUD (Hanya Admin / Super Admin / Divisi Teknis)
router.get('/', requireRole(...MANAGER_ROLES), staffController.getAllStaff);
router.get('/:id', requireRole(...MANAGER_ROLES), staffController.getStaffById);
router.post('/', requireRole(...MANAGER_ROLES), staffController.createStaff);
router.put('/:id', requireRole(...MANAGER_ROLES), staffController.updateStaff);
router.patch('/:id/restore', requireRole(...MANAGER_ROLES), staffController.restoreStaff);
router.patch('/:id/status', requireRole(...MANAGER_ROLES), staffController.toggleStatus);
router.delete('/:id', requireRole(...MANAGER_ROLES), staffController.deleteStaff);

module.exports = router;

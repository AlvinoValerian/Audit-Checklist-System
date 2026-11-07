const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staff.controller');

// GET /api/staff - Ambil semua staf dengan filter workspace / store / status / search
router.get('/', staffController.getAllStaff);

// GET /api/staff/my-schedules - Ambil jadwal audit harian staff (Mobile UI)
router.get('/my-schedules', staffController.getMySchedules);

// GET /api/staff/history - Ambil riwayat audit checklist staff realtime dari database
router.get('/history', staffController.getMyHistory);

// GET /api/staff/schedules/:id - Ambil detail jadwal & butir pertanyaan checklist
router.get('/schedules/:id', staffController.getStaffScheduleDetail);

// POST /api/staff/schedules/:id/submit - Serahkan laporan audit checklist staf
router.post('/schedules/:id/submit', staffController.submitStaffAudit);

// GET /api/staff/reports/:id - Ambil detail laporan audit checklist yang telah diserahkan
router.get('/reports/:id', staffController.getReportDetail);

// GET /api/staff/:id - Ambil detail staf
router.get('/:id', staffController.getStaffById);

// POST /api/staff - Tambah staf baru
router.post('/', staffController.createStaff);

// PUT /api/staff/:id - Update data staf
router.put('/:id', staffController.updateStaff);

// PATCH /api/staff/:id/restore - Aktifkan kembali staf (restore dari soft-delete)
router.patch('/:id/restore', staffController.restoreStaff);

// PATCH /api/staff/:id/status - Toggle status staf
router.patch('/:id/status', staffController.toggleStatus);

// DELETE /api/staff/:id - Soft-delete atau permanent delete
router.delete('/:id', staffController.deleteStaff);

module.exports = router;

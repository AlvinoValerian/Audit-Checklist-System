const express = require('express');
const router = express.Router();
const holidayController = require('../controllers/holiday.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth, requireRole('Super Admin', 'Admin', 'Area Admin', 'Divisi Teknis', 'Teknis'));

// GET /api/holidays - Ambil semua libur toko
router.get('/', holidayController.getAllHolidays);

// POST /api/holidays - Tambah libur toko baru (single atau batch)
router.post('/', holidayController.createHoliday);

// PUT /api/holidays/:id - Update libur toko
router.put('/:id', holidayController.updateHoliday);

// PATCH /api/holidays/:id/restore - Pulihkan libur yang dibatalkan
router.patch('/:id/restore', holidayController.restoreHoliday);

// DELETE /api/holidays/:id - Soft-delete (Dibatalkan) atau permanent delete
router.delete('/:id', holidayController.deleteHoliday);

module.exports = router;

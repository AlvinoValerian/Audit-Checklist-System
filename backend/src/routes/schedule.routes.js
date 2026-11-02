const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');

// GET /api/schedules - Daftar seluruh jadwal audit
router.get('/', scheduleController.getAllSchedules);

// GET /api/schedules/:id - Detail jadwal audit
router.get('/:id', scheduleController.getScheduleById);

// POST /api/schedules - Buat jadwal baru (single atau batch)
router.post('/', scheduleController.createSchedule);

// PUT /api/schedules/:id - Update jadwal audit
router.put('/:id', scheduleController.updateSchedule);

// DELETE /api/schedules/:id - Hapus / Batalkan jadwal audit (soft delete default, ?permanent=true untuk hapus permanen)
router.delete('/:id', scheduleController.deleteSchedule);

module.exports = router;

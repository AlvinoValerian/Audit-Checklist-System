const express = require('express');
const router = express.Router();
const teknisController = require('../controllers/teknis.controller');

// GET /api/teknis/stats - Statistik teknis
router.get('/stats', teknisController.getTeknisStats);

// GET /api/teknis - List semua user teknis
router.get('/', teknisController.getAllTeknis);

// GET /api/teknis/:id - Detail user teknis
router.get('/:id', teknisController.getTeknisById);

// POST /api/teknis - Tambah user teknis baru
router.post('/', teknisController.createTeknis);

// PUT /api/teknis/:id - Edit user teknis
router.put('/:id', teknisController.updateTeknis);

// DELETE /api/teknis/:id - Soft delete user teknis
router.delete('/:id', teknisController.deleteTeknis);

// PATCH /api/teknis/:id/restore - Restore user teknis
router.patch('/:id/restore', teknisController.restoreTeknis);

module.exports = router;

const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth, requireRole('Super Admin', 'Admin', 'Area Admin', 'Divisi Teknis', 'Teknis'));

// GET /api/stores - List semua toko (dengan filter workspace, status, search)
router.get('/', storeController.getAllStores);

// GET /api/stores/:id - Detail toko
router.get('/:id', storeController.getStoreById);

// POST /api/stores - Tambah toko baru
router.post('/', storeController.createStore);

// PUT /api/stores/:id - Update toko
router.put('/:id', storeController.updateStore);

// DELETE /api/stores/:id - Hapus / Nonaktifkan toko (soft-delete / permanent)
router.delete('/:id', storeController.deleteStore);

module.exports = router;

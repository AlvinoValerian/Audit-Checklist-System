const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');

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

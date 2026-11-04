const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/gallery.controller');

// GET /api/gallery
router.get('/', galleryController.getAllGalleryLogs);

// GET /api/gallery/stores
router.get('/stores', galleryController.getGalleryStores);

// GET /api/gallery/stats
router.get('/stats', galleryController.getGalleryStats);

module.exports = router;

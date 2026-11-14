const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth, requireRole('Super Admin', 'Admin', 'Area Admin', 'Divisi Teknis', 'Teknis'));

// GET /api/templates/stats - Statistik template
router.get('/stats', templateController.getTemplateStats);

// GET /api/templates - Daftar seluruh template (dengan filter search, status, storeId, workspaceId)
router.get('/', templateController.getAllTemplates);

// GET /api/templates/:id - Detail 1 template
router.get('/:id', templateController.getTemplateById);

// POST /api/templates - Buat template baru beserta kategori & tugas
router.post('/', templateController.createTemplate);

// PUT /api/templates/:id - Update template beserta kategori & tugas
router.put('/:id', templateController.updateTemplate);

// PATCH /api/templates/:id/status - Toggle / Ubah status template (Aktif / Nonaktif)
router.patch('/:id/status', templateController.toggleStatus);

// DELETE /api/templates/:id - Hapus template (soft delete default, ?permanent=true untuk permanen)
router.delete('/:id', templateController.deleteTemplate);

module.exports = router;

const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspace.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

router.use(requireAuth);

// Workspace Routes
router.get(
  '/',
  requireRole('Super Admin', 'Divisi Teknis', 'Teknis', 'Admin', 'Area Admin'),
  workspaceController.getAllWorkspaces
);
router.get(
  '/:id',
  requireRole('Super Admin', 'Divisi Teknis', 'Teknis', 'Admin', 'Area Admin'),
  workspaceController.getWorkspaceById
);
router.post(
  '/',
  requireRole('Super Admin', 'Divisi Teknis', 'Teknis'),
  workspaceController.createWorkspace
);
router.put(
  '/:id',
  requireRole('Super Admin', 'Divisi Teknis', 'Teknis'),
  workspaceController.updateWorkspace
);
router.delete(
  '/:id',
  requireRole('Super Admin', 'Divisi Teknis', 'Teknis'),
  workspaceController.deleteWorkspace
);

module.exports = router;

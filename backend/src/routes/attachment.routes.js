const express = require('express');
const router = express.Router();
const attachmentController = require('../controllers/attachment.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.use(requireAuth);

router.get('/:id/image', attachmentController.getAttachmentImage);
router.get('/:id', attachmentController.getAttachmentImage);

module.exports = router;

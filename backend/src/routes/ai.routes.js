const express = require('express');
const router = express.Router();
const AIController = require('../controllers/ai.controller');

// Route untuk mengambil sesi chat aktif pengguna
router.get('/session', AIController.getActiveSession);

// Route untuk mengirim pertanyaan ke AI
router.post('/ask', AIController.handleAskAI);

// Route untuk mereset sesi chat (arsip sesi lama dan mulai baru)
router.post('/reset', AIController.handleResetSession);

module.exports = router;

const express = require('express');
const router = express.Router();
const AIController = require('../controllers/ai.controller');

// Route untuk mengirim pertanyaan ke AI
router.post('/ask', AIController.handleAskAI);

module.exports = router;

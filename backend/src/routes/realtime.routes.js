const express = require('express');
const router = express.Router();
const realtimeController = require('../controllers/realtime.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

router.get('/events', requireAuth, realtimeController.subscribeEvents);
router.post('/test-emit', requireAuth, realtimeController.testEmit);

module.exports = router;

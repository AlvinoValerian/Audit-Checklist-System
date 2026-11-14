const express = require('express');
const router = express.Router();
const sparkpayController = require('../controllers/sparkpay.controller');

// Step 1: POST /api/payment-links (Buat Payment Link ke SparkPay)
router.post('/payment-links', sparkpayController.createPaymentLink);

// Step 3: POST /api/payment-callback (Menerima Webhook Callback)
router.post('/payment-callback', sparkpayController.handleWebhookCallback);
router.get('/payment-callback/events', sparkpayController.getWebhookEvents);
router.post('/payment-callback/simulate', sparkpayController.simulateWebhook);

// Status konfigurasi Sandbox
router.get('/config', sparkpayController.getConfig);

// Data Rekap Pembayaran User dari PostgreSQL DB
router.get('/user-subscriptions', sparkpayController.getUserSubscriptions);

module.exports = router;


const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');

// Step 1: Buat Payment Link / Sesi Checkout
router.post('/payment-links', paymentController.createPaymentLink);
router.post('/checkout', paymentController.createPaymentLink);

// Step 3: Webhook Callback Server-to-Server (Method POST dari SparkPay)
router.post('/payment-callback', paymentController.handleWebhookCallback);
router.post('/webhook', paymentController.handleWebhookCallback);

// Info Endpoint jika dibuka langsung lewat Browser (Method GET)
const handleWebhookGet = (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'SparkPay Webhook Callback endpoint aktif & siap menerima kiriman data POST dari server SparkPay.',
    expected_method: 'POST',
    url: 'https://audit-checklist-system-production.up.railway.app/api/payment-callback',
    timestamp: new Date().toISOString()
  });
};

router.get('/payment-callback', handleWebhookGet);
router.get('/webhook', handleWebhookGet);

// Cek status transaksi via token (slug)
router.get('/payment-links/:slug', paymentController.getPaymentStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

const requirePaymentAccess = [
  requireAuth,
  requireRole('Super Admin', 'Divisi Teknis', 'Teknis'),
];

// Step 1: Buat Payment Link / Sesi Checkout (wajib user terautentikasi)
router.post('/payment-links', ...requirePaymentAccess, paymentController.createPaymentLink);
router.post('/checkout', ...requirePaymentAccess, paymentController.createPaymentLink);

// Step 3: Webhook Callback Server-to-Server (Method POST dari SparkPay — verifikasi signature HMAC di controller)
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

// Cek status transaksi via token (slug) (wajib user terautentikasi)
router.get('/payment-links/:slug', ...requirePaymentAccess, paymentController.getPaymentStatus);

module.exports = router;

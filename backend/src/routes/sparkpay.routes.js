const express = require('express');
const router = express.Router();
const sparkpayController = require('../controllers/sparkpay.controller');
const { requireAuth, requireRole } = require('../middlewares/auth.middleware');

const requirePaymentAccess = [
  requireAuth,
  requireRole('Super Admin', 'Divisi Teknis', 'Teknis'),
];
const requireTeknisAccess = [
  requireAuth,
  requireRole('Divisi Teknis', 'Teknis'),
];

// Step 1: POST /api/payment-links (Buat Payment Link ke SparkPay)
router.post('/payment-links', ...requirePaymentAccess, sparkpayController.createPaymentLink);

// Step 3: POST /api/payment-callback (Menerima Webhook Callback dari server SparkPay — verifikasi signature di controller)
router.post('/payment-callback', sparkpayController.handleWebhookCallback);
router.get('/payment-callback/events', ...requireTeknisAccess, sparkpayController.getWebhookEvents);
router.post('/payment-callback/simulate', ...requireTeknisAccess, sparkpayController.simulateWebhook);

// Status konfigurasi Sandbox (khusus Divisi Teknis)
router.get('/config', ...requireTeknisAccess, sparkpayController.getConfig);

// Data Rekap Pembayaran User (khusus Divisi Teknis) & Konfirmasi Pembayaran (terisolasi per role/akun)
router.get('/user-subscriptions', ...requireTeknisAccess, sparkpayController.getUserSubscriptions);
router.post('/confirm-payment', ...requirePaymentAccess, sparkpayController.confirmPayment);

module.exports = router;


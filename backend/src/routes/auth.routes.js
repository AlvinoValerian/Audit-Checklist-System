const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

// Route Registrasi - Registrasi otomatis menjadi SUPER ADMIN
router.post('/register', authController.register);

// Route Login
router.post('/login', authController.login);

// Route Logout (Memutus token server-side & menghapus HttpOnly cookie)
router.post('/logout', authController.logout);

// Route Perpanjang Sesi (Sliding session & cookie refresh)
router.post('/refresh', requireAuth, authController.refresh);

// Route Me / Validasi Sesi
router.get('/me', requireAuth, authController.getMe);

// Route Update Profil (Nama & Foto Profil)
router.put('/profile', requireAuth, authController.updateProfile);

module.exports = router;

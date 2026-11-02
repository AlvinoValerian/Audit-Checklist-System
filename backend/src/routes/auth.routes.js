const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Route Registrasi - Registrasi otomatis menjadi SUPER ADMIN
router.post('/register', authController.register);

// Route Login
router.post('/login', authController.login);

// Route Me / Validasi Sesi
router.get('/me', authController.getMe);

// Route Update Profil (Nama & Foto Profil)
router.put('/profile', authController.updateProfile);

module.exports = router;


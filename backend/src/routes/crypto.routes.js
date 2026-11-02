const express = require('express');
const router = express.Router();
const cryptoController = require('../controllers/crypto.controller');

router.post('/encrypt', cryptoController.encryptPayload);
router.post('/encrypt-image', cryptoController.encryptPayload);
router.post('/decrypt', cryptoController.decryptPayload);
router.post('/decrypt-image', cryptoController.decryptPayload);
router.post('/profile-photo', cryptoController.saveProfilePhoto);

module.exports = router;

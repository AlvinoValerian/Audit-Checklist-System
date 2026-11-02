const { encryptImage, decryptImage, isEncrypted } = require('../utils/crypto.utils');
const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');

/**
 * POST /api/crypto/encrypt
 * Mengenkripsi payload gambar atau string menggunakan algoritma AES-256-GCM
 */
exports.encryptPayload = async (req, res) => {
  try {
    const { image, text } = req.body;
    const content = image || text;

    if (!content) {
      return res.status(400).json({
        status: 'error',
        message: 'Field "image" atau "text" wajib dikirim.',
      });
    }

    const encrypted = encryptImage(content);

    return res.status(200).json({
      status: 'success',
      message: 'Gambar berhasil dienkripsi dengan standar AES-256-GCM.',
      data: {
        encrypted,
        isEncrypted: true,
        algorithm: 'AES-256-GCM',
        preview: encrypted.length > 60 ? `${encrypted.slice(0, 35)}...${encrypted.slice(-15)}` : encrypted,
      },
    });
  } catch (error) {
    console.error('❌ [POST /api/crypto/encrypt] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengenkripsi gambar: ' + error.message,
    });
  }
};

/**
 * POST /api/crypto/decrypt
 * Mendekripsi ciphertext gambar menjadi string gambar asli (Base64 data URL atau URL)
 */
exports.decryptPayload = async (req, res) => {
  try {
    const { encrypted, image } = req.body;
    const content = encrypted || image;

    if (!content) {
      return res.status(400).json({
        status: 'error',
        message: 'Field "encrypted" atau "image" wajib dikirim.',
      });
    }

    const decrypted = decryptImage(content);

    return res.status(200).json({
      status: 'success',
      message: 'Gambar berhasil didekripsi.',
      data: {
        decrypted,
        isEncrypted: false,
      },
    });
  } catch (error) {
    console.error('❌ [POST /api/crypto/decrypt] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mendekripsi gambar: ' + error.message,
    });
  }
};

/**
 * POST /api/crypto/profile-photo
 * Menyimpan foto profil user dalam bentuk terenkripsi AES-256 di database
 */
exports.saveProfilePhoto = async (req, res) => {
  try {
    const user = await extractUser(req);
    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({
        status: 'error',
        message: 'Foto profil wajib dikirim.',
      });
    }

    // Enkripsi foto sebelum disimpan
    const encryptedPhoto = encryptImage(photo);

    if (user && user.role === 'Staff' && user.rawId) {
      await prisma.staff.update({
        where: { staff_id: BigInt(user.rawId) },
        data: { photo: encryptedPhoto, updated_at: new Date() },
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Foto profil berhasil dienkripsi dan disimpan dengan aman.',
      data: {
        encryptedPhoto,
        decryptedPhoto: photo,
        algorithm: 'AES-256-GCM',
        isEncrypted: true,
      },
    });
  } catch (error) {
    console.error('❌ [POST /api/crypto/profile-photo] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memproses foto profil: ' + error.message,
    });
  }
};

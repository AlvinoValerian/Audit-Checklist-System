const { encryptImage, decryptImage } = require('../utils/crypto.utils');
const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { sendSafeError, isStaffRole } = require('../utils/tenantScope');

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
    return sendSafeError(res, error, 'Gagal mengenkripsi gambar.');
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
    return sendSafeError(res, error, 'Gagal mendekripsi gambar.');
  }
};

/**
 * POST /api/crypto/profile-photo
 * Menyimpan foto profil user dalam bentuk terenkripsi AES-256 di database
 */
exports.saveProfilePhoto = async (req, res) => {
  try {
    const user = req.user || (await extractUser(req));
    if (!user || !user.rawId) {
      return res.status(401).json({
        status: 'error',
        message: 'Autentikasi diperlukan.',
      });
    }

    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({
        status: 'error',
        message: 'Foto profil wajib dikirim.',
      });
    }

    const encryptedPhoto = encryptImage(photo);

    if (isStaffRole(user) && user.rawId) {
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
    return sendSafeError(res, error, 'Gagal memproses foto profil.');
  }
};

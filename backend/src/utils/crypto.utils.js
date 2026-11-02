const crypto = require('crypto');

// Master secret key untuk enkripsi AES-256-GCM
const RAW_KEY = process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || 'audit_pro_secure_master_key_2026';
// Buat key 32-byte (256 bit) konsisten dengan SHA-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest();
const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

/**
 * Memeriksa apakah sebuah string sudah terenkripsi dengan format sistem
 * @param {string} str
 * @returns {boolean}
 */
const isEncrypted = (str) => {
  if (typeof str !== 'string') return false;
  return str.startsWith(PREFIX);
};

/**
 * Enkripsi string gambar (Base64 data URL atau URL gambar) menggunakan AES-256-GCM
 * @param {string} text - String gambar polos (data:image/... atau URL)
 * @returns {string} - String terenkripsi dengan format enc:v1:<iv>:<tag>:<ciphertext>
 */
const encryptImage = (text) => {
  if (!text || typeof text !== 'string') return text;
  // Jika sudah terenkripsi, jangan enkripsi ulang
  if (isEncrypted(text)) return text;

  try {
    // IV acak 12 byte (standar aman untuk GCM)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let ciphertext = cipher.update(text, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${ciphertext}`;
  } catch (err) {
    console.error('❌ [Crypto] Gagal mengenkripsi gambar:', err);
    throw new Error('Gagal mengenkripsi gambar: ' + err.message);
  }
};

/**
 * Dekripsi string gambar yang terenkripsi menggunakan AES-256-GCM
 * @param {string} encryptedText - String terenkripsi format enc:v1:<iv>:<tag>:<ciphertext>
 * @returns {string} - String asli hasil dekripsi
 */
const decryptImage = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  // Jika bukan format terenkripsi (misal string biasa / URL polos), kembalikan langsung (backward compatible)
  if (!isEncrypted(encryptedText)) return encryptedText;

  try {
    const raw = encryptedText.slice(PREFIX.length);
    const parts = raw.split(':');
    if (parts.length !== 3) {
      console.warn('⚠️ [Crypto] Format enkripsi tidak valid, mengembalikan raw string');
      return encryptedText;
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    console.error('❌ [Crypto] Gagal mendekripsi gambar:', err.message);
    // Kembalikan encryptedText atau fallback jika kunci tidak cocok
    return encryptedText;
  }
};

module.exports = {
  isEncrypted,
  encryptImage,
  decryptImage,
  PREFIX,
};

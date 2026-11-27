const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

const deriveKey = (secret) => crypto.createHash('sha256').update(String(secret)).digest();

const getPrimaryKey = () => {
  const raw = (process.env.ENCRYPTION_SECRET || process.env.JWT_SECRET || '').trim();
  if (!raw) {
    throw new Error('Konfigurasi enkripsi tidak ditemukan: ENCRYPTION_SECRET atau JWT_SECRET wajib diatur di .env.');
  }
  return deriveKey(raw);
};

/**
 * Daftar kandidat kunci untuk dekripsi mundur (backward-compatible)
 * agar foto/data lama yang terenkripsi sebelum rotasi secret tetap bisa dibuka.
 */
const getDecryptKeyCandidates = () => {
  const legacyList = (process.env.LEGACY_ENCRYPTION_SECRETS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const secrets = [
    process.env.ENCRYPTION_SECRET,
    process.env.JWT_SECRET,
    ...legacyList,
  ].filter(Boolean);

  const uniqueHex = new Set();
  const keys = [];
  for (const s of secrets) {
    const keyBuf = deriveKey(s);
    const hex = keyBuf.toString('hex');
    if (!uniqueHex.has(hex)) {
      uniqueHex.add(hex);
      keys.push(keyBuf);
    }
  }
  return keys;
};

/**
 * Memeriksa apakah sebuah string sudah terenkripsi dengan format sistem
 * @param {string} str
 * @returns {boolean}
 */
const isEncrypted = (str) => {
  if (typeof str !== 'string') return false;
  return str.startsWith(PREFIX) || str.startsWith('ENC:v1:');
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
    const cipher = crypto.createCipheriv(ALGORITHM, getPrimaryKey(), iv);

    let ciphertext = cipher.update(text, 'utf8', 'hex');
    ciphertext += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${PREFIX}${iv.toString('hex')}:${authTag}:${ciphertext}`;
  } catch (err) {
    console.error('❌ [Crypto] Gagal mengenkripsi gambar:', err);
    throw new Error('Gagal mengenkripsi gambar.');
  }
};

/**
 * Dekripsi string gambar yang terenkripsi menggunakan AES-256-GCM
 * @param {string} encryptedText - String terenkripsi format enc:v1:<iv>:<tag>:<ciphertext> atau ENC:v1:...
 * @returns {string} - String asli hasil dekripsi
 */
const decryptImage = (encryptedText) => {
  if (!encryptedText || typeof encryptedText !== 'string') return encryptedText;
  if (encryptedText.startsWith('ENC:v1:')) {
    try {
      const { decryptImageData } = require('./imageCrypto');
      return decryptImageData(encryptedText);
    } catch (e) {
      return encryptedText;
    }
  }
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

    const candidates = getDecryptKeyCandidates();
    for (const keyBuf of candidates) {
      try {
        const decipher = crypto.createDecipheriv(ALGORITHM, keyBuf, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      } catch {
        // Coba kunci kandidat berikutnya jika GCM authTag tidak cocok
      }
    }

    console.warn('⚠️ [Crypto] Tidak ada kunci yang cocok untuk mendekripsi payload enc:v1.');
    return encryptedText;
  } catch (err) {
    console.error('❌ [Crypto] Gagal mendekripsi gambar:', err.message);
    return encryptedText;
  }
};

module.exports = {
  isEncrypted,
  encryptImage,
  decryptImage,
  PREFIX,
};

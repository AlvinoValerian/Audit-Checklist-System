const crypto = require('crypto');

const SECRET_KEY_PASSPHRASE = 'audit_gacoan_secure_vault_key_2024_auth';
const key = crypto.createHash('sha256').update(SECRET_KEY_PASSPHRASE).digest();

/**
 * Enkripsi Base64 gambar menggunakan AES-256-GCM
 */
function encryptImageData(plainBase64) {
  if (!plainBase64 || typeof plainBase64 !== 'string') return '';
  if (plainBase64.startsWith('ENC:v1:') || plainBase64.startsWith('enc:v1:')) return plainBase64;

  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plainBase64, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([encrypted, tag]);

    return `ENC:v1:${iv.toString('hex')}:${combined.toString('base64')}`;
  } catch (err) {
    console.warn('⚠️ Enkripsi foto backend gagal:', err.message);
    return plainBase64;
  }
}

/**
 * Dekripsi payload terenkripsi ENC:v1:... atau enc:v1:... kembali ke Base64 gambar
 */
function decryptImageData(encryptedData) {
  if (!encryptedData || typeof encryptedData !== 'string') return '';
  if (encryptedData.startsWith('enc:v1:')) {
    try {
      const { decryptImage } = require('./crypto.utils');
      return decryptImage(encryptedData);
    } catch (e) {
      return encryptedData;
    }
  }
  if (!encryptedData.startsWith('ENC:v1:')) return encryptedData;

  try {
    const parts = encryptedData.split(':');
    if (parts.length < 4) return encryptedData;

    const iv = Buffer.from(parts[2], 'hex');
    const combined = Buffer.from(parts[3], 'base64');
    const tag = combined.subarray(combined.length - 16);
    const ciphertext = combined.subarray(0, combined.length - 16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.warn('⚠️ Dekripsi foto backend gagal:', err.message);
    return encryptedData;
  }
}

module.exports = {
  encryptImageData,
  decryptImageData,
};

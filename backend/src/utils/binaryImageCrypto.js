const crypto = require('crypto');

const SECRET_KEY_PASSPHRASE = 'audit_gacoan_secure_vault_key_2024_auth';
const primaryKey = crypto.createHash('sha256').update(SECRET_KEY_PASSPHRASE).digest();

const MAGIC_PREFIX = Buffer.from('BIN:v1:', 'ascii'); // 7 bytes
const HEADER_LENGTH = 7 + 1 + 12 + 16; // 36 bytes

const MIME_MAP = {
  1: 'image/jpeg',
  2: 'image/png',
  3: 'image/webp',
  4: 'image/gif',
  5: 'image/svg+xml',
  0: 'application/octet-stream',
};

const REV_MIME_MAP = {
  'image/jpeg': 1,
  'image/jpg': 1,
  'image/png': 2,
  'image/webp': 3,
  'image/gif': 4,
  'image/svg+xml': 5,
};

/**
 * Helper untuk normalisasi Uint8Array/Buffer/Array ke Node.js Buffer
 */
function toBufferSafe(val) {
  if (!val) return null;
  if (Buffer.isBuffer(val)) return val;
  if (val instanceof Uint8Array) {
    return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
  }
  if (Array.isArray(val)) return Buffer.from(val);
  if (typeof val === 'string' && /^\d+(,\d+)+$/.test(val)) {
    return Buffer.from(val.split(',').map((n) => parseInt(n, 10)));
  }
  return null;
}

/**
 * Mendeteksi apakah buffer/Uint8Array adalah format biner terenkripsi BIN:v1:
 */
function isBinaryV1(input) {
  const buf = toBufferSafe(input);
  if (!buf || buf.length < HEADER_LENGTH) return false;
  return buf.subarray(0, 7).equals(MAGIC_PREFIX);
}

/**
 * Enkripsi data gambar mentah (Buffer atau Data URI) langsung ke Buffer biner AES-256-GCM
 * tanpa pembungkus string Base64/Hex (hemat storage 33%–50%).
 *
 * Struktur output Buffer:
 * [0..6]   : 'BIN:v1:' (7 bytes)
 * [7]      : mimeCode  (1 byte)
 * [8..19]  : IV        (12 bytes)
 * [20..35] : Auth Tag  (16 bytes)
 * [36..]   : Ciphertext biner
 */
function encryptBinaryAttachment(input, defaultMime = 'image/jpeg') {
  if (!input) return null;

  // Jika input sudah berformat BIN:v1:, kembalikan apa adanya
  if (Buffer.isBuffer(input) && isBinaryV1(input)) {
    return input;
  }

  let rawBuffer = null;
  let mimeType = defaultMime;

  if (Buffer.isBuffer(input)) {
    rawBuffer = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.startsWith('data:image/')) {
      const match = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/s);
      if (match) {
        const sub = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
        mimeType = `image/${sub}`;
        rawBuffer = Buffer.from(match[2], 'base64');
      } else {
        const commaIdx = trimmed.indexOf(',');
        if (commaIdx !== -1) {
          rawBuffer = Buffer.from(trimmed.slice(commaIdx + 1), 'base64');
        }
      }
    } else if (trimmed.startsWith('data:')) {
      const commaIdx = trimmed.indexOf(',');
      if (commaIdx !== -1) {
        mimeType = trimmed.slice(5, commaIdx).split(';')[0] || defaultMime;
        rawBuffer = Buffer.from(trimmed.slice(commaIdx + 1), 'base64');
      }
    } else if (trimmed.startsWith('ENC:v1:') || trimmed.startsWith('enc:v1:')) {
      // Jika input adalah string terenkripsi lama, jangan enkripsi ulang, simpan sebagai buffer UTF-8
      return Buffer.from(trimmed, 'utf8');
    } else {
      // Asumsikan string base64 mentah
      try {
        rawBuffer = Buffer.from(trimmed, 'base64');
      } catch {
        rawBuffer = Buffer.from(trimmed, 'utf8');
      }
    }
  }

  if (!rawBuffer || rawBuffer.length === 0) return null;

  try {
    const mimeCode = REV_MIME_MAP[mimeType.toLowerCase()] || 1;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', primaryKey, iv);
    const ciphertext = Buffer.concat([cipher.update(rawBuffer), cipher.final()]);
    const tag = cipher.getAuthTag(); // 16 bytes

    return Buffer.concat([
      MAGIC_PREFIX,
      Buffer.from([mimeCode]),
      iv,
      tag,
      ciphertext,
    ]);
  } catch (err) {
    console.warn('⚠️ Gagal mengenkripsi attachment biner:', err.message);
    // Fallback: kembalikan buffer asal jika gagal
    return Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  }
}

/**
 * Dekripsi Buffer/Uint8Array biner BIN:v1: kembali ke objek binary { type: 'binary', mimeType, buffer }
 */
function decryptBinaryAttachment(input) {
  const buf = toBufferSafe(input);
  if (!buf || !isBinaryV1(buf)) return null;

  try {
    const mimeCode = buf.readUInt8(7);
    const mimeType = MIME_MAP[mimeCode] || 'image/jpeg';
    const iv = buf.subarray(8, 20);
    const tag = buf.subarray(20, 36);
    const ciphertext = buf.subarray(36);

    const decipher = crypto.createDecipheriv('aes-256-gcm', primaryKey, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return {
      type: 'binary',
      mimeType,
      buffer: decrypted,
    };
  } catch (err) {
    console.warn('⚠️ Gagal mendekripsi attachment biner:', err.message);
    return null;
  }
}

/**
 * Konversi hasil dekripsi biner menjadi Data URI string jika diperlukan kompatibilitas backward
 */
function binaryToDataUri(result) {
  if (!result || !result.buffer) return '';
  const mime = result.mimeType || 'image/jpeg';
  return `data:${mime};base64,${result.buffer.toString('base64')}`;
}

module.exports = {
  isBinaryV1,
  encryptBinaryAttachment,
  decryptBinaryAttachment,
  binaryToDataUri,
};

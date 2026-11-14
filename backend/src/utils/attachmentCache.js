const prisma = require('../config/prisma');
const { decryptImageData } = require('./imageCrypto');
const { decryptImage, isEncrypted } = require('./crypto.utils');
const { isBinaryV1, decryptBinaryAttachment, binaryToDataUri } = require('./binaryImageCrypto');

const MAX_CACHE_SIZE = 500;
const decryptedCache = new Map();

/**
 * Dekripsi buffer/string attachment URL (mendukung format BIN:v1, ENC:v1 dan enc:v1)
 */
const decryptAttachmentUrl = (file_url) => {
  if (!file_url) return '';

  // Format baru: Binary Murni (BIN:v1:)
  if (isBinaryV1(file_url)) {
    const bin = decryptBinaryAttachment(file_url);
    return binaryToDataUri(bin);
  }

  let raw = '';
  if (Buffer.isBuffer(file_url) || file_url instanceof Uint8Array || Array.isArray(file_url)) {
    raw = Buffer.from(file_url).toString('utf-8');
  } else if (typeof file_url === 'string') {
    if (/^\d+(,\d+)+$/.test(file_url)) {
      const nums = file_url.split(',').map((n) => parseInt(n, 10));
      raw = Buffer.from(nums).toString('utf-8');
    } else {
      raw = file_url;
    }
  } else if (file_url.data && (Array.isArray(file_url.data) || Buffer.isBuffer(file_url.data))) {
    raw = Buffer.from(file_url.data).toString('utf-8');
  }

  if (!raw || typeof raw !== 'string') return '';
  raw = raw.trim();

  if (raw.startsWith('ENC:v1:')) {
    try {
      const dec = decryptImageData(raw);
      if (dec && dec.length > 0) return dec;
    } catch (e) {
      console.warn('⚠️ Gagal decrypt ENC:v1:', e.message);
    }
  }

  if (raw.startsWith('enc:v1:') || isEncrypted(raw)) {
    try {
      const dec = decryptImage(raw);
      if (dec && dec.length > 0) return dec;
    } catch (e) {
      console.warn('⚠️ Gagal decrypt enc:v1:', e.message);
    }
  }

  return raw;
};

const makeCacheKey = (att) => {
  const id = att.attachment_id ? att.attachment_id.toString() : '';
  const upd = att.updated_at ? new Date(att.updated_at).getTime() : 0;
  return `${id}:${upd}`;
};

const setCachedUrl = (key, val) => {
  if (decryptedCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = decryptedCache.keys().next().value;
    if (oldestKey !== undefined) {
      decryptedCache.delete(oldestKey);
    }
  }
  decryptedCache.set(key, val);
};

/**
 * Mengisi `_decryptedUrl` untuk array attachment metadata menggunakan cache in-memory.
 * Hanya attachment yang belum ada di cache yang akan diambil kolom `file_url`-nya dari database.
 */
const hydrateAttachmentUrls = async (attachments = []) => {
  if (!Array.isArray(attachments) || attachments.length === 0) return;

  const missingMap = new Map();

  for (const att of attachments) {
    if (!att || !att.attachment_id) continue;
    const key = makeCacheKey(att);
    if (decryptedCache.has(key)) {
      att._decryptedUrl = decryptedCache.get(key);
    } else if (att.file_url !== undefined) {
      const dec = decryptAttachmentUrl(att.file_url);
      setCachedUrl(key, dec);
      att._decryptedUrl = dec;
    } else {
      const idStr = att.attachment_id.toString();
      if (!missingMap.has(idStr)) {
        missingMap.set(idStr, []);
      }
      missingMap.get(idStr).push({ att, key });
    }
  }

  if (missingMap.size === 0) return;

  const missingIds = Array.from(missingMap.keys()).map((id) => BigInt(id));
  const rows = await prisma.attachment.findMany({
    where: { attachment_id: { in: missingIds } },
    select: { attachment_id: true, file_url: true },
  });

  for (const row of rows) {
    const idStr = row.attachment_id.toString();
    const dec = decryptAttachmentUrl(row.file_url);
    const targets = missingMap.get(idStr) || [];
    for (const { att, key } of targets) {
      setCachedUrl(key, dec);
      att._decryptedUrl = dec;
    }
  }
};

const binaryCache = new Map();

/**
 * Mengambil dan mendekripsi attachment ke bentuk biner Buffer / redirect URL
 * dengan caching in-memory cepat.
 */
const getAttachmentBinary = async (attachmentId) => {
  const idStr = String(attachmentId);
  if (binaryCache.has(idStr)) {
    return binaryCache.get(idStr);
  }

  const row = await prisma.attachment.findUnique({
    where: { attachment_id: BigInt(idStr) },
    select: { attachment_id: true, file_url: true, file_type: true },
  });

  if (!row || !row.file_url) return null;

  // 1. Cek format biner murni baru (BIN:v1:) - Sangat cepat tanpa overhead Base64
  if (isBinaryV1(row.file_url)) {
    const binResult = decryptBinaryAttachment(row.file_url);
    if (binResult) {
      if (binaryCache.size >= MAX_CACHE_SIZE) {
        const oldest = binaryCache.keys().next().value;
        if (oldest !== undefined) binaryCache.delete(oldest);
      }
      binaryCache.set(idStr, binResult);
      return binResult;
    }
  }

  // 2. Fallback backward-compatible untuk data foto lama (ENC:v1:, enc:v1:, data:image, url)
  const decrypted = decryptAttachmentUrl(row.file_url);
  if (!decrypted) return null;

  let result = null;
  if (decrypted.startsWith('data:image/')) {
    const match = decrypted.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/s);
    if (match) {
      const sub = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
      result = {
        type: 'binary',
        mimeType: `image/${sub}`,
        buffer: Buffer.from(match[2], 'base64'),
      };
    }
  } else if (/^https?:\/\//i.test(decrypted)) {
    result = {
      type: 'redirect',
      url: decrypted,
    };
  } else if (decrypted.startsWith('data:')) {
    const commaIdx = decrypted.indexOf(',');
    if (commaIdx !== -1) {
      const mime = decrypted.slice(5, commaIdx).split(';')[0] || 'application/octet-stream';
      const b64 = decrypted.slice(commaIdx + 1);
      result = {
        type: 'binary',
        mimeType: mime,
        buffer: Buffer.from(b64, 'base64'),
      };
    }
  }

  if (result) {
    if (binaryCache.size >= MAX_CACHE_SIZE) {
      const oldest = binaryCache.keys().next().value;
      if (oldest !== undefined) binaryCache.delete(oldest);
    }
    binaryCache.set(idStr, result);
  }

  return result;
};

module.exports = {
  decryptAttachmentUrl,
  hydrateAttachmentUrls,
  getAttachmentBinary,
};

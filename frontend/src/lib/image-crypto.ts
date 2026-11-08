/**
 * Utility untuk Optimalisasi Ukuran Gambar (Resize & Kompresi)
 * serta Enkripsi & Dekripsi AES-GCM Foto Kamera Task & Selfie
 */

const SECRET_KEY_PASSPHRASE = "audit_gacoan_secure_vault_key_2024_auth";

let cachedCryptoKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (cachedCryptoKey) return cachedCryptoKey;
  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  const enc = new TextEncoder();
  const keyData = enc.encode(SECRET_KEY_PASSPHRASE);
  const hash = await crypto.subtle.digest("SHA-256", keyData);
  cachedCryptoKey = await crypto.subtle.importKey(
    "raw",
    hash,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  return cachedCryptoKey;
}

/**
 * 1. Resize dan kompresi gambar agar tajam namun ukuran file sangat kecil (optimal ~60KB - 120KB)
 * Mencegah database PostgreSQL membengkak akibat foto mentah kamera HP (3MB - 10MB).
 */
export async function optimizeAndResizeImage(
  source: string | File | Blob,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.78,
  backgroundColor = "#ffffff"
): Promise<string> {
  if (typeof window === "undefined") {
    return typeof source === "string" ? source : "";
  }

  return new Promise((resolve) => {
    let srcUrl = "";
    if (typeof source === "string") {
      srcUrl = source;
    } else {
      srcUrl = URL.createObjectURL(source);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let { width, height } = img;

      // Hitung dimensi baru proporsional
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        if (typeof source !== "string") URL.revokeObjectURL(srcUrl);
        return resolve(srcUrl);
      }

      // Selalu isi background solid (putih) agar saat diekspor ke JPEG tidak menghitam
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      // Downscaling berkualitas tinggi agar tidak buram
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      // Ekspor ke JPEG dengan rasio kompresi optimal
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);

      if (typeof source !== "string") URL.revokeObjectURL(srcUrl);
      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      if (typeof source !== "string") URL.revokeObjectURL(srcUrl);
      if (typeof source === "string") resolve(source);
      else resolve("");
    };

    img.src = srcUrl;
  });
}

/**
 * 2. Enkripsi Foto Kamera menggunakan algoritma standar AES-GCM 256-bit
 * Menghasilkan format: ENC:v1:<iv_hex>:<ciphertext_base64>
 */
export async function encryptImageData(plainBase64: string): Promise<string> {
  if (!plainBase64) return "";
  if (plainBase64.startsWith("ENC:v1:")) return plainBase64; // Sudah terenkripsi

  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    return plainBase64;
  }

  try {
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encodedData = enc.encode(plainBase64);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encodedData
    );

    const ivHex = Array.from(iv)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const cipherBytes = new Uint8Array(cipherBuffer);
    let binary = "";
    const len = cipherBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(cipherBytes[i]);
    }
    const cipherB64 = btoa(binary);

    return `ENC:v1:${ivHex}:${cipherB64}`;
  } catch (err) {
    console.warn("⚠️ Enkripsi foto gagal, fallback data asli:", err);
    return plainBase64;
  }
}

/**
 * 3. Dekripsi Foto Kamera kembali ke Data URL asli untuk preview
 */
export async function decryptImageData(encryptedData: string): Promise<string> {
  if (!encryptedData) return "";
  if (!encryptedData.startsWith("ENC:v1:")) {
    return encryptedData; // Foto bukan format terenkripsi (misal legacy URL/base64)
  }

  if (typeof window === "undefined" || !window.crypto || !window.crypto.subtle) {
    return encryptedData;
  }

  try {
    const parts = encryptedData.split(":");
    if (parts.length < 4) return encryptedData;

    const ivHex = parts[2];
    const cipherB64 = parts[3];

    const ivMatches = ivHex.match(/.{1,2}/g);
    if (!ivMatches) return encryptedData;
    const iv = new Uint8Array(ivMatches.map((b) => parseInt(b, 16)));

    const binary = atob(cipherB64);
    const cipherBytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      cipherBytes[i] = binary.charCodeAt(i);
    }

    const key = await getCryptoKey();
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBytes
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.warn("⚠️ Dekripsi foto gagal:", err);
    return encryptedData;
  }
}

/**
 * Utility untuk Optimalisasi Ukuran Gambar (Resize & Kompresi)
 * Enkripsi & Dekripsi AES-256-GCM didelegasikan aman ke Backend Crypto API (/api/crypto/*)
 * sehingga tidak ada secret key yang tersimpan di client-side bundle.
 */

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
 * 2. Enkripsi Foto Kamera menggunakan AES-256-GCM di server backend
 * Menghasilkan format: enc:v1:<iv>:<tag>:<ciphertext>
 */
export async function encryptImageData(plainBase64: string): Promise<string> {
  if (!plainBase64) return "";
  if (plainBase64.startsWith("ENC:v1:") || plainBase64.startsWith("enc:v1:")) {
    return plainBase64;
  }

  try {
    const { CryptoService } = await import("@/lib/crypto");
    return await CryptoService.encryptImage(plainBase64);
  } catch (err) {
    console.warn("⚠️ Enkripsi foto gagal:", err);
    throw err instanceof Error ? err : new Error("Gagal mengenkripsi foto.");
  }
}

/**
 * 3. Dekripsi Foto Kamera kembali ke Data URL asli melalui Backend Crypto API
 * Mendukung format lama ENC:v1:... maupun format server enc:v1:...
 */
export async function decryptImageData(encryptedData: string): Promise<string> {
  if (!encryptedData) return "";
  if (!encryptedData.startsWith("ENC:v1:") && !encryptedData.startsWith("enc:v1:")) {
    return encryptedData;
  }

  try {
    const { CryptoService } = await import("@/lib/crypto");
    return await CryptoService.decryptImage(encryptedData);
  } catch (err) {
    console.warn("⚠️ Dekripsi foto gagal:", err);
    return encryptedData;
  }
}

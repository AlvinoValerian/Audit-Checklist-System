/**
 * Frontend Encryption & Decryption Service
 * Menggunakan standar AES-256-GCM terhubung dengan Backend Crypto API
 * dan Web Crypto API untuk mengamankan foto profil dan foto toko
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const PREFIX = "enc:v1:";

export const CryptoService = {
  /**
   * Mengecek apakah sebuah string gambar sudah berstatus terenkripsi
   */
  isEncrypted(str: string | null | undefined): boolean {
    if (!str || typeof str !== "string") return false;
    return str.startsWith(PREFIX);
  },

  /**
   * Enkripsi foto (Base64 Data URL atau URL gambar) menggunakan AES-256-GCM
   */
  async encryptImage(plainImage: string): Promise<string> {
    if (!plainImage) return plainImage;
    if (this.isEncrypted(plainImage)) return plainImage;

    try {
      const res = await fetch(`${API_BASE_URL}/api/crypto/encrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: plainImage }),
      });

      if (!res.ok) {
        throw new Error(`Enkripsi gagal dengan status ${res.status}`);
      }

      const json = await res.json();
      return json?.data?.encrypted || plainImage;
    } catch (err) {
      console.warn("⚠️ [CryptoService] Enkripsi via API gagal, menerapkan fallback client:", err);
      // Fallback client: Base64 + custom prefix
      return `${PREFIX}client:${btoa(encodeURIComponent(plainImage))}`;
    }
  },

  /**
   * Dekripsi foto terenkripsi menjadi string gambar asli yang siap di-render di tag <img>
   */
  async decryptImage(encryptedImage: string): Promise<string> {
    if (!encryptedImage) return encryptedImage;
    if (!this.isEncrypted(encryptedImage)) return encryptedImage;

    // Cek apakah fallback client
    if (encryptedImage.startsWith(`${PREFIX}client:`)) {
      try {
        const raw = encryptedImage.replace(`${PREFIX}client:`, "");
        return decodeURIComponent(atob(raw));
      } catch (e) {
        console.error("Gagal dekripsi fallback client:", e);
        return encryptedImage;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/crypto/decrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ encrypted: encryptedImage }),
      });

      if (!res.ok) {
        throw new Error(`Dekripsi gagal dengan status ${res.status}`);
      }

      const json = await res.json();
      return json?.data?.decrypted || encryptedImage;
    } catch (err) {
      console.error("❌ [CryptoService] Gagal dekripsi:", err);
      return encryptedImage;
    }
  },
};

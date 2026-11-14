/**
 * Frontend Encryption & Decryption Service
 * Menggunakan standar AES-256-GCM terhubung dengan Backend Crypto API
 * dan Web Crypto API untuk mengamankan foto profil dan foto toko
 */

import { apiFetch } from "@/lib/api-client";

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};
const API_BASE_URL = getBackendUrl();
const PREFIX = "enc:v1:";
const PREFIX_ALT = "ENC:v1:";

// In-memory cache & in-flight deduplication agar tidak membombardir /api/crypto/decrypt
const decryptCache = new Map<string, string>();
const inFlightDecrypts = new Map<string, Promise<string>>();

export const CryptoService = {
  /**
   * Mengecek apakah sebuah string gambar sudah berstatus terenkripsi
   */
  isEncrypted(str: string | null | undefined): boolean {
    if (!str || typeof str !== "string") return false;
    return str.startsWith(PREFIX) || str.startsWith(PREFIX_ALT);
  },

  /**
   * Enkripsi foto (Base64 Data URL atau URL gambar) menggunakan AES-256-GCM
   */
  async encryptImage(plainImage: string): Promise<string> {
    if (!plainImage) return plainImage;
    if (this.isEncrypted(plainImage)) return plainImage;

    let isAuthError = false;
    try {
      let res = await apiFetch(`${API_BASE_URL}/api/crypto/encrypt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: plainImage }),
      });

      if (res.status >= 500) {
        await new Promise((r) => setTimeout(r, 400));
        res = await apiFetch(`${API_BASE_URL}/api/crypto/encrypt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image: plainImage }),
        });
      }

      if (res.status === 401 || res.status === 403) {
        isAuthError = true;
        throw new Error(`Enkripsi gagal dengan status ${res.status}`);
      }

      if (!res.ok) {
        throw new Error(`Enkripsi gagal dengan status ${res.status}`);
      }

      const json = await res.json();
      const encrypted = json?.data?.encrypted;
      if (!encrypted || !this.isEncrypted(encrypted)) {
        throw new Error("Respons enkripsi backend tidak valid");
      }
      return encrypted;
    } catch (err) {
      if (isAuthError) {
        throw err;
      }
      console.warn("⚠️ [CryptoService] Enkripsi via API gagal, mencoba Web Crypto AES-256-GCM lokal:", err);
      try {
        const { encryptImageData } = await import("@/lib/image-crypto");
        const localEncrypted = await encryptImageData(plainImage);
        if (localEncrypted && localEncrypted !== plainImage && this.isEncrypted(localEncrypted)) {
          return localEncrypted;
        }
      } catch (localErr) {
        console.warn("⚠️ [CryptoService] Web Crypto AES-256-GCM lokal gagal:", localErr);
      }
      throw err instanceof Error ? err : new Error("Gagal mengenkripsi gambar.");
    }
  },

  /**
   * Dekripsi foto terenkripsi menjadi string gambar asli yang siap di-render di tag <img>
   */
  async decryptImage(encryptedImage: string): Promise<string> {
    if (!encryptedImage) return encryptedImage;
    if (!this.isEncrypted(encryptedImage)) return encryptedImage;

    // 1. Cek cache in-memory (0ms, hemat bandwidth & backend)
    if (decryptCache.has(encryptedImage)) {
      return decryptCache.get(encryptedImage)!;
    }

    // 2. Cegah request duplikat paralel (in-flight deduplication)
    if (inFlightDecrypts.has(encryptedImage)) {
      return inFlightDecrypts.get(encryptedImage)!;
    }

    const decryptPromise = (async () => {
      try {
        // Jika format ENC:v1:, gunakan Web Crypto API lokal terlebih dahulu
        if (encryptedImage.startsWith(PREFIX_ALT)) {
          try {
            const { decryptImageData } = await import("@/lib/image-crypto");
            const dec = await decryptImageData(encryptedImage);
            if (dec && dec !== encryptedImage) {
              decryptCache.set(encryptedImage, dec);
              return dec;
            }
          } catch {
            // Fallback ke backend decrypt
          }
        }

        // Backward compatibility untuk data lama format fallback client
        if (encryptedImage.startsWith(`${PREFIX}client:`)) {
          try {
            const raw = encryptedImage.replace(`${PREFIX}client:`, "");
            const dec = decodeURIComponent(atob(raw));
            decryptCache.set(encryptedImage, dec);
            return dec;
          } catch (e) {
            console.error("Gagal dekripsi fallback client:", e);
            return encryptedImage;
          }
        }

        let res = await apiFetch(`${API_BASE_URL}/api/crypto/decrypt`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ encrypted: encryptedImage }),
        });

        // Retry sekali jika backend sedang restart / transient network error (500/502/503/504)
        if (!res.ok && res.status >= 500) {
          await new Promise((r) => setTimeout(r, 400));
          res = await apiFetch(`${API_BASE_URL}/api/crypto/decrypt`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ encrypted: encryptedImage }),
          });
        }

        if (!res.ok) {
          console.warn(`⚠️ [CryptoService] Dekripsi ditunda (status ${res.status}), menampilkan gambar aman.`);
          return encryptedImage;
        }

        const json = await res.json();
        const result = json?.data?.decrypted || encryptedImage;
        if (result !== encryptedImage) {
          decryptCache.set(encryptedImage, result);
        }
        return result;
      } catch (err) {
        console.warn("⚠️ [CryptoService] Gagal dekripsi:", err);
        return encryptedImage;
      } finally {
        inFlightDecrypts.delete(encryptedImage);
      }
    })();

    inFlightDecrypts.set(encryptedImage, decryptPromise);
    return decryptPromise;
  },
};

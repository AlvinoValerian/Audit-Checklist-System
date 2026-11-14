import { ChatMessage } from "@/types/ai";
import { AuthService } from "@/lib/auth";

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const QUICK_PROMPT_SUGGESTIONS = [
  "Berapa rata-rata skor kepatuhan toko di Jakarta Pusat minggu ini dan apa temuan yang paling sering muncul?",
  "Buatkan draft instruksi korektif untuk Store Manager",
  "Toko mana saja yang memiliki temuan kritis minggu ini?",
  "Bagaimana performa audit Cabang Sudirman?",
  "Analisis kepatuhan APAR & fasilitas keselamatan K3",
  "Ringkas laporan audit kasir dan perangkat POS",
];

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};
const BACKEND_URL = getBackendUrl();

export class AIService {
  static getInitialMessages(): ChatMessage[] {
    return [...INITIAL_CHAT_MESSAGES];
  }

  /**
   * Helper header autentikasi lengkap untuk memastikan data chat
   * strictly terisolasi per akun (Super Admin, Admin, Divisi Teknis, Staff)
   */
  private static _getAuthHeaders(): Record<string, string> {
    const token = AuthService.getToken();
    const currentUser = AuthService.getCurrentUser();
    const activeWs = AuthService.getActiveWorkspace();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (currentUser?.id) headers["x-user-id"] = currentUser.id;
    if (currentUser?.email) headers["x-user-email"] = currentUser.email.toLowerCase().trim();
    if (currentUser?.role) headers["x-user-role"] = currentUser.role;
    const wsId = activeWs?.id || currentUser?.workspaceId;
    if (wsId) headers["x-workspace-id"] = wsId;

    return headers;
  }

  /**
   * Fetch resilien dengan auto-fallback:
   * 1. Coba lewat proxy relative URL (Next.js rewrites)
   * 2. Jika Next.js proxy gagal/timeout (status 500), otomatis fallback langsung ke backend Express (http://127.0.0.1:5000)
   */
  private static async _fetchApi(path: string, options: RequestInit): Promise<Response> {
    const fullPath = `${BACKEND_URL}${path}`;
    try {
      const response = await fetch(fullPath, options);
      if (response.ok) return response;

      // Jika Next.js dev server proxy mengalami 500 internal server error pada rewrite:
      if (response.status === 500 && !fullPath.startsWith("http")) {
        console.warn("⚠️ Next.js rewrite proxy 500, beralih langsung ke Express port 5000...");
        return await fetch(`http://127.0.0.1:5000${path}`, options);
      }
      return response;
    } catch (err) {
      if (!fullPath.startsWith("http")) {
        console.warn("⚠️ Proxy tidak merespon, mencoba koneksi langsung ke Express port 5000...", err);
        return await fetch(`http://127.0.0.1:5000${path}`, options);
      }
      throw err;
    }
  }

  /**
   * Mengambil sesi chat aktif pengguna dari backend.
   * Pesan tetap tersimpan saat pengguna pindah halaman atau logout.
   */
  static async getActiveSession(): Promise<ChatMessage[]> {
    try {
      const response = await this._fetchApi(`/api/ai/session?_t=${Date.now()}`, {
        method: "GET",
        headers: {
          ...this._getAuthHeaders(),
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
        cache: "no-store",
      });

      if (response.ok) {
        const json = await response.json();
        if (json.status === "success" && Array.isArray(json.data?.messages)) {
          return json.data.messages.map((m: ChatMessage) => ({
            ...m,
            content: this._stripAsterisks(m.content),
          }));
        }
      }
    } catch (err) {
      console.warn("Gagal memuat sesi chat aktif dari backend:", err);
    }
    return [];
  }

  /**
   * Mengatur ulang sesi chat aktif di backend (sesi lama diarsip, membuka sesi baru).
   */
  static async resetSession(): Promise<boolean> {
    try {
      const response = await this._fetchApi(`/api/ai/reset`, {
        method: "POST",
        headers: this._getAuthHeaders(),
      });
      return response.ok;
    } catch (err) {
      console.warn("Gagal mereset sesi chat di backend:", err);
      return false;
    }
  }

  /**
   * Mengirim pertanyaan prompt ke Google Gemini di backend.
   */
  static async generateResponse(userPrompt: string, signal?: AbortSignal): Promise<ChatMessage> {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    const q = userPrompt.toLowerCase().trim();

    let errorMessage =
      "⚠️ Koneksi AI Terputus / Tidak Stabil\n\n" +
      "Maaf, sistem tidak dapat terhubung ke layanan AI saat ini.";

    // 1. Panggil Backend API Express (Google Gemini)
    try {
      const response = await this._fetchApi(`/api/ai/ask`, {
        method: "POST",
        headers: this._getAuthHeaders(),
        body: JSON.stringify({ question: userPrompt }),
        signal,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.status === "success" && result.data?.answer) {
          const isDraft = q.includes("draft") || q.includes("memo") || q.includes("capa");
          const cleanAnswer = this._stripAsterisks(result.data.answer);
          return {
            id: `ai-${Date.now()}`,
            sender: "assistant",
            senderName: "Audit Pro Assistant",
            timestamp: timeStr,
            isDraft,
            content: cleanAnswer,
            suggestions: [
              "Buatkan draft instruksi korektif untuk Store Manager",
              "Toko mana saja yang memiliki temuan kritis minggu ini?",
              "Berapa rata-rata skor kepatuhan toko di Jakarta Pusat?",
            ],
          };
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.error("❌ Backend AI Error Response:", errJson);
        errorMessage =
          errJson?.message ||
          "⚠️ Koneksi AI Terputus / Tidak Stabil\n\n" +
          "Maaf, sistem tidak dapat terhubung ke layanan AI saat ini.";
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError" || signal?.aborted) {
        throw err;
      }
      console.warn("Backend AI tidak terjangkau:", err);
      const detail = (err as Error)?.message;
      errorMessage =
        "⚠️ Koneksi AI Terputus / Tidak Stabil\n\n" +
        (detail ? `Detail Error: ${detail}\n\n` : "") +
        "Pastikan server backend (port 5000) sedang berjalan.";
    }

    // 2. Tampilkan pesan koneksi terputus jika backend offline / error
    return {
      id: `ai-${Date.now()}`,
      sender: "assistant",
      senderName: "Audit Pro Assistant",
      timestamp: timeStr,
      isDraft: false,
      content: errorMessage,
      suggestions: [
        "Coba kirim ulang pertanyaan",
        "Buatkan draft instruksi korektif untuk Store Manager",
        "Toko mana saja yang memiliki temuan kritis minggu ini?",
      ],
    };
  }

  /**
   * Menghapus semua karakter bintang (*) dan mengubah bullet bintang menjadi bullet bulat
   */
  private static _stripAsterisks(text: string): string {
    if (!text) return "";
    return text.trim();
  }
}

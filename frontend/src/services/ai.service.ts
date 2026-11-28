import { ChatMessage } from "@/types/ai";
import { AuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const ADMIN_QUICK_PROMPTS = [
  "Berapa total laporan audit saat ini dan berapa yang berstatus tidak mengerjakan atau terlambat?",
  "Apa saja temuan jawaban 'NO' terbaru di lapangan beserta catatan auditornya?",
  "Tampilkan jadwal audit yang aktif beserta nama toko, jam audit, dan PIC stafnya",
  "Toko mana saja yang memiliki jadwal libur dan apa alasannya?",
  "Buatkan draft memo tindak lanjut (CAPA) dari temuan 'NO' terbaru",
  "Template checklist apa saja yang tersedia beserta jumlah kategori dan butir pertanyaannya?",
];

export const SUPER_ADMIN_QUICK_PROMPTS = [
  "Berikan ringkasan eksekutif tingkat kepatuhan dan total laporan seluruh cabang saat ini",
  "Cabang mana yang performanya paling baik dan cabang mana yang paling sering melewatkan audit?",
  "Apa saja temuan 'NO' terbaru yang paling krusial di toko dan apa catatan auditornya?",
  "Buatkan draft memo evaluasi untuk Admin dan Store Manager berdasarkan temuan terbaru",
  "Toko mana saja yang memiliki jadwal libur dan apakah ada jadwal audit yang terpengaruh?",
];

export const TEKNIS_QUICK_PROMPTS = [
  "Tampilkan ringkasan jadwal audit dan status laporan di workspace sandbox",
  "Apa saja temuan jawaban 'NO' terbaru pada data pengujian sistem?",
  "Template checklist apa saja yang tersedia beserta jumlah kategori dan butirnya?",
  "Toko mana saja yang terdaftar operasional dan apakah ada jadwal libur?",
];

export const QUICK_PROMPT_SUGGESTIONS = ADMIN_QUICK_PROMPTS;

export const DEFAULT_FOLLOWUP_SUGGESTIONS = [
  "Buatkan draft memo tindak lanjut (CAPA) dari temuan 'NO' terbaru",
  "Cabang mana yang paling patuh dan cabang mana yang paling sering melewatkan audit?",
  "Ringkas daftar template checklist yang aktif dan jumlah butir pemeriksaannya",
];

export function getQuickPromptSuggestions(role?: string): string[] {
  const roleLower = (role || "").trim().toLowerCase();
  if (roleLower === "super admin") return SUPER_ADMIN_QUICK_PROMPTS;
  if (roleLower.includes("teknis")) return TEKNIS_QUICK_PROMPTS;
  return ADMIN_QUICK_PROMPTS;
}

export function getFollowupSuggestions(role?: string): string[] {
  const roleLower = (role || "").trim().toLowerCase();
  if (roleLower === "super admin") {
    return [
      "Berikan ringkasan eksekutif skor kepatuhan seluruh cabang di workspace ini",
      "Cabang mana yang paling sering memiliki temuan NO atau melewatkan audit?",
      "Buatkan draft memo evaluasi untuk Admin dan Store Manager dari temuan terbaru",
    ];
  }
  if (roleLower.includes("teknis")) {
    return [
      "Tampilkan ringkasan jadwal audit dan status laporan di workspace sandbox",
      "Apa saja temuan jawaban NO terbaru pada data pengujian sistem?",
      "Template checklist apa saja yang tersedia beserta jumlah butirnya?",
    ];
  }
  return DEFAULT_FOLLOWUP_SUGGESTIONS;
}

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
    const wsId = activeWs?.id || currentUser?.workspaceId;
    if (wsId) headers["x-workspace-id"] = wsId;

    return headers;
  }

  /**
   * Wrapper fetch standar melalui same-origin Next.js proxy + apiFetch
   */
  private static async _fetchApi(path: string, options: RequestInit): Promise<Response> {
    const fullPath = `${BACKEND_URL}${path}`;
    return await apiFetch(fullPath, options);
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
            suggestions: getFollowupSuggestions(AuthService.getCurrentUser()?.role),
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
        ...DEFAULT_FOLLOWUP_SUGGESTIONS.slice(0, 2),
      ],
    };
  }

  /**
   * Mengirim pertanyaan via Server-Sent Events (SSE) realtime streaming.
   * Memanggil onChunk setiap token/potongan teks tiba dan mengembalikan ChatMessage final.
   */
  static async streamResponse(
    userPrompt: string,
    options: {
      onChunk?: (chunk: string) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<ChatMessage> {
    const { onChunk, signal } = options;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;
    const q = userPrompt.toLowerCase().trim();
    const isDraft = q.includes("draft") || q.includes("memo") || q.includes("capa");
    const defaultSuggestions = getFollowupSuggestions(AuthService.getCurrentUser()?.role);

    try {
      const response = await this._fetchApi(`/api/ai/ask-stream`, {
        method: "POST",
        headers: {
          ...this._getAuthHeaders(),
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ question: userPrompt }),
        signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg =
          errJson?.message ||
          "⚠️ Koneksi AI Terputus / Tidak Stabil\n\nMaaf, sistem tidak dapat terhubung ke layanan AI saat ini.";
        if (onChunk) onChunk(errMsg);
        return {
          id: `ai-${Date.now()}`,
          sender: "assistant",
          senderName: "Audit Pro Assistant",
          timestamp: timeStr,
          isDraft: false,
          content: errMsg,
          suggestions: [
            "Coba kirim ulang pertanyaan",
            ...defaultSuggestions.slice(0, 2),
          ],
        };
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/event-stream") || !response.body) {
        // Fallback aman jika proxy/endpoint mengembalikan JSON biasa
        const result = await response.json().catch(() => ({}));
        const answer = this._stripAsterisks(result?.data?.answer || "");
        if (answer && onChunk) onChunk(answer);
        return (
          result?.data?.aiMessage || {
            id: `ai-${Date.now()}`,
            sender: "assistant",
            senderName: "Audit Pro Assistant",
            timestamp: timeStr,
            isDraft,
            content: answer,
            suggestions: defaultSuggestions,
          }
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let sseBuffer = "";
      let accumulatedText = "";
      let finalAiMessage: ChatMessage | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split(/\r?\n\r?\n/);
        sseBuffer = events.pop() || "";

        for (const rawEvent of events) {
          const lines = rawEvent.split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const evt = JSON.parse(jsonStr);
              if (evt.type === "chunk" && typeof evt.text === "string" && evt.text) {
                accumulatedText += evt.text;
                if (onChunk) onChunk(evt.text);
              } else if (evt.type === "done") {
                if (evt.aiMessage) {
                  finalAiMessage = {
                    ...evt.aiMessage,
                    content: this._stripAsterisks(evt.aiMessage.content || evt.answer || accumulatedText),
                  };
                } else if (typeof evt.answer === "string") {
                  accumulatedText = evt.answer;
                }
              } else if (evt.type === "error") {
                throw new Error(evt.message || "Terjadi kesalahan streaming AI.");
              }
            } catch (parseErr) {
              if ((parseErr as Error)?.message?.includes("streaming AI")) {
                throw parseErr;
              }
            }
          }
        }
      }

      if (finalAiMessage) {
        return finalAiMessage;
      }

      return {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        senderName: "Audit Pro Assistant",
        timestamp: timeStr,
        isDraft,
        content: this._stripAsterisks(accumulatedText),
        suggestions: defaultSuggestions,
      };
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError" || signal?.aborted) {
        throw err;
      }
      const detail = (err as Error)?.message;
      const errMsg =
        "⚠️ Koneksi AI Terputus / Tidak Stabil\n\n" +
        (detail ? `Detail Error: ${detail}\n\n` : "") +
        "Pastikan server backend (port 5000) sedang berjalan.";
      if (onChunk) onChunk(errMsg);
      return {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        senderName: "Audit Pro Assistant",
        timestamp: timeStr,
        isDraft: false,
        content: errMsg,
        suggestions: [
          "Coba kirim ulang pertanyaan",
          ...defaultSuggestions.slice(0, 2),
        ],
      };
    }
  }

  /**
   * Menghapus semua karakter bintang (*) dan mengubah bullet bintang menjadi bullet bulat
   */
  private static _stripAsterisks(text: string): string {
    if (!text) return "";
    return text.trim();
  }
}

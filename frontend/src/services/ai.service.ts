import { ChatMessage } from "@/types/ai";

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const QUICK_PROMPT_SUGGESTIONS = [
  "Berapa rata-rata skor kepatuhan toko di Jakarta Pusat minggu ini dan apa temuan yang paling sering muncul?",
  "Buatkan draft instruksi korektif untuk Store Manager",
  "Toko mana saja yang memiliki temuan kritis minggu ini?",
  "Bagaimana performa audit Cabang Sudirman?",
  "Analisis kepatuhan APAR & fasilitas keselamatan K3",
  "Ringkas laporan audit kasir dan perangkat POS",
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export class AIService {
  static getInitialMessages(): ChatMessage[] {
    return [...INITIAL_CHAT_MESSAGES];
  }

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
      const response = await fetch(`${BACKEND_URL}/api/ai/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          "⚠️ Koneksi AI Terputus / Tidak Stabil\n\n" +
          "Maaf, sistem tidak dapat terhubung ke layanan AI saat ini.";
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || signal?.aborted) {
        throw err;
      }
      console.warn("Backend AI tidak terjangkau:", err);
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
    return text
      .replace(/^([ \t]*)\*+[ \t]+/gm, "$1• ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\*/g, "")
      .trim();
  }
}


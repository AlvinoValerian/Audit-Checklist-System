const { SYSTEM_PROMPT } = require('../ai/rules');
const { getFormattedKnowledgeContext } = require('../ai/knowledge/audit-knowledge');

/**
 * Service untuk memproses pertanyaan user ke LLM
 */
const AIService = {
  /**
   * Menjawab pertanyaan user menggunakan LLM (Gemini / Ollama / Mock)
   * @param {string} userQuestion
   * @param {string} customContext - Konteks opsional tambahan dari DB (misal data temuan toko tertentu)
   */
  async askAI(userQuestion, customContext = '') {
    const knowledgeContext = getFormattedKnowledgeContext();
    const systemInstructionText = `
${SYSTEM_PROMPT}

Basis Data Pengetahuan Audit Retail:
${knowledgeContext}

${customContext ? `Konteks Tambahan Toko/Audit Terkini:\n${customContext}\n` : ''}
    `.trim();

    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // 1. Opsi Provider: Google Gemini
    if (provider === 'gemini' && geminiApiKey) {
      return await this._callGeminiAPI(userQuestion, systemInstructionText, geminiApiKey);
    }

    // 2. Opsi Provider: Local AI (Ollama)
    if (provider === 'local' || provider === 'ollama') {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const fullPrompt = `${systemInstructionText}\n\nPertanyaan Pengguna:\n${userQuestion}`;
      return await this._callOllamaAPI(fullPrompt, ollamaUrl);
    }

    // 3. Fallback jika GEMINI_API_KEY belum diisi di .env
    return this._generateFallbackResponse(userQuestion);
  },

  /**
   * Memanggil Google Gemini REST API dengan Auto-Discovery Model dan Retry Fallback
   */
  async _callGeminiAPI(userQuestion, systemInstructionText, apiKey) {
    const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '');

    // Kumpulkan kandidat model
    let candidateModels = [];

    // 1. Jika ada konfigurasi eksplisit di .env
    if (process.env.GEMINI_MODEL) {
      candidateModels.push(process.env.GEMINI_MODEL.trim());
    }

    // 2. Cek model aktif via ListModels API
    try {
      console.log('🔍 [AI Service] Mengambil daftar model aktif dari Google AI Studio...');
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
      if (listRes.ok) {
        const listData = await listRes.json();
        const availableModels = (listData.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));

        console.log('📋 [AI Service] Model yang tersedia untuk API Key Anda:', availableModels);

        // Urutkan model berdasarkan prioritas kestabilan (hindari model experimental thinking yang suka print log)
        const preferredPriority = [
          'gemini-1.5-flash',
          'gemini-1.5-flash-latest',
          'gemini-2.0-flash',
          'gemini-1.5-pro',
          'gemini-1.5-pro-latest',
          'gemini-pro'
        ];

        for (const pref of preferredPriority) {
          if (availableModels.includes(pref) && !candidateModels.includes(pref)) {
            candidateModels.push(pref);
          }
        }

        // Tambahkan model non-thinking lainnya
        for (const m of availableModels) {
          if (!candidateModels.includes(m) && !m.includes('thinking')) {
            candidateModels.push(m);
          }
        }
      } else {
        const errJson = await listRes.json().catch(() => ({}));
        console.warn('⚠️ [AI Service] Gagal list models:', errJson.error?.message || listRes.status);
      }
    } catch (e) {
      console.warn('⚠️ [AI Service] Error saat list models:', e.message);
    }

    // Fallback default jika list kosong
    if (candidateModels.length === 0) {
      candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    }

    let lastError = null;

    // 3. Coba kirim request ke kandidat model secara berurutan hingga berhasil
    for (const modelName of candidateModels) {
      const formattedModel = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${formattedModel}:generateContent?key=${cleanKey}`;

      console.log(`🤖 [AI Service] Mencoba model: ${formattedModel}...`);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstructionText }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: userQuestion }]
              }
            ],
            generationConfig: {
              temperature: 0.7
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error?.message || `HTTP ${response.status}`;
          console.warn(`⚠️ [AI Service] Model ${formattedModel} gagal: ${errMsg}`);
          lastError = new Error(errMsg);
          continue; // Coba model berikutnya
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        // Ambil hanya part yang bukan 'thought'
        const validTextParts = parts
          .filter(p => !p.thought && typeof p.text === 'string')
          .map(p => p.text);

        let answer = validTextParts.length > 0 ? validTextParts.join('\n') : (parts[0]?.text || '');

        if (answer) {
          // Bersihkan teks jika model masih mengeluarkan catatan draf/scratchpad
          answer = this._sanitizeOutput(answer);

          console.log(`✅ [AI Service] Berhasil menerima jawaban dari model: ${formattedModel}!`);
          return answer;
        }
      } catch (err) {
        console.warn(`⚠️ [AI Service] Network error pada ${formattedModel}:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('Semua model Gemini yang dicoba gagal merespons.');
  },

  /**
   * Membersihkan output agar rapi dan tanpa karakter bintang (*) sama sekali
   */
  _sanitizeOutput(text) {
    if (!text) return '';
    let result = text.trim();

    // 1. Jika model menghasilkan draf jamak (Draft 1 / Draft 2), ambil respon final
    const draftSplits = result.split(/(?:\*+\s*\*Draft \d+:?\*+|\* Draft \d+:?)/i);
    if (draftSplits.length > 1) {
      result = draftSplits[draftSplits.length - 1].trim();
    }

    // 2. Jika model menuliskan "* User input:" atau "* Objective:" di awal
    if (result.startsWith('* User input:') || result.startsWith('* Objective:')) {
      const parts = result.split(/\n\n+/);
      result = parts[parts.length - 1] || result;
    }

    // 3. Ubah bullet bertanda bintang (* item) menjadi bullet bulat rapi (• item)
    result = result.replace(/^([ \t]*)\*+[ \t]+/gm, '$1• ');

    // 4. Hapus format bold/italic bertanda bintang (**teks** -> teks, *teks* -> teks)
    result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
    result = result.replace(/\*([^*]+)\*/g, '$1');

    // 5. Hapus semua sisa karakter bintang (*) yang masih tersisa
    result = result.replace(/\*/g, '');

    // 6. Bersihkan sisa tanda petik ganda pembungkus jika ada
    result = result.replace(/^"|"$/g, '').replace(/\n"([^"]+)"/g, '\n$1');

    return result.trim();
  },

  /**
   * Memanggil Local AI Ollama API
   */
  async _callOllamaAPI(prompt, baseUrl) {
    try {
      const model = process.env.OLLAMA_MODEL || 'llama3';
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error with status ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error calling Ollama API:', error.message);
      throw error;
    }
  },

  /**
   * Respon simulasi jika pengguna belum memasang API key
   */
  _generateFallbackResponse(userQuestion) {
    return (
      `[Simulasi Audit Pro Assistant]\n\n` +
      `Pertanyaan Anda: "${userQuestion}"\n\n` +
      `Sistem AI backend telah terhubung dan siap digunakan. ` +
      `Untuk menghubungkan ke AI nyata (Google Gemini), silakan isi GEMINI_API_KEY di file backend/.env Anda.`
    );
  }
};

module.exports = AIService;

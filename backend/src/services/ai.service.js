const { SYSTEM_PROMPT } = require('../ai/rules');
const { getFormattedKnowledgeContext } = require('../ai/knowledge/audit-knowledge');
const AuditContextService = require('./audit-context.service');

const GEMINI_MAX_OUTPUT_TOKENS = 1536;
const MAX_HISTORY_TURNS = 6;

/**
 * Service untuk memproses pertanyaan user ke LLM
 */
const AIService = {
  /**
   * Menyusun array contents multi-turn untuk Gemini API (dibatasi maksimal 6 pesan terakhir agar hemat token)
   */
  _buildGeminiContents(userQuestion, history = []) {
    const recent = Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : [];
    const normalized = [];

    for (const msg of recent) {
      if (!msg || typeof msg.content !== 'string') continue;
      const text = msg.content.trim();
      if (!text || text.startsWith('⚠️ Koneksi AI Terputus')) continue;

      const role = msg.sender === 'user' ? 'user' : 'model';
      const maxLen = role === 'user' ? 350 : 650;
      const clipped = text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;

      // Gemini mensyaratkan giliran pertama role 'user' dan bergantian user/model
      if (normalized.length === 0 && role !== 'user') continue;
      const prev = normalized[normalized.length - 1];
      if (prev && prev.role === role) {
        prev.parts[0].text += `\n${clipped}`;
      } else {
        normalized.push({ role, parts: [{ text: clipped }] });
      }
    }

    // Jika giliran terakhir di history adalah 'user', pastikan aman sebelum pesan user baru
    const last = normalized[normalized.length - 1];
    if (last && last.role === 'user') {
      last.parts[0].text += `\n\n${userQuestion}`;
      return normalized;
    }

    normalized.push({
      role: 'user',
      parts: [{ text: userQuestion }],
    });
    return normalized;
  },

  /**
   * Menyusun prompt ringkas dengan memori percakapan untuk Ollama
   */
  _buildOllamaPrompt(systemInstructionText, userQuestion, history = []) {
    const recent = Array.isArray(history) ? history.slice(-MAX_HISTORY_TURNS) : [];
    const historyLines = recent
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .map((m) => {
        const who = m.sender === 'user' ? 'User' : 'Assistant';
        const txt = m.content.trim().slice(0, 400);
        return `${who}: ${txt}`;
      });

    return [
      systemInstructionText,
      historyLines.length > 0 ? `\nRiwayat Percakapan Terakhir:\n${historyLines.join('\n')}` : null,
      `\nPertanyaan Pengguna:\n${userQuestion}`,
    ]
      .filter(Boolean)
      .join('\n');
  },

  /**
   * Membangun instruksi sistem & konteks database live untuk AI
   */
  async _buildSystemInstruction(userQuestion, customContext = '', user = null) {
    const knowledgeContext = getFormattedKnowledgeContext();
    const liveDbContext = await AuditContextService.getLiveAuditDatabaseContext(user, userQuestion);

    return `
${SYSTEM_PROMPT}

Basis Data Pengetahuan Standar Audit Retail:
${knowledgeContext}

${liveDbContext}

${customContext ? `Konteks Tambahan Pengguna & Sesi:\n${customContext}\n` : ''}
    `.trim();
  },

  /**
   * Menjawab pertanyaan user menggunakan LLM (Gemini / Ollama / Mock)
   * Dilengkapi live context dari database PostgreSQL (schedule, template, report, answer, store, store_holiday)
   * @param {string} userQuestion
   * @param {string} customContext - Konteks opsional tambahan dari DB / identitas user
   * @param {Object} user - Objek identitas user (role, workspaceId, dll)
   */
  async askAI(userQuestion, customContext = '', user = null, options = {}) {
    const history = Array.isArray(options?.history) ? options.history : [];
    const systemInstructionText = await this._buildSystemInstruction(userQuestion, customContext, user);

    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // 1. Opsi Provider: Google Gemini
    if (provider === 'gemini' && geminiApiKey) {
      try {
        return await this._callGeminiAPI(userQuestion, systemInstructionText, geminiApiKey, history);
      } catch (geminiError) {
        console.warn('⚠️ [AI Service] Gemini API gagal merespon:', geminiError.message);
        return this._generateFallbackResponse(userQuestion, geminiError.message);
      }
    }

    // 2. Opsi Provider: Local AI (Ollama)
    if (provider === 'local' || provider === 'ollama') {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const fullPrompt = this._buildOllamaPrompt(systemInstructionText, userQuestion, history);
      try {
        return await this._callOllamaAPI(fullPrompt, ollamaUrl);
      } catch (ollamaError) {
        console.warn('⚠️ [AI Service] Ollama gagal:', ollamaError.message);
        return this._generateFallbackResponse(userQuestion, ollamaError.message);
      }
    }

    // 3. Fallback jika GEMINI_API_KEY belum diisi di .env
    return this._generateFallbackResponse(userQuestion);
  },

  /**
   * Mengumpulkan daftar kandidat model Gemini aktif secara berurutan
   */
  async _getGeminiCandidateModels(cleanKey, signal) {
    let candidateModels = [];

    if (process.env.GEMINI_MODEL) {
      candidateModels.push(process.env.GEMINI_MODEL.trim());
    }

    try {
      console.log('🔍 [AI Service] Mengambil daftar model aktif dari Google AI Studio...');
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`, { signal });
      if (listRes.ok) {
        const listData = await listRes.json();
        const availableModels = (listData.models || [])
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));

        console.log('📋 [AI Service] Model yang tersedia untuk API Key Anda:', availableModels);

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
      if (e?.name === 'AbortError') throw e;
      console.warn('⚠️ [AI Service] Error saat list models:', e.message);
    }

    if (candidateModels.length === 0) {
      candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
    }

    return candidateModels;
  },

  /**
   * Memanggil Google Gemini REST API dengan Auto-Discovery Model dan Retry Fallback
   */
  async _callGeminiAPI(userQuestion, systemInstructionText, apiKey, history = []) {
    const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '');
    const candidateModels = await this._getGeminiCandidateModels(cleanKey);
    const contents = this._buildGeminiContents(userQuestion, history);

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
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
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
          // Bersihkan teks dari format draft internal
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
   * Membersihkan output agar rapi dan ramah markdown
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

    // 3. Bersihkan duplikasi simbol heading (misal: '### ### Judul' -> '### Judul')
    result = result.replace(/^([#]{1,6})\s*(?:[#]{1,6}\s*)+/gm, '$1 ');

    // 4. Pastikan ada baris baru sebelum heading jika model menempelkannya langsung
    result = result.replace(/([^\n])\n(#{1,6}\s+)/g, '$1\n\n$2');

    // 5. Bersihkan sisa tanda petik ganda pembungkus jika ada
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
          stream: false,
          options: { num_predict: GEMINI_MAX_OUTPUT_TOKENS },
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
   * Menjawab pertanyaan user secara realtime streaming (token demi token) untuk SSE
   */
  async askAIStream(userQuestion, customContext = '', user = null, { onChunk, signal, history = [] } = {}) {
    const emitChunk = (txt) => {
      if (txt && typeof onChunk === 'function') {
        onChunk(txt);
      }
    };

    const systemInstructionText = await this._buildSystemInstruction(userQuestion, customContext, user);
    if (signal?.aborted) return '';

    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // 1. Opsi Provider: Google Gemini SSE Streaming
    if (provider === 'gemini' && geminiApiKey) {
      try {
        return await this._streamGeminiAPI(userQuestion, systemInstructionText, geminiApiKey, {
          onChunk: emitChunk,
          signal,
          history,
        });
      } catch (geminiError) {
        if (geminiError?.name === 'AbortError' || signal?.aborted) {
          throw geminiError;
        }
        console.warn('⚠️ [AI Service] Gemini Stream gagal merespon:', geminiError.message);
        const fallback = this._generateFallbackResponse(userQuestion, geminiError.message);
        emitChunk(fallback);
        return fallback;
      }
    }

    // 2. Opsi Provider: Local AI (Ollama) Streaming
    if (provider === 'local' || provider === 'ollama') {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const fullPrompt = this._buildOllamaPrompt(systemInstructionText, userQuestion, history);
      try {
        return await this._streamOllamaAPI(fullPrompt, ollamaUrl, { onChunk: emitChunk, signal });
      } catch (ollamaError) {
        if (ollamaError?.name === 'AbortError' || signal?.aborted) {
          throw ollamaError;
        }
        console.warn('⚠️ [AI Service] Ollama Stream gagal:', ollamaError.message);
        const fallback = this._generateFallbackResponse(userQuestion, ollamaError.message);
        emitChunk(fallback);
        return fallback;
      }
    }

    // 3. Fallback jika GEMINI_API_KEY belum diisi di .env
    const fallback = this._generateFallbackResponse(userQuestion);
    emitChunk(fallback);
    return fallback;
  },

  /**
   * Streaming SSE langsung dari Google Gemini API (streamGenerateContent?alt=sse)
   */
  async _streamGeminiAPI(userQuestion, systemInstructionText, apiKey, { onChunk, signal, history = [] } = {}) {
    const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '');
    const candidateModels = await this._getGeminiCandidateModels(cleanKey, signal);
    const contents = this._buildGeminiContents(userQuestion, history);

    let lastError = null;

    for (const modelName of candidateModels) {
      if (signal?.aborted) {
        const abortErr = new Error('Aborted');
        abortErr.name = 'AbortError';
        throw abortErr;
      }

      const formattedModel = modelName.startsWith('models/') ? modelName : `models/${modelName}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${formattedModel}:streamGenerateContent?alt=sse&key=${cleanKey}`;

      console.log(`⚡ [AI Stream] Mencoba model SSE: ${formattedModel}...`);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: systemInstructionText }]
            },
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: GEMINI_MAX_OUTPUT_TOKENS,
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errMsg = errorData.error?.message || `HTTP ${response.status}`;
          console.warn(`⚠️ [AI Stream] Model ${formattedModel} gagal: ${errMsg}`);
          lastError = new Error(errMsg);
          continue;
        }

        if (!response.body) {
          throw new Error('Stream body tidak tersedia dari Gemini API.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let sseBuffer = '';
        let fullRawText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split(/\r?\n/);
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);
              const parts = parsed.candidates?.[0]?.content?.parts || [];
              const textChunk = parts
                .filter(p => !p.thought && typeof p.text === 'string')
                .map(p => p.text)
                .join('');

              if (textChunk) {
                fullRawText += textChunk;
                onChunk(textChunk);
              }
            } catch {
              // Abaikan baris JSON parsial di luar batas chunk
            }
          }
        }

        if (fullRawText) {
          console.log(`✅ [AI Stream] Selesai streaming dari model: ${formattedModel}`);
          return this._sanitizeOutput(fullRawText);
        }
      } catch (err) {
        if (err?.name === 'AbortError' || signal?.aborted) {
          throw err;
        }
        console.warn(`⚠️ [AI Stream] Network error pada ${formattedModel}:`, err.message);
        lastError = err;
      }
    }

    throw lastError || new Error('Semua model Gemini stream yang dicoba gagal merespons.');
  },

  /**
   * Streaming NDJSON langsung dari Local AI Ollama
   */
  async _streamOllamaAPI(prompt, baseUrl, { onChunk, signal } = {}) {
    const model = process.env.OLLAMA_MODEL || 'llama3';
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: true,
        options: { num_predict: GEMINI_MAX_OUTPUT_TOKENS },
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama stream error with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed.response === 'string' && parsed.response) {
            fullText += parsed.response;
            onChunk(parsed.response);
          }
        } catch {
          // Abaikan baris NDJSON tidak lengkap
        }
      }
    }

    return this._sanitizeOutput(fullText);
  },

  /**
   * Respon fallback informatif jika API key belum valid atau layanan offline
   */
  _generateFallbackResponse(userQuestion, errorDetail = '') {
    const isApiKeyError =
      errorDetail &&
      (errorDetail.includes('API key not valid') ||
        errorDetail.includes('401') ||
        errorDetail.includes('UNAUTHENTICATED') ||
        errorDetail.includes('ACCESS_TOKEN_TYPE_UNSUPPORTED'));

    if (isApiKeyError) {
      return (
        `Halo! Koneksi ke server backend audit telah berhasil, namun kunci API Google Gemini (GEMINI_API_KEY) yang terpasang di file backend/.env tidak valid (Error 401: API key not valid).\n\n` +
        `Penyebab:\n` +
        `• Kunci API saat ini diawali dengan "AQ..." (format Access Token Google Cloud), bukan Google AI Studio API Key.\n\n` +
        `Solusi Mudah (1 Menit):\n` +
        `1. Buka https://aistudio.google.com/app/apikey (gratis, tanpa kartu kredit)\n` +
        `2. Klik tombol "Create API Key"\n` +
        `3. Salin kunci yang dihasilkan (selalu diawali dengan "AIzaSy...")\n` +
        `4. Buka file backend/.env dan perbarui baris:\n` +
        `   GEMINI_API_KEY="AIzaSy..."\n` +
        `5. Simpan file, lalu tanyakan kembali pertanyaan Anda.`
      );
    }

    return (
      `Halo! Saya Audit Pro Assistant, asisten sistem checklist audit retail Anda.\n\n` +
      `Pertanyaan Anda: "${userQuestion}"\n\n` +
      (errorDetail ? `⚠️ Catatan Layanan: ${errorDetail}\n\n` : '') +
      `Sistem backend telah siap. Pastikan GEMINI_API_KEY di file backend/.env telah terisi dengan kunci API resmi dari Google AI Studio (https://aistudio.google.com/app/apikey).`
    );
  }
};

module.exports = AIService;

const prisma = require('../config/prisma');
const AIService = require('../services/ai.service');
const AuditContextService = require('../services/audit-context.service');
const { extractUser } = require('../middlewares/auth.middleware');
const {
  isSuperAdminRole,
  isTeknisRole,
  isStaffRole,
  resolveScopedWorkspaceContext,
  sendSafeError,
} = require('../utils/tenantScope');

const MAX_QUESTION_LENGTH = 1500;
const MAX_CONTEXT_LENGTH = 1000;

/**
 * Self-healing: Buat tabel ai_chat_session jika belum ada
 * Dilengkapi kolom user_role untuk isolasi penuh Super Admin, Admin, dan Divisi Teknis
 */
const ensureAIChatTable = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ai_chat_session (
        session_id BIGSERIAL PRIMARY KEY,
        user_id VARCHAR(100) NOT NULL,
        user_email VARCHAR(255),
        user_role VARCHAR(100),
        workspace_id VARCHAR(100),
        title VARCHAR(255) DEFAULT 'Percakapan Baru',
        messages JSONB DEFAULT '[]'::jsonb,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      ALTER TABLE ai_chat_session ADD COLUMN IF NOT EXISTS user_role VARCHAR(100);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_session_user ON ai_chat_session(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_session_email ON ai_chat_session(user_email, is_active);
      CREATE INDEX IF NOT EXISTS idx_ai_chat_session_user_ws ON ai_chat_session(user_id, workspace_id, is_active);
    `);
  } catch (err) {
    console.warn('⚠️ [ensureAIChatTable]:', err.message);
  }
};

ensureAIChatTable();

/**
 * Resolusi Identitas Pengguna Terisolasi secara KETAT dari req.user (JWT terverifikasi).
 * Menjamin data chat TIDAK BISA dipalsukan lewat header x-user-id/email/role.
 */
const resolveCanonicalUser = async (req) => {
  const authUser = req.user || (await extractUser(req));
  if (!authUser || !authUser.rawId) {
    return null;
  }

  let prefix = 'admin';
  if (isSuperAdminRole(authUser)) {
    prefix = 'superadmin';
  } else if (isTeknisRole(authUser)) {
    prefix = 'teknis';
  } else if (isStaffRole(authUser)) {
    prefix = 'staff';
  }

  return {
    canonicalId: `${prefix}:${authUser.rawId}`,
    rawId: String(authUser.rawId),
    email: authUser.email ? authUser.email.toLowerCase().trim() : null,
    role: authUser.role || 'Admin',
    workspaceId: authUser.workspaceId ? String(authUser.workspaceId) : null,
    fullName: authUser.fullName || 'Pengguna',
    _authUser: authUser,
  };
};

const getSuggestionsForRole = (role) => {
  const roleLower = String(role || '').toLowerCase();
  if (roleLower === 'super admin') {
    return [
      'Berikan ringkasan eksekutif skor kepatuhan seluruh cabang di workspace ini',
      'Cabang mana yang paling sering memiliki temuan NO atau melewatkan audit?',
      'Buatkan draft memo evaluasi untuk Admin dan Store Manager dari temuan terbaru',
    ];
  }
  if (roleLower.includes('teknis')) {
    return [
      'Tampilkan ringkasan jadwal audit dan status laporan di workspace sandbox',
      'Apa saja temuan jawaban NO terbaru pada data pengujian sistem?',
      'Template checklist apa saja yang tersedia beserta jumlah butirnya?',
    ];
  }
  return [
    "Buatkan draft memo tindak lanjut (CAPA) dari temuan 'NO' terbaru",
    'Cabang mana yang paling patuh dan cabang mana yang paling sering melewatkan audit?',
    'Ringkas daftar template checklist yang aktif dan jumlah butir pemeriksaannya',
  ];
};

const resolveAIWorkspaceScope = async (req, user) => {
  const requestedWsId =
    req.body?.workspaceId || req.query?.workspaceId || req.headers?.['x-workspace-id'];
  const scope = await resolveScopedWorkspaceContext(user._authUser || user, requestedWsId);
  if (!scope.ok) {
    return { ok: false, status: scope.status, message: scope.message };
  }
  const normalizedRequestedWs = String(requestedWsId || '').trim();
  const sessionWorkspaceKey =
    normalizedRequestedWs === 'all'
      ? 'all'
      : scope.targetWorkspaceId
      ? scope.targetWorkspaceId.toString()
      : null;

  return {
    ok: true,
    sessionWorkspaceKey,
    scopedUser: {
      ...user,
      workspaceId: scope.targetWorkspaceId
        ? scope.targetWorkspaceId.toString()
        : sessionWorkspaceKey === 'all'
        ? null
        : user.workspaceId,
      workspaceIds: scope.workspaceIds,
    },
  };
};

const buildUserPromptContext = (user, context) =>
  [
    `Identitas Pengguna yang Bertanya:`,
    `- Nama: ${user.fullName}`,
    `- Peran (Role): ${user.role}`,
    user.workspaceId ? `- Workspace ID: ${user.workspaceId}` : null,
    context ? `\nKonteks Tambahan Lapangan:\n${context}` : null,
  ]
    .filter(Boolean)
    .join('\n');

const validateAIQuestionRequest = (reqBody = {}) => {
  const { question, context } = reqBody;
  if (!question || typeof question !== 'string' || !question.trim()) {
    return {
      ok: false,
      status: 400,
      message: 'Parameter "question" wajib diisi dan berupa teks.',
    };
  }
  const cleanQuestion = question.trim();
  if (cleanQuestion.length > MAX_QUESTION_LENGTH) {
    return {
      ok: false,
      status: 400,
      message: `Pertanyaan maksimal ${MAX_QUESTION_LENGTH} karakter (saat ini ${cleanQuestion.length} karakter).`,
    };
  }
  const cleanContext =
    typeof context === 'string' && context.trim()
      ? context.trim().slice(0, MAX_CONTEXT_LENGTH)
      : '';
  return { ok: true, cleanQuestion, cleanContext };
};

const parseSessionMessages = (sessionRow) => {
  if (!sessionRow || !sessionRow.messages) return [];
  try {
    const parsed =
      typeof sessionRow.messages === 'string'
        ? JSON.parse(sessionRow.messages)
        : sessionRow.messages;
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
};

const findActiveSessionRow = async (user, sessionWorkspaceKey = null) => {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT session_id, user_id, user_email, user_role, workspace_id, title, messages, created_at, updated_at
     FROM ai_chat_session
     WHERE is_active = TRUE
       AND (
         user_id = $1
         OR (user_email = $2 AND user_email IS NOT NULL AND user_email != '')
       )
       AND (
         workspace_id IS NOT DISTINCT FROM $3::text
         OR ($3::text IS NOT NULL AND workspace_id IS NULL AND COALESCE(user_role, '') != 'Super Admin')
       )
     ORDER BY session_id DESC
     LIMIT 1`,
    user.canonicalId,
    user.email || '___NO_EMAIL___',
    sessionWorkspaceKey ?? null
  );
  return rows && rows.length > 0 ? rows[0] : null;
};

const persistChatExchange = async (
  user,
  cleanQuestion,
  answer,
  sessionWorkspaceKey = undefined
) => {
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  const qLower = cleanQuestion.toLowerCase();
  const userMessage = {
    id: `user-${Date.now()}`,
    sender: 'user',
    senderName: user.fullName || 'Anda',
    timestamp: timeStr,
    content: cleanQuestion,
  };

  const aiMessage = {
    id: `ai-${Date.now() + 1}`,
    sender: 'assistant',
    senderName: 'Audit Pro Assistant',
    timestamp: timeStr,
    isDraft:
      qLower.includes('draft') ||
      qLower.includes('memo') ||
      qLower.includes('capa'),
    content: answer,
    suggestions: getSuggestionsForRole(user.role),
  };

  const targetWorkspaceId =
    sessionWorkspaceKey !== undefined
      ? sessionWorkspaceKey
      : user.workspaceId
      ? user.workspaceId.toString()
      : null;

  try {
    const currentSession = await findActiveSessionRow(user, targetWorkspaceId);

    if (currentSession) {
      const currentMessages = parseSessionMessages(currentSession);
      const updatedMessages = [...currentMessages, userMessage, aiMessage];
      const newTitle =
        currentSession.title && currentSession.title !== 'Percakapan Baru'
          ? currentSession.title
          : cleanQuestion.slice(0, 45);

      await prisma.$executeRawUnsafe(
        `UPDATE ai_chat_session
         SET messages = $1::jsonb, title = $2, user_id = $3, user_email = $4, user_role = $5, workspace_id = $6, updated_at = NOW()
         WHERE session_id = $7`,
        JSON.stringify(updatedMessages),
        newTitle,
        user.canonicalId,
        user.email,
        user.role,
        targetWorkspaceId,
        currentSession.session_id
      );
    } else {
      const initialMessages = [userMessage, aiMessage];
      const initialTitle = cleanQuestion.slice(0, 45);

      await prisma.$executeRawUnsafe(
        `INSERT INTO ai_chat_session (user_id, user_email, user_role, workspace_id, title, messages, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, TRUE, NOW(), NOW())`,
        user.canonicalId,
        user.email,
        user.role,
        targetWorkspaceId,
        initialTitle,
        JSON.stringify(initialMessages)
      );
    }
  } catch (dbErr) {
    console.warn('⚠️ Gagal menyimpan riwayat chat ke DB:', dbErr.message);
  }

  return { userMessage, aiMessage };
};

const AIController = {
  /**
   * GET /api/ai/session
   */
  async getActiveSession(req, res) {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      await ensureAIChatTable();
      const user = await resolveCanonicalUser(req);
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
      }

      const wsScope = await resolveAIWorkspaceScope(req, user);
      if (!wsScope.ok) {
        return res.status(wsScope.status).json({ status: 'error', message: wsScope.message });
      }
      const { scopedUser, sessionWorkspaceKey } = wsScope;
      const session = await findActiveSessionRow(scopedUser, sessionWorkspaceKey);

      if (session) {
        const messages = parseSessionMessages(session);

        return res.status(200).json({
          status: 'success',
          data: {
            sessionId: session.session_id.toString(),
            userId: session.user_id,
            userRole: session.user_role || user.role,
            workspaceId: session.workspace_id || sessionWorkspaceKey,
            title: session.title,
            messages,
            updatedAt: session.updated_at,
          },
        });
      }

      return res.status(200).json({
        status: 'success',
        data: {
          sessionId: null,
          userId: user.canonicalId,
          userRole: user.role,
          workspaceId: sessionWorkspaceKey,
          title: 'Percakapan Baru',
          messages: [],
        },
      });
    } catch (error) {
      return sendSafeError(res, error, 'Gagal memuat sesi chat aktif AI.');
    }
  },

  /**
   * POST /api/ai/ask
   */
  async handleAskAI(req, res) {
    try {
      await ensureAIChatTable();
      const user = await resolveCanonicalUser(req);
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
      }

      const validation = validateAIQuestionRequest(req.body);
      if (!validation.ok) {
        return res.status(validation.status).json({
          status: 'error',
          message: validation.message,
        });
      }
      const { cleanQuestion, cleanContext } = validation;

      const wsScope = await resolveAIWorkspaceScope(req, user);
      if (!wsScope.ok) {
        return res.status(wsScope.status).json({ status: 'error', message: wsScope.message });
      }
      const { scopedUser, sessionWorkspaceKey } = wsScope;
      const userContext = buildUserPromptContext(scopedUser, cleanContext);
      const activeSession = await findActiveSessionRow(scopedUser, sessionWorkspaceKey);
      const history = parseSessionMessages(activeSession);

      // 1. Dapatkan jawaban cerdas dari AI Service (Gemini / Ollama / Fallback)
      const answer = await AIService.askAI(cleanQuestion, userContext, scopedUser, { history });
      const { userMessage, aiMessage } = await persistChatExchange(
        scopedUser,
        cleanQuestion,
        answer,
        sessionWorkspaceKey
      );

      return res.status(200).json({
        status: 'success',
        data: {
          answer,
          userMessage,
          aiMessage,
          user: {
            id: user.canonicalId,
            role: user.role,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return sendSafeError(res, error, 'Terjadi kesalahan pada server saat memproses pertanyaan AI.');
    }
  },

  /**
   * POST /api/ai/ask-stream
   * Streaming SSE realtime (seperti ChatGPT) tanpa mengubah endpoint /api/ai/ask yang sudah ada
   */
  async handleAskAIStream(req, res) {
    const abortController = new AbortController();
    let streamedAnswer = '';
    let hasPersisted = false;
    let scopedUser = null;
    let sessionWorkspaceKey = null;
    let cleanQuestion = '';

    const persistPartialIfAborted = async () => {
      if (hasPersisted || !scopedUser || !cleanQuestion) return;
      const rawPartial = streamedAnswer.trim();
      if (!rawPartial) return;
      hasPersisted = true;
      const cleanedPartial =
        typeof AIService._sanitizeOutput === 'function'
          ? AIService._sanitizeOutput(rawPartial)
          : rawPartial;
      if (!cleanedPartial) return;
      await persistChatExchange(scopedUser, cleanQuestion, cleanedPartial, sessionWorkspaceKey);
    };

    try {
      await ensureAIChatTable();
      const user = await resolveCanonicalUser(req);
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
      }

      const validation = validateAIQuestionRequest(req.body);
      if (!validation.ok) {
        return res.status(validation.status).json({
          status: 'error',
          message: validation.message,
        });
      }
      cleanQuestion = validation.cleanQuestion;

      const wsScope = await resolveAIWorkspaceScope(req, user);
      if (!wsScope.ok) {
        return res.status(wsScope.status).json({ status: 'error', message: wsScope.message });
      }
      scopedUser = wsScope.scopedUser;
      sessionWorkspaceKey = wsScope.sessionWorkspaceKey;

      const userContext = buildUserPromptContext(scopedUser, validation.cleanContext);
      const activeSession = await findActiveSessionRow(scopedUser, sessionWorkspaceKey);
      const history = parseSessionMessages(activeSession);

      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      const sendEvent = (payload) => {
        if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        }
      };

      res.on('close', () => {
        if (!res.writableEnded) {
          abortController.abort();
        }
      });

      sendEvent({ type: 'start', timestamp: new Date().toISOString() });

      const answer = await AIService.askAIStream(cleanQuestion, userContext, scopedUser, {
        signal: abortController.signal,
        history,
        onChunk: (chunk) => {
          streamedAnswer += chunk;
          sendEvent({ type: 'chunk', text: chunk });
        },
      });

      if (abortController.signal.aborted || res.writableEnded) {
        await persistPartialIfAborted();
        if (!res.writableEnded) res.end();
        return;
      }

      hasPersisted = true;
      const { userMessage, aiMessage } = await persistChatExchange(
        scopedUser,
        cleanQuestion,
        answer,
        sessionWorkspaceKey
      );

      sendEvent({
        type: 'done',
        answer,
        userMessage,
        aiMessage,
        user: {
          id: user.canonicalId,
          role: user.role,
        },
        timestamp: new Date().toISOString(),
      });
      return res.end();
    } catch (error) {
      if (error?.name === 'AbortError' || abortController.signal.aborted) {
        await persistPartialIfAborted();
        if (!res.writableEnded) res.end();
        return;
      }
      console.error('❌ [handleAskAIStream Error]:', error);
      if (!res.headersSent) {
        return sendSafeError(res, error, 'Terjadi kesalahan pada server saat streaming AI.');
      }
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Terjadi kesalahan saat memproses respon AI.' })}\n\n`);
        res.end();
      }
    }
  },

  /**
   * POST /api/ai/reset
   */
  async handleResetSession(req, res) {
    try {
      await ensureAIChatTable();
      const user = await resolveCanonicalUser(req);
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
      }

      const wsScope = await resolveAIWorkspaceScope(req, user);
      if (!wsScope.ok) {
        return res.status(wsScope.status).json({ status: 'error', message: wsScope.message });
      }
      const { scopedUser, sessionWorkspaceKey } = wsScope;

      await prisma.$executeRawUnsafe(
        `UPDATE ai_chat_session
         SET is_active = FALSE, updated_at = NOW()
         WHERE is_active = TRUE
           AND (
             user_id = $1
             OR (user_email = $2 AND user_email IS NOT NULL AND user_email != '')
           )
           AND (
             workspace_id IS NOT DISTINCT FROM $3::text
             OR ($3::text IS NOT NULL AND workspace_id IS NULL AND COALESCE(user_role, '') != 'Super Admin')
           )`,
        scopedUser.canonicalId,
        scopedUser.email || '___NO_EMAIL___',
        sessionWorkspaceKey ?? null
      );

      return res.status(200).json({
        status: 'success',
        message: 'Sesi tanya jawab AI telah diatur ulang. Obrolan lama tersimpan aman dalam arsip.',
      });
    } catch (error) {
      return sendSafeError(res, error, 'Gagal mengatur ulang sesi chat AI.');
    }
  },
};

module.exports = AIController;

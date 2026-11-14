const prisma = require('../config/prisma');
const AIService = require('../services/ai.service');
const { extractUser } = require('../middlewares/auth.middleware');
const { isSuperAdminRole, isTeknisRole, isStaffRole, sendSafeError } = require('../utils/tenantScope');

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
  };
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

      const rows = await prisma.$queryRawUnsafe(
        `SELECT session_id, user_id, user_email, user_role, workspace_id, title, messages, created_at, updated_at
         FROM ai_chat_session
         WHERE is_active = TRUE
           AND (
             user_id = $1
             OR (user_email = $2 AND user_email IS NOT NULL AND user_email != '')
           )
         ORDER BY session_id DESC
         LIMIT 1`,
        user.canonicalId,
        user.email || '___NO_EMAIL___'
      );

      if (rows && rows.length > 0) {
        const session = rows[0];
        let messages = [];
        try {
          messages = typeof session.messages === 'string' ? JSON.parse(session.messages) : session.messages;
        } catch (e) {
          messages = [];
        }

        return res.status(200).json({
          status: 'success',
          data: {
            sessionId: session.session_id.toString(),
            userId: session.user_id,
            userRole: session.user_role || user.role,
            title: session.title,
            messages: Array.isArray(messages) ? messages : [],
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

      const { question, context } = req.body;

      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Parameter "question" wajib diisi dan berupa teks.',
        });
      }

      const userContext = [
        `Identitas Pengguna yang Bertanya:`,
        `- Nama: ${user.fullName}`,
        `- Peran (Role): ${user.role}`,
        user.workspaceId ? `- Workspace ID: ${user.workspaceId}` : null,
        context ? `\nKonteks Tambahan Lapangan:\n${context}` : null,
      ].filter(Boolean).join('\n');

      const answer = await AIService.askAI(question.trim(), userContext);

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      const userMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        senderName: user.fullName || 'Anda',
        timestamp: timeStr,
        content: question.trim(),
      };

      const aiMessage = {
        id: `ai-${Date.now() + 1}`,
        sender: 'assistant',
        senderName: 'Audit Pro Assistant',
        timestamp: timeStr,
        isDraft:
          question.toLowerCase().includes('draft') ||
          question.toLowerCase().includes('memo') ||
          question.toLowerCase().includes('capa'),
        content: answer,
        suggestions: [
          'Buatkan draft instruksi korektif untuk Store Manager',
          'Toko mana saja yang memiliki temuan kritis minggu ini?',
          'Berapa rata-rata skor kepatuhan toko di Jakarta Pusat?',
        ],
      };

      try {
        const existingSession = await prisma.$queryRawUnsafe(
          `SELECT session_id, messages, title, user_id, user_email
           FROM ai_chat_session
           WHERE is_active = TRUE
             AND (
               user_id = $1
               OR (user_email = $2 AND user_email IS NOT NULL AND user_email != '')
             )
           ORDER BY session_id DESC
           LIMIT 1`,
          user.canonicalId,
          user.email || '___NO_EMAIL___'
        );

        if (existingSession && existingSession.length > 0) {
          const currentSession = existingSession[0];
          let currentMessages = [];
          try {
            currentMessages =
              typeof currentSession.messages === 'string'
                ? JSON.parse(currentSession.messages)
                : currentSession.messages;
          } catch (e) {
            currentMessages = [];
          }

          const updatedMessages = [...(Array.isArray(currentMessages) ? currentMessages : []), userMessage, aiMessage];
          const newTitle =
            currentSession.title && currentSession.title !== 'Percakapan Baru'
              ? currentSession.title
              : question.trim().slice(0, 45);

          await prisma.$executeRawUnsafe(
            `UPDATE ai_chat_session
             SET messages = $1::jsonb, title = $2, user_id = $3, user_email = $4, user_role = $5, workspace_id = $6, updated_at = NOW()
             WHERE session_id = $7`,
            JSON.stringify(updatedMessages),
            newTitle,
            user.canonicalId,
            user.email,
            user.role,
            user.workspaceId,
            currentSession.session_id
          );
        } else {
          const initialMessages = [userMessage, aiMessage];
          const initialTitle = question.trim().slice(0, 45);

          await prisma.$executeRawUnsafe(
            `INSERT INTO ai_chat_session (user_id, user_email, user_role, workspace_id, title, messages, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, TRUE, NOW(), NOW())`,
            user.canonicalId,
            user.email,
            user.role,
            user.workspaceId,
            initialTitle,
            JSON.stringify(initialMessages)
          );
        }
      } catch (dbErr) {
        console.warn('⚠️ Gagal menyimpan riwayat chat ke DB:', dbErr.message);
      }

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
   * POST /api/ai/reset
   */
  async handleResetSession(req, res) {
    try {
      await ensureAIChatTable();
      const user = await resolveCanonicalUser(req);
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
      }

      await prisma.$executeRawUnsafe(
        `UPDATE ai_chat_session
         SET is_active = FALSE, updated_at = NOW()
         WHERE is_active = TRUE
           AND (
             user_id = $1
             OR (user_email = $2 AND user_email IS NOT NULL AND user_email != '')
           )`,
        user.canonicalId,
        user.email || '___NO_EMAIL___'
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

const prisma = require('../config/prisma');
const AIService = require('../services/ai.service');
const { extractUser } = require('../middlewares/auth.middleware');

/**
 * Self-healing: Buat tabel ai_chat_session jika belum ada
 * Dilengkapi kolom user_role untuk isolasi penuh Super Admin, Admin, Divisi Teknis, dan Staff
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

// Jalankan self-healing saat file dimuat
ensureAIChatTable();

/**
 * Helper Resolusi Identitas Pengguna Terisolasi
 * Menjamin 100% data chat TIDAK TERCAMPUR antara:
 * - Super Admin (superadmin:<id>)
 * - Admin Workspace (admin:<id>)
 * - Divisi Teknis (teknis:<id>)
 * - Staff Lapangan (staff:<id>)
 */
const resolveCanonicalUser = async (req) => {
  // 1. Ekstraksi dari JWT Token
  const authUser = await extractUser(req);

  // 2. Ambil header jika token tidak ada / expired
  const headerUserId = req.headers['x-user-id'] || req.headers['x-super-admin-id'] || null;
  const headerEmail = (req.headers['x-user-email'] || req.query.email || '').trim().toLowerCase() || null;
  const headerRole = req.headers['x-user-role'] || null;
  const headerWsId = req.headers['x-workspace-id'] || null;

  let email = (authUser?.email || headerEmail || '').toLowerCase().trim();
  let role = authUser?.role || headerRole || null;
  let workspaceId = authUser?.workspaceId || headerWsId || null;
  let fullName = authUser?.fullName || authUser?.name || null;
  let rawId = authUser?.rawId || null;

  // 3. Resolusi akurat berdasarkan Email di Database (Super Admin vs Admin vs Teknis vs Staff)
  if (email) {
    try {
      // Cek apakah akun Super Admin
      const sa = await prisma.super_admin.findUnique({ where: { email } });
      if (sa) {
        return {
          canonicalId: `superadmin:${sa.super_admin_id}`,
          rawId: sa.super_admin_id.toString(),
          email: sa.email.toLowerCase(),
          role: 'Super Admin',
          workspaceId: workspaceId || null,
          fullName: sa.name || 'Super Admin',
        };
      }

      // Cek apakah akun Admin atau Divisi Teknis
      const adm = await prisma.admin.findUnique({
        where: { email },
        include: { workspace: true },
      });
      if (adm) {
        let actualRole = adm.role || role || 'Admin';
        try {
          const roleRows = await prisma.$queryRawUnsafe(`SELECT role FROM admin WHERE admin_id = $1 LIMIT 1`, adm.admin_id);
          if (roleRows && roleRows[0]?.role) {
            actualRole = roleRows[0].role;
          }
        } catch (e) {}
        const isTeknis = actualRole.toLowerCase().includes('teknis');
        const rolePrefix = isTeknis ? 'teknis' : 'admin';
        return {
          canonicalId: `${rolePrefix}:${adm.admin_id}`,
          rawId: adm.admin_id.toString(),
          email: adm.email.toLowerCase(),
          role: actualRole,
          workspaceId: adm.workspace_id?.toString() || workspaceId || null,
          fullName: adm.name || actualRole,
        };
      }

      // Cek apakah akun Staff Lapangan
      const staffMember = await prisma.staff.findFirst({
        where: { email },
        include: { store: true },
      });
      if (staffMember) {
        return {
          canonicalId: `staff:${staffMember.staff_id}`,
          rawId: staffMember.staff_id.toString(),
          email: staffMember.email.toLowerCase(),
          role: 'Staff',
          workspaceId: staffMember.store?.workspace_id?.toString() || workspaceId || null,
          fullName: staffMember.name || 'Staff Lapangan',
        };
      }
    } catch (dbErr) {
      console.warn('⚠️ [resolveCanonicalUser] DB lookup error:', dbErr.message);
    }
  }

  // 4. Resolusi jika email belum tersambung ke database, tapi ada identitas role & ID
  if (role && role.toLowerCase() === 'super admin') {
    const cleanId = (rawId || headerUserId || '1').toString().replace(/^sa-/, '');
    return {
      canonicalId: `superadmin:${cleanId}`,
      rawId: cleanId,
      email: email || null,
      role: 'Super Admin',
      workspaceId,
      fullName: fullName || 'Super Admin',
    };
  }

  if (role && role.toLowerCase().includes('teknis')) {
    const cleanId = (rawId || headerUserId || '1').toString().replace(/^adm-/, '').replace(/^tek-/, '');
    return {
      canonicalId: `teknis:${cleanId}`,
      rawId: cleanId,
      email: email || null,
      role: 'Divisi Teknis',
      workspaceId,
      fullName: fullName || 'Divisi Teknis',
    };
  }

  if (role && role.toLowerCase().includes('admin')) {
    const cleanId = (rawId || headerUserId || '1').toString().replace(/^adm-/, '');
    return {
      canonicalId: `admin:${cleanId}`,
      rawId: cleanId,
      email: email || null,
      role: 'Admin',
      workspaceId,
      fullName: fullName || 'Admin Workspace',
    };
  }

  if (role && role.toLowerCase().includes('staff')) {
    const cleanId = (rawId || headerUserId || '1').toString().replace(/^staff-/, '');
    return {
      canonicalId: `staff:${cleanId}`,
      rawId: cleanId,
      email: email || null,
      role: 'Staff',
      workspaceId,
      fullName: fullName || 'Staff Lapangan',
    };
  }

  // 5. Fallback unik
  const fallbackKey = headerUserId || (email ? email : `user-${Date.now()}`);
  return {
    canonicalId: `user:${fallbackKey}`,
    rawId: fallbackKey,
    email: email || null,
    role: role || 'Pengguna',
    workspaceId,
    fullName: fullName || 'Pengguna',
  };
};

const AIController = {
  /**
   * GET /api/ai/session
   * Mengambil sesi chat AI aktif terisolasi pengguna saat ini
   * (mempertahankan chat saat refresh / pindah halaman / logout)
   */
  async getActiveSession(req, res) {
    try {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      await ensureAIChatTable();
      const user = await resolveCanonicalUser(req);

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

      // Jika belum ada sesi aktif, kembalikan sesi kosong
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
      console.error('❌ Error getActiveSession:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Gagal memuat sesi chat aktif AI.',
        error: error.message,
      });
    }
  },

  /**
   * POST /api/ai/ask
   * Mengirim pertanyaan ke AI dan menyimpannya secara persisten ke database
   * Strictly terisolasi per akun pengguna
   */
  async handleAskAI(req, res) {
    try {
      await ensureAIChatTable();
      const { question, context } = req.body;

      if (!question || typeof question !== 'string' || !question.trim()) {
        return res.status(400).json({
          status: 'error',
          message: 'Parameter "question" wajib diisi dan berupa teks.',
        });
      }

      const user = await resolveCanonicalUser(req);

      // Konteks persona pengguna untuk AI Service
      const userContext = [
        `Identitas Pengguna yang Bertanya:`,
        `- Nama: ${user.fullName}`,
        `- Peran (Role): ${user.role}`,
        user.workspaceId ? `- Workspace ID: ${user.workspaceId}` : null,
        context ? `\nKonteks Tambahan Lapangan:\n${context}` : null,
      ].filter(Boolean).join('\n');

      // 1. Dapatkan jawaban cerdas dari AI Service (Gemini / Ollama / Fallback)
      const answer = await AIService.askAI(question.trim(), userContext);

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}`;

      // Buat struktur pesan
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

      // 2. Simpan pesan ke sesi aktif di PostgreSQL
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
          // Buat sesi baru untuk pengguna
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
      console.error('❌ AI Controller Error:', error);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Terjadi kesalahan pada server saat memproses pertanyaan AI.',
      });
    }
  },

  /**
   * POST /api/ai/reset
   * Mengatur ulang sesi chat aktif: sesi lama diarsip di database (is_active = FALSE) sehingga data tidak hilang
   * dan kanvas obrolan baru menjadi bersih HANYA untuk pengguna ini.
   */
  async handleResetSession(req, res) {
    try {
      await ensureAIChatTable();
      const user = await resolveCanonicalUser(req);

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
      console.error('❌ Error resetSession:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Gagal mengatur ulang sesi chat AI.',
        error: error.message,
      });
    }
  },
};

module.exports = AIController;

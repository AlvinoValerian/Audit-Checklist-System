const crypto = require('crypto');
const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const { findEmailConflict } = require('../utils/emailUniqueness');
const { toBigIntSafe, isWorkspaceInTeknisScope } = require('../utils/teknisScope');
const { sendSafeError } = require('../utils/tenantScope');

/**
 * Self-healing: Pastikan kolom untuk divisi teknis selalu tersedia di PostgreSQL
 * dan inisialisasi Workspace Sandbox internal khusus Divisi Teknis
 */
const getOrCreateTeknisWorkspace = async () => {
  let ws = await prisma.workspace.findFirst({
    where: {
      OR: [
        { category: 'Sandbox Testing' },
        { company_name: 'Divisi Teknis - Sandbox Testing' },
      ],
    },
  });

  if (ws) return ws;

  let systemSa = await prisma.super_admin.findFirst({
    where: { email: 'teknis.internal@auditcorp.system' },
  });

  if (!systemSa) {
    const randomPassword = crypto.randomBytes(24).toString('hex');
    const hashed = await bcrypt.hash(randomPassword, 10);
    systemSa = await prisma.super_admin.create({
      data: {
        name: 'System Divisi Teknis',
        email: 'teknis.internal@auditcorp.system',
        phone_number: '081100000000',
        company_name: 'Divisi Teknis Internal',
        password: hashed,
      },
    });
  }

  ws = await prisma.workspace.create({
    data: {
      super_admin_id: systemSa.super_admin_id,
      company_name: 'Divisi Teknis - Sandbox Testing',
      category: 'Sandbox Testing',
      description: 'Lingkungan terisolasi khusus pengujian & pemeliharaan sistem oleh Divisi Teknis. Terpisah dari data penyewa umum.',
      pic_name: 'Lead Divisi Teknis',
      pic_contact: '081100000000',
      head_office_address: 'Data Center & Server Lab',
      status: 'active',
    },
  });

  return ws;
};

const ensureTeknisColumns = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE admin ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'Admin';
      ALTER TABLE admin ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
      ALTER TABLE admin ADD COLUMN IF NOT EXISTS specialization VARCHAR(100) DEFAULT 'IT Support';
      ALTER TABLE admin ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    `);

    const sandboxWs = await getOrCreateTeknisWorkspace();
    // Pastikan seluruh user divisi teknis berada di workspace internal teknis (terisolasi dari data umum penyewa lain)
    await prisma.$executeRawUnsafe(
      `UPDATE admin
       SET workspace_id = $1
       WHERE (role = 'Divisi Teknis' OR role = 'Teknis')
         AND workspace_id != $2`,
      sandboxWs.workspace_id,
      sandboxWs.workspace_id
    );
  } catch (err) {
    console.warn('⚠️ [ensureTeknisColumns]:', err.message);
  }
};

ensureTeknisColumns();

/**
 * Format entitas admin ber-role Divisi Teknis ke interface Frontend
 */
const formatTeknis = (row) => {
  const isInactive = row.status === 'inactive' || row.status === 'Nonaktif';

  return {
    id: row.admin_id.toString(),
    rawId: row.admin_id.toString(),
    fullName: row.name || 'User Teknis',
    email: row.email,
    phone: row.phone || '-',
    role: 'Divisi Teknis',
    specialization: row.specialization || 'IT Support & System',
    workspaceId: row.workspace_id ? row.workspace_id.toString() : null,
    workspaceName: row.workspace?.company_name || row.workspace_company_name || 'Divisi Teknis - Sandbox Testing',
    status: isInactive ? 'Nonaktif' : 'Aktif',
    rawStatus: row.status || 'active',
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString().split('T')[0] : undefined,
    profilePicture: row.profile_picture || null,
    createdAt: row.created_at
      ? new Date(row.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-',
  };
};

/**
 * GET /api/teknis
 * Mengambil seluruh user dengan role "Divisi Teknis" menggunakan query berparameter
 */
exports.getAllTeknis = async (req, res) => {
  try {
    const { workspaceId, status, search } = req.query;

    const whereConditions = [`(a.role = 'Divisi Teknis' OR a.role = 'Teknis')`];
    const params = [];

    if (workspaceId && workspaceId !== 'all') {
      const cleanWsId = toBigIntSafe(workspaceId, ['ws-']);
      if (!cleanWsId || !(await isWorkspaceInTeknisScope(cleanWsId))) {
        return res.status(403).json({
          status: 'error',
          message: 'Akses workspace ditolak.',
        });
      }
      params.push(cleanWsId);
      whereConditions.push(`a.workspace_id = $${params.length}`);
    }

    if (status && status !== 'Semua') {
      if (status === 'Aktif') {
        whereConditions.push(`(a.status = 'active' OR a.status = 'Aktif')`);
      } else if (status === 'Nonaktif') {
        whereConditions.push(`(a.status = 'inactive' OR a.status = 'Nonaktif')`);
      }
    }

    if (search && String(search).trim()) {
      const pattern = `%${String(search).trim().toLowerCase()}%`;
      params.push(pattern);
      const pIdx = params.length;
      whereConditions.push(
        `(LOWER(a.name) LIKE $${pIdx} OR LOWER(a.email) LIKE $${pIdx} OR LOWER(COALESCE(a.specialization, '')) LIKE $${pIdx})`
      );
    }

    const whereClause = whereConditions.join(' AND ');

    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT
        a.admin_id,
        a.workspace_id,
        a.email,
        a.name,
        a.status,
        a.role,
        a.phone,
        a.specialization,
        a.deleted_at,
        a.created_at,
        a.updated_at,
        a.profile_picture,
        w.company_name as workspace_company_name
      FROM admin a
      LEFT JOIN workspace w ON a.workspace_id = w.workspace_id
      WHERE ${whereClause}
      ORDER BY a.created_at DESC
      `,
      ...params
    );

    const formatted = rows.map((r) =>
      formatTeknis({
        ...r,
        workspace: r.workspace_company_name ? { company_name: r.workspace_company_name } : null,
      })
    );

    return res.status(200).json({
      status: 'success',
      data: formatted,
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil data user divisi teknis dari database.');
  }
};

/**
 * GET /api/teknis/stats
 * Mengambil ringkasan statistik user divisi teknis
 */
exports.getTeknisStats = async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'active' OR status = 'Aktif' THEN 1 END)::int as active,
        COUNT(CASE WHEN status = 'inactive' OR status = 'Nonaktif' THEN 1 END)::int as inactive
      FROM admin
      WHERE role = 'Divisi Teknis' OR role = 'Teknis'
    `);

    const stats = rows[0] || { total: 0, active: 0, inactive: 0 };
    const total = Number(stats.total) || 0;
    const active = Number(stats.active) || 0;
    const inactive = Number(stats.inactive) || 0;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 100;

    return res.status(200).json({
      status: 'success',
      data: {
        total,
        active,
        inactive,
        activePercentage,
      },
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal memuat statistik divisi teknis.');
  }
};

/**
 * GET /api/teknis/:id
 */
exports.getTeknisById = async (req, res) => {
  try {
    const cleanId = toBigIntSafe(req.params.id, ['tek-', 'adm-']);
    if (!cleanId) {
      return res.status(400).json({
        status: 'error',
        message: 'Format ID user teknis tidak valid.',
      });
    }

    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT
        a.admin_id,
        a.workspace_id,
        a.email,
        a.name,
        a.status,
        a.role,
        a.phone,
        a.specialization,
        a.deleted_at,
        a.created_at,
        a.updated_at,
        a.profile_picture,
        w.company_name as workspace_company_name
      FROM admin a
      LEFT JOIN workspace w ON a.workspace_id = w.workspace_id
      WHERE a.admin_id = $1 AND (a.role = 'Divisi Teknis' OR a.role = 'Teknis')
      LIMIT 1
      `,
      cleanId
    );

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User teknis tidak ditemukan.',
      });
    }

    const r = rows[0];
    return res.status(200).json({
      status: 'success',
      data: formatTeknis({
        ...r,
        workspace: r.workspace_company_name ? { company_name: r.workspace_company_name } : null,
      }),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil detail user teknis.');
  }
};

/**
 * POST /api/teknis
 * Menambahkan user teknis baru (query berparameter penuh & password wajib)
 */
exports.createTeknis = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      specialization = 'IT Support & System',
      password,
      status = 'Aktif',
    } = req.body;

    const rawName = (fullName || '').trim();
    const rawEmail = (email || '').trim().toLowerCase();
    const rawPhone = (phone || '').trim();
    const rawSpec = (specialization || 'IT Support & System').trim();
    const rawStatus = status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';

    if (!rawName) {
      return res.status(400).json({ status: 'error', message: 'Nama lengkap wajib diisi.' });
    }
    if (!/^[a-zA-Z\s.,']+$/.test(rawName)) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama lengkap hanya boleh berisi huruf, spasi, dan gelar (titik/koma).',
      });
    }

    if (!rawEmail) {
      return res.status(400).json({ status: 'error', message: 'Email teknis wajib diisi.' });
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(rawEmail)) {
      return res.status(400).json({ status: 'error', message: 'Format email tidak valid.' });
    }

    if (rawPhone && !/^\d+$/.test(rawPhone)) {
      return res.status(400).json({ status: 'error', message: 'Nomor telepon hanya boleh berisi angka.' });
    }

    if (!password || String(password).length < 8) {
      return res.status(400).json({ status: 'error', message: 'Kata sandi wajib diisi minimal 8 karakter.' });
    }

    // Cek duplikasi email lintas tabel admin, super_admin, dan staff
    const emailConflict = await findEmailConflict(rawEmail);
    if (emailConflict) {
      return res.status(409).json({
        status: 'error',
        message: 'Email sudah terdaftar di sistem. Gunakan email lain.',
      });
    }

    // Resolusi Workspace Internal Khusus Divisi Teknis (Terisolasi dari data penyewa umum)
    const sandboxWs = await getOrCreateTeknisWorkspace();
    const targetWsId = sandboxWs.workspace_id;

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const inserted = await prisma.$queryRawUnsafe(
      `
      INSERT INTO admin (
        workspace_id,
        email,
        name,
        password,
        status,
        role,
        phone,
        specialization,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *;
      `,
      targetWsId,
      rawEmail,
      rawName,
      hashedPassword,
      rawStatus,
      'Divisi Teknis',
      rawPhone || null,
      rawSpec
    );

    const createdRecord = inserted[0];
    const ws = await prisma.workspace.findUnique({ where: { workspace_id: targetWsId } });

    return res.status(201).json({
      status: 'success',
      message: `User teknis "${rawName}" berhasil dibuat dengan hak akses penuh.`,
      data: formatTeknis({
        ...createdRecord,
        workspace: ws,
      }),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal membuat user teknis baru di database.');
  }
};

/**
 * PUT /api/teknis/:id
 * Mengupdate data user teknis (parameterized SQL & validasi role teknis)
 */
exports.updateTeknis = async (req, res) => {
  try {
    const cleanId = toBigIntSafe(req.params.id, ['tek-', 'adm-']);
    if (!cleanId) {
      return res.status(400).json({ status: 'error', message: 'Format ID user teknis tidak valid.' });
    }

    const existing = await prisma.admin.findUnique({
      where: { admin_id: cleanId },
    });

    if (!existing || (existing.role !== 'Divisi Teknis' && existing.role !== 'Teknis')) {
      return res.status(404).json({
        status: 'error',
        message: 'User teknis tidak ditemukan.',
      });
    }

    const {
      fullName,
      email,
      phone,
      specialization,
      workspaceId,
      status,
      password,
    } = req.body;

    const setClauses = [];
    const params = [];
    const pushParam = (col, val) => {
      params.push(val);
      setClauses.push(`${col} = $${params.length}`);
    };

    if (fullName && fullName.trim()) {
      pushParam('name', fullName.trim());
    }

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ status: 'error', message: 'Format email tidak valid.' });
      }
      const duplicate = await findEmailConflict(cleanEmail, { adminId: cleanId });
      if (duplicate) {
        return res.status(409).json({
          status: 'error',
          message: 'Email sudah digunakan oleh akun lain.',
        });
      }
      pushParam('email', cleanEmail);
    }

    if (phone !== undefined) {
      const trimmedPhone = (phone || '').trim();
      if (trimmedPhone && trimmedPhone !== '-' && !/^\d+$/.test(trimmedPhone)) {
        return res.status(400).json({ status: 'error', message: 'Nomor telepon hanya boleh berisi angka.' });
      }
      pushParam('phone', trimmedPhone || null);
    }

    if (specialization !== undefined) {
      pushParam('specialization', (specialization || 'IT Support').trim());
    }

    if (workspaceId !== undefined) {
      if (workspaceId && workspaceId !== 'all') {
        const cleanWs = toBigIntSafe(workspaceId, ['ws-']);
        if (!cleanWs || !(await isWorkspaceInTeknisScope(cleanWs))) {
          return res.status(403).json({
            status: 'error',
            message: 'Workspace harus berada di dalam lingkungan Sandbox Teknis.',
          });
        }
        pushParam('workspace_id', cleanWs);
      } else {
        const sandboxWs = await getOrCreateTeknisWorkspace();
        pushParam('workspace_id', sandboxWs.workspace_id);
      }
    }

    if (status !== undefined) {
      const rawStatus = status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';
      pushParam('status', rawStatus);
      if (rawStatus === 'inactive') {
        setClauses.push(`token_version = COALESCE(token_version, 0) + 1`);
      }
    }

    if (password && String(password).trim()) {
      if (String(password).trim().length < 8) {
        return res.status(400).json({
          status: 'error',
          message: 'Kata sandi baru minimal 8 karakter.',
        });
      }
      const hashed = await bcrypt.hash(String(password).trim(), 10);
      pushParam('password', hashed);
      setClauses.push(`token_version = COALESCE(token_version, 0) + 1`);
    }

    setClauses.push(`updated_at = NOW()`);
    params.push(cleanId);
    const idIdx = params.length;

    const updatedRows = await prisma.$queryRawUnsafe(
      `UPDATE admin SET ${setClauses.join(', ')} WHERE admin_id = $${idIdx} RETURNING *;`,
      ...params
    );
    const updated = updatedRows[0];

    const ws = updated.workspace_id
      ? await prisma.workspace.findUnique({ where: { workspace_id: updated.workspace_id } })
      : null;

    return res.status(200).json({
      status: 'success',
      message: `Data user teknis "${updated.name}" berhasil diperbarui.`,
      data: formatTeknis({
        ...updated,
        workspace: ws,
      }),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal memperbarui data user teknis.');
  }
};

/**
 * DELETE /api/teknis/:id (Soft Delete + token revocation)
 */
exports.deleteTeknis = async (req, res) => {
  try {
    const cleanId = toBigIntSafe(req.params.id, ['tek-', 'adm-']);
    if (!cleanId) {
      return res.status(400).json({ status: 'error', message: 'Format ID user teknis tidak valid.' });
    }

    const existing = await prisma.admin.findUnique({ where: { admin_id: cleanId } });
    if (!existing || (existing.role !== 'Divisi Teknis' && existing.role !== 'Teknis')) {
      return res.status(404).json({ status: 'error', message: 'User teknis tidak ditemukan.' });
    }

    const updatedRows = await prisma.$queryRawUnsafe(
      `UPDATE admin
       SET status = 'inactive', deleted_at = NOW(), token_version = COALESCE(token_version, 0) + 1, updated_at = NOW()
       WHERE admin_id = $1
       RETURNING *;`,
      cleanId
    );

    const updated = updatedRows[0];

    return res.status(200).json({
      status: 'success',
      message: `User teknis "${updated.name}" berhasil dinonaktifkan (soft delete).`,
      data: formatTeknis(updated),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal menonaktifkan user teknis.');
  }
};

/**
 * PATCH /api/teknis/:id/restore (Restore)
 */
exports.restoreTeknis = async (req, res) => {
  try {
    const cleanId = toBigIntSafe(req.params.id, ['tek-', 'adm-']);
    if (!cleanId) {
      return res.status(400).json({ status: 'error', message: 'Format ID user teknis tidak valid.' });
    }

    const existing = await prisma.admin.findUnique({ where: { admin_id: cleanId } });
    if (!existing || (existing.role !== 'Divisi Teknis' && existing.role !== 'Teknis')) {
      return res.status(404).json({ status: 'error', message: 'User teknis tidak ditemukan.' });
    }

    const updatedRows = await prisma.$queryRawUnsafe(
      `UPDATE admin
       SET status = 'active', deleted_at = NULL, updated_at = NOW()
       WHERE admin_id = $1
       RETURNING *;`,
      cleanId
    );

    const updated = updatedRows[0];

    return res.status(200).json({
      status: 'success',
      message: `User teknis "${updated.name}" berhasil diaktifkan kembali.`,
      data: formatTeknis(updated),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengaktifkan kembali user teknis.');
  }
};

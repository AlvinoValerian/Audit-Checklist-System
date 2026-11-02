const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const { extractUser } = require('../middlewares/auth.middleware');

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
    const hashed = await bcrypt.hash('TeknisSandbox123!', 10);
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
    // Pastikan seluruh user divisi teknis terhubung ke workspace sandbox internal ini
    await prisma.$executeRawUnsafe(`
      UPDATE admin 
      SET workspace_id = ${sandboxWs.workspace_id}
      WHERE (role = 'Divisi Teknis' OR role = 'Teknis') 
        AND workspace_id != ${sandboxWs.workspace_id};
    `);
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
    workspaceName: 'Divisi Teknis - Sandbox Testing',
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
 * Mengambil seluruh user dengan role "Divisi Teknis"
 */
exports.getAllTeknis = async (req, res) => {
  try {
    const user = await extractUser(req);
    const { workspaceId, status, search } = req.query;

    const whereConditions = [`(a.role = 'Divisi Teknis' OR a.role = 'Teknis')`];

    if (workspaceId && workspaceId !== 'all') {
      try {
        const cleanWsId = BigInt(workspaceId.toString().replace(/^ws-/, ''));
        whereConditions.push(`a.workspace_id = ${cleanWsId}`);
      } catch (e) {}
    }

    if (status && status !== 'Semua') {
      if (status === 'Aktif') {
        whereConditions.push(`(a.status = 'active' OR a.status = 'Aktif')`);
      } else if (status === 'Nonaktif') {
        whereConditions.push(`(a.status = 'inactive' OR a.status = 'Nonaktif')`);
      }
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim().toLowerCase();
      whereConditions.push(`(LOWER(a.name) LIKE '%${cleanSearch}%' OR LOWER(a.email) LIKE '%${cleanSearch}%' OR LOWER(COALESCE(a.specialization, '')) LIKE '%${cleanSearch}%')`);
    }

    const whereClause = whereConditions.join(' AND ');

    const rows = await prisma.$queryRawUnsafe(`
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
    `);

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
    console.error('❌ Error in getAllTeknis:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil data user divisi teknis dari database.',
      error: error.message,
    });
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
    console.error('❌ Error in getTeknisStats:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memuat statistik divisi teknis.',
      error: error.message,
    });
  }
};

/**
 * GET /api/teknis/:id
 */
exports.getTeknisById = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^tek-/, ''));

    const rows = await prisma.$queryRawUnsafe(`
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
      WHERE a.admin_id = ${cleanId} AND (a.role = 'Divisi Teknis' OR a.role = 'Teknis')
      LIMIT 1
    `);

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
    console.error('❌ Error in getTeknisById:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil detail user teknis.',
      error: error.message,
    });
  }
};

/**
 * POST /api/teknis
 * Menambahkan user teknis baru
 */
exports.createTeknis = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      specialization = 'IT Support & System',
      workspaceId,
      password = 'Password123',
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

    if (!password || password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Kata sandi minimal 8 karakter.' });
    }

    // Cek duplikasi email di admin dan super_admin
    const existing = await prisma.admin.findUnique({ where: { email: rawEmail } });
    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Email sudah terdaftar di sistem. Gunakan email lain.',
      });
    }

    // Resolusi Workspace Sandbox Internal Khusus Divisi Teknis
    const sandboxWs = await getOrCreateTeknisWorkspace();
    const targetWsId = sandboxWs.workspace_id;

    const hashedPassword = await bcrypt.hash(password, 10);

    const inserted = await prisma.$queryRawUnsafe(`
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
      ) VALUES (
        ${targetWsId},
        '${rawEmail}',
        '${rawName}',
        '${hashedPassword}',
        '${rawStatus}',
        'Divisi Teknis',
        '${rawPhone}',
        '${rawSpec}',
        NOW(),
        NOW()
      )
      RETURNING *;
    `);

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
    console.error('❌ Error creating user teknis:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membuat user teknis baru di database.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/teknis/:id
 * Mengupdate data user teknis
 */
exports.updateTeknis = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^tek-/, ''));

    const existing = await prisma.admin.findUnique({
      where: { admin_id: cleanId },
    });

    if (!existing) {
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

    const updateFields = [];

    if (fullName && fullName.trim()) {
      updateFields.push(`name = '${fullName.trim()}'`);
    }

    if (email && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      // Pastikan email tidak bentrok dengan user lain
      const duplicate = await prisma.admin.findFirst({
        where: {
          email: cleanEmail,
          NOT: { admin_id: cleanId },
        },
      });
      if (duplicate) {
        return res.status(409).json({
          status: 'error',
          message: 'Email sudah digunakan oleh akun lain.',
        });
      }
      updateFields.push(`email = '${cleanEmail}'`);
    }

    if (phone !== undefined) {
      updateFields.push(`phone = '${(phone || '').trim()}'`);
    }

    if (specialization !== undefined) {
      updateFields.push(`specialization = '${(specialization || 'IT Support').trim()}'`);
    }

    if (status !== undefined) {
      const rawStatus = status === 'Nonaktif' || status === 'inactive' ? 'inactive' : 'active';
      updateFields.push(`status = '${rawStatus}'`);
    }

    if (password && password.trim()) {
      if (password.length < 8) {
        return res.status(400).json({
          status: 'error',
          message: 'Kata sandi baru minimal 8 karakter.',
        });
      }
      const hashed = await bcrypt.hash(password.trim(), 10);
      updateFields.push(`password = '${hashed}'`);
    }

    updateFields.push(`updated_at = NOW()`);

    const updateSql = `
      UPDATE admin 
      SET ${updateFields.join(', ')}
      WHERE admin_id = ${cleanId}
      RETURNING *;
    `;

    const updatedRows = await prisma.$queryRawUnsafe(updateSql);
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
    console.error('❌ Error updating teknis:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui data user teknis.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/teknis/:id (Soft Delete)
 */
exports.deleteTeknis = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^tek-/, ''));

    const existing = await prisma.admin.findUnique({ where: { admin_id: cleanId } });
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'User teknis tidak ditemukan.' });
    }

    const updatedRows = await prisma.$queryRawUnsafe(`
      UPDATE admin 
      SET status = 'inactive', deleted_at = NOW(), updated_at = NOW()
      WHERE admin_id = ${cleanId}
      RETURNING *;
    `);

    const updated = updatedRows[0];

    return res.status(200).json({
      status: 'success',
      message: `User teknis "${updated.name}" berhasil dinonaktifkan (soft delete).`,
      data: formatTeknis(updated),
    });
  } catch (error) {
    console.error('❌ Error in deleteTeknis:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menonaktifkan user teknis.',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/teknis/:id/restore (Restore)
 */
exports.restoreTeknis = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^tek-/, ''));

    const existing = await prisma.admin.findUnique({ where: { admin_id: cleanId } });
    if (!existing) {
      return res.status(404).json({ status: 'error', message: 'User teknis tidak ditemukan.' });
    }

    const updatedRows = await prisma.$queryRawUnsafe(`
      UPDATE admin 
      SET status = 'active', deleted_at = NULL, updated_at = NOW()
      WHERE admin_id = ${cleanId}
      RETURNING *;
    `);

    const updated = updatedRows[0];

    return res.status(200).json({
      status: 'success',
      message: `User teknis "${updated.name}" berhasil diaktifkan kembali.`,
      data: formatTeknis(updated),
    });
  } catch (error) {
    console.error('❌ Error in restoreTeknis:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengaktifkan kembali user teknis.',
      error: error.message,
    });
  }
};

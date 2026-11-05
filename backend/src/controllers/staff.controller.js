const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const { extractUser } = require('../middlewares/auth.middleware');

/**
 * Self-healing: Pastikan kolom position dan deleted_at selalu tersedia di PostgreSQL
 */
const ensureStaffColumns = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS position VARCHAR(100) DEFAULT 'Auditor Lapangan';
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    `);
  } catch (err) {
    console.warn('⚠️ [ensureStaffColumns]:', err.message);
  }
};

// Jalankan self-healing saat file dimuat
ensureStaffColumns();

/**
 * Format entitas staff PostgreSQL ke interface Frontend StaffUser
 */
const formatStaff = (row) => {
  const isInactive = row.status === 'inactive' || row.status === 'Nonaktif';

  let loc = row.city;
  if (!loc && row.address) {
    if (row.address.includes('Malang')) loc = 'Kota Malang';
    else if (row.address.includes('Surabaya')) loc = 'Kota Surabaya';
    else if (row.address.includes('Bandung')) loc = 'Kota Bandung';
    else if (row.address.includes('Jakarta')) loc = 'DKI Jakarta';
    else loc = row.address.split(',').pop()?.trim() || 'Indonesia';
  }
  if (!loc) loc = 'Indonesia';

  return {
    id: row.staff_id ? row.staff_id.toString() : '',
    rawId: row.staff_id ? row.staff_id.toString() : '',
    fullName: row.name || '',
    email: row.email || '',
    storeId: row.store_id ? row.store_id.toString() : undefined,
    storeName: row.store_name || 'Belum Ditugaskan',
    storeLocation: loc,
    position: row.position || 'Auditor Lapangan',
    status: isInactive ? 'Nonaktif' : 'Aktif',
    rawStatus: row.status || 'active',
    phone: row.phone_number || '-',
    joinDate: row.assigned_at || row.created_at
      ? new Date(row.assigned_at || row.created_at).toLocaleDateString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : '-',
    photo: row.photo || null,
    workspaceId: row.workspace_id ? row.workspace_id.toString() : undefined,
    adminId: row.admin_id ? row.admin_id.toString() : undefined,
    adminName: row.admin_name || null,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : undefined,
  };
};

/**
 * GET /api/staff
 * Mengambil daftar staf dengan join store dan admin, filter workspace, search, status
 */
exports.getAllStaff = async (req, res) => {
  try {
    await ensureStaffColumns();

    const user = await extractUser(req);
    const { workspaceId, storeId, status, search } = req.query;
    const headerWsId = req.headers['x-workspace-id'];
    const activeWsId = (user && (user.role === 'Divisi Teknis' || user.role === 'Teknis') && user.workspaceId)
      ? user.workspaceId
      : (workspaceId || headerWsId);

    let query = `
      SELECT 
        s.*,
        st.store_name,
        st.city,
        st.address,
        st.workspace_id,
        a.name AS admin_name
      FROM staff s
      LEFT JOIN store st ON s.store_id = st.store_id
      LEFT JOIN admin a ON s.admin_id = a.admin_id
      WHERE 1=1
    `;
    const params = [];

    // Filter workspace
    if (activeWsId && activeWsId !== 'all') {
      try {
        const cleanWsId = BigInt(activeWsId.toString().replace(/\D/g, ''));
        params.push(cleanWsId);
        query += ` AND st.workspace_id = $${params.length}`;
      } catch (e) {
        console.warn('⚠️ Invalid workspaceId format:', activeWsId);
      }
    }

    // Filter storeId
    if (storeId) {
      try {
        const cleanStoreId = BigInt(storeId.toString().replace(/\D/g, ''));
        params.push(cleanStoreId);
        query += ` AND s.store_id = $${params.length}`;
      } catch (e) {
        console.warn('⚠️ Invalid storeId format:', storeId);
      }
    }

    // Filter status
    if (status && status !== 'Semua') {
      if (status === 'Aktif' || status === 'active') {
        params.push('active');
        query += ` AND (s.status = 'active' OR s.status = 'Aktif' OR s.status IS NULL)`;
      } else if (status === 'Nonaktif' || status === 'inactive') {
        query += ` AND (s.status = 'inactive' OR s.status = 'Nonaktif')`;
      }
    }

    // Search term
    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      const pIdx = params.length;
      query += ` AND (
        s.name ILIKE $${pIdx} 
        OR s.email ILIKE $${pIdx} 
        OR st.store_name ILIKE $${pIdx} 
        OR st.city ILIKE $${pIdx} 
        OR st.address ILIKE $${pIdx}
      )`;
    }

    query += ` ORDER BY s.staff_id ASC`;

    const rows = await prisma.$queryRawUnsafe(query, ...params);
    const data = rows.map(formatStaff);

    return res.status(200).json({
      status: 'success',
      total: data.length,
      data,
    });
  } catch (error) {
    console.error('❌ Error fetching staff:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memuat data staf',
      error: error.message,
    });
  }
};

/**
 * GET /api/staff/:id
 * Mengambil detail staf berdasarkan staff_id
 */
exports.getStaffById = async (req, res) => {
  try {
    await ensureStaffColumns();
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/\D/g, ''));

    const query = `
      SELECT 
        s.*,
        st.store_name,
        st.city,
        st.address,
        st.workspace_id,
        a.name AS admin_name
      FROM staff s
      LEFT JOIN store st ON s.store_id = st.store_id
      LEFT JOIN admin a ON s.admin_id = a.admin_id
      WHERE s.staff_id = $1
      LIMIT 1
    `;

    const rows = await prisma.$queryRawUnsafe(query, cleanId);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Data staf tidak ditemukan',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: formatStaff(rows[0]),
    });
  } catch (error) {
    console.error('❌ Error fetching staff by id:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memuat detail staf',
      error: error.message,
    });
  }
};

/**
 * POST /api/staff
 * Menambahkan staf baru ke database PostgreSQL
 */
exports.createStaff = async (req, res) => {
  try {
    await ensureStaffColumns();

    const {
      fullName,
      email,
      storeId,
      storeName,
      position = 'Auditor Lapangan',
      status = 'Aktif',
      phone,
      password = 'password123',
    } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Nama lengkap staf wajib diisi',
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Email staf wajib diisi',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Cek duplikasi email di tabel staff
    const existingStaff = await prisma.staff.findUnique({
      where: { email: cleanEmail },
    });

    if (existingStaff) {
      return res.status(400).json({
        status: 'error',
        message: `Email "${cleanEmail}" sudah terdaftar untuk staf lain.`,
      });
    }

    // Resolusi Store
    let resolvedStore = null;
    if (storeId) {
      const cleanStoreId = BigInt(storeId.toString().replace(/\D/g, ''));
      resolvedStore = await prisma.store.findUnique({
        where: { store_id: cleanStoreId },
      });
    }

    if (!resolvedStore && storeName) {
      resolvedStore = await prisma.store.findFirst({
        where: { store_name: { equals: storeName.trim(), mode: 'insensitive' } },
      });
    }

    // Fallback jika tidak ditemukan spesifik, cari toko pertama yang ada
    if (!resolvedStore) {
      const activeWsId = req.headers['x-workspace-id'] || req.query.workspaceId;
      if (activeWsId && activeWsId !== 'all') {
        const cleanWsId = BigInt(activeWsId.toString().replace(/\D/g, ''));
        resolvedStore = await prisma.store.findFirst({
          where: { workspace_id: cleanWsId },
        });
      }
      if (!resolvedStore) {
        resolvedStore = await prisma.store.findFirst();
      }
    }

    if (!resolvedStore) {
      return res.status(400).json({
        status: 'error',
        message: 'Toko penempatan tidak ditemukan dalam database.',
      });
    }

    // Validasi Workspace: jika workspace dinonaktifkan, hentikan penambahan staf
    if (resolvedStore && resolvedStore.workspace_id) {
      const ws = await prisma.workspace.findUnique({
        where: { workspace_id: resolvedStore.workspace_id },
        select: { status: true },
      });
      if (ws && (ws.status === 'inactive' || ws.status === 'Nonaktif')) {
        return res.status(403).json({
          status: 'error',
          message: 'Workspace ini sedang dinonaktifkan. Seluruh sistem operasional dan penambahan staf diberhentikan.',
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const dbStatus = (status === 'Nonaktif' || status === 'inactive') ? 'inactive' : 'active';
    const cleanPhone = phone ? phone.trim() : null;

    // Insert menggunakan SQL Raw agar kolom position & deleted_at terisi aman
    const insertQuery = `
      INSERT INTO staff (
        store_id, admin_id, email, name, phone_number, password, status, position, assigned_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), NOW())
      RETURNING *
    `;

    const insertedRows = await prisma.$queryRawUnsafe(
      insertQuery,
      resolvedStore.store_id,
      resolvedStore.admin_id,
      cleanEmail,
      fullName.trim(),
      cleanPhone,
      hashedPassword,
      dbStatus,
      position || 'Auditor Lapangan'
    );

    const inserted = insertedRows[0];

    // Ambil full dengan join store
    const fullRows = await prisma.$queryRawUnsafe(`
      SELECT 
        s.*,
        st.store_name,
        st.city,
        st.address,
        st.workspace_id,
        a.name AS admin_name
      FROM staff s
      LEFT JOIN store st ON s.store_id = st.store_id
      LEFT JOIN admin a ON s.admin_id = a.admin_id
      WHERE s.staff_id = $1
    `, inserted.staff_id);

    const formatted = formatStaff(fullRows[0]);

    return res.status(201).json({
      status: 'success',
      message: `Staf ${formatted.fullName} berhasil ditambahkan`,
      data: formatted,
    });
  } catch (error) {
    console.error('❌ Error creating staff:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menambahkan staf baru',
      error: error.message,
    });
  }
};

/**
 * PUT /api/staff/:id
 * Mengupdate data staf
 */
exports.updateStaff = async (req, res) => {
  try {
    await ensureStaffColumns();
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/\D/g, ''));

    const {
      fullName,
      email,
      storeId,
      storeName,
      position,
      status,
      phone,
      password,
    } = req.body;

    // Cek keberadaan staf
    const existing = await prisma.staff.findUnique({
      where: { staff_id: cleanId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Data staf tidak ditemukan',
      });
    }

    // Jika email diubah, pastikan tidak bentrok
    if (email && email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const emailDup = await prisma.staff.findUnique({
        where: { email: email.trim().toLowerCase() },
      });
      if (emailDup) {
        return res.status(400).json({
          status: 'error',
          message: `Email "${email.trim()}" sudah digunakan staf lain.`,
        });
      }
    }

    // Resolusi Store baru jika disediakan
    let resolvedStoreId = existing.store_id;
    let resolvedAdminId = existing.admin_id;

    if (storeId) {
      const cleanStoreId = BigInt(storeId.toString().replace(/\D/g, ''));
      const s = await prisma.store.findUnique({ where: { store_id: cleanStoreId } });
      if (s) {
        resolvedStoreId = s.store_id;
        resolvedAdminId = s.admin_id;
      }
    } else if (storeName) {
      const s = await prisma.store.findFirst({
        where: { store_name: { equals: storeName.trim(), mode: 'insensitive' } },
      });
      if (s) {
        resolvedStoreId = s.store_id;
        resolvedAdminId = s.admin_id;
      }
    }

    const newName = fullName !== undefined ? fullName.trim() : existing.name;
    const newEmail = email !== undefined ? email.trim().toLowerCase() : existing.email;
    const newPhone = phone !== undefined ? phone.trim() : existing.phone_number;
    const newPosition = position !== undefined ? position : (existing.position || 'Auditor Lapangan');

    let newStatus = existing.status;
    let newDeletedAt = existing.deleted_at;
    if (status !== undefined) {
      if (status === 'Nonaktif' || status === 'inactive') {
        newStatus = 'inactive';
        newDeletedAt = new Date();
      } else {
        newStatus = 'active';
        newDeletedAt = null;
      }
    }

    let passwordClause = '';
    const params = [
      resolvedStoreId,
      resolvedAdminId,
      newName,
      newEmail,
      newPhone,
      newStatus,
      newPosition,
      newDeletedAt,
    ];

    if (password && password.trim() !== '') {
      const hashed = await bcrypt.hash(password.trim(), 10);
      params.push(hashed);
      passwordClause = `, password = $${params.length}`;
    }

    params.push(cleanId);
    const idIdx = params.length;

    const updateQuery = `
      UPDATE staff
      SET 
        store_id = $1,
        admin_id = $2,
        name = $3,
        email = $4,
        phone_number = $5,
        status = $6,
        position = $7,
        deleted_at = $8,
        updated_at = NOW()
        ${passwordClause}
      WHERE staff_id = $${idIdx}
    `;

    await prisma.$executeRawUnsafe(updateQuery, ...params);

    // Ambil full hasil update
    const fullRows = await prisma.$queryRawUnsafe(`
      SELECT 
        s.*,
        st.store_name,
        st.city,
        st.address,
        st.workspace_id,
        a.name AS admin_name
      FROM staff s
      LEFT JOIN store st ON s.store_id = st.store_id
      LEFT JOIN admin a ON s.admin_id = a.admin_id
      WHERE s.staff_id = $1
    `, cleanId);

    const formatted = formatStaff(fullRows[0]);

    return res.status(200).json({
      status: 'success',
      message: `Data staf ${formatted.fullName} berhasil diperbarui`,
      data: formatted,
    });
  } catch (error) {
    console.error('❌ Error updating staff:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui data staf',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/staff/:id/restore
 * Mengaktifkan kembali staf yang dinonaktifkan
 */
exports.restoreStaff = async (req, res) => {
  try {
    await ensureStaffColumns();
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/\D/g, ''));

    await prisma.$executeRawUnsafe(`
      UPDATE staff
      SET status = 'active', deleted_at = NULL, updated_at = NOW()
      WHERE staff_id = $1
    `, cleanId);

    const fullRows = await prisma.$queryRawUnsafe(`
      SELECT 
        s.*,
        st.store_name,
        st.city,
        st.address,
        st.workspace_id,
        a.name AS admin_name
      FROM staff s
      LEFT JOIN store st ON s.store_id = st.store_id
      LEFT JOIN admin a ON s.admin_id = a.admin_id
      WHERE s.staff_id = $1
    `, cleanId);

    if (!fullRows || fullRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Staf tidak ditemukan',
      });
    }

    const formatted = formatStaff(fullRows[0]);

    return res.status(200).json({
      status: 'success',
      message: `Staf ${formatted.fullName} berhasil diaktifkan kembali`,
      data: formatted,
    });
  } catch (error) {
    console.error('❌ Error restoring staff:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengaktifkan kembali staf',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/staff/:id
 * Soft delete (menonaktifkan) staf atau permanent delete
 */
exports.deleteStaff = async (req, res) => {
  try {
    await ensureStaffColumns();
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/\D/g, ''));
    const isPermanent = req.query.permanent === 'true';

    if (isPermanent) {
      await prisma.$executeRawUnsafe(`
        DELETE FROM staff WHERE staff_id = $1
      `, cleanId);

      return res.status(200).json({
        status: 'success',
        message: 'Data staf berhasil dihapus permanen',
      });
    }

    // Soft delete: status = 'inactive', deleted_at = NOW()
    await prisma.$executeRawUnsafe(`
      UPDATE staff
      SET status = 'inactive', deleted_at = NOW(), updated_at = NOW()
      WHERE staff_id = $1
    `, cleanId);

    const fullRows = await prisma.$queryRawUnsafe(`
      SELECT 
        s.*,
        st.store_name,
        st.city,
        st.address,
        st.workspace_id,
        a.name AS admin_name
      FROM staff s
      LEFT JOIN store st ON s.store_id = st.store_id
      LEFT JOIN admin a ON s.admin_id = a.admin_id
      WHERE s.staff_id = $1
    `, cleanId);

    const formatted = fullRows && fullRows.length > 0 ? formatStaff(fullRows[0]) : null;

    return res.status(200).json({
      status: 'success',
      message: `Staf ${formatted ? formatted.fullName : ''} berhasil dinonaktifkan`,
      data: formatted,
    });
  } catch (error) {
    console.error('❌ Error deleting/soft-deleting staff:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menonaktifkan staf',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/staff/:id/status
 * Toggle status staf (Aktif <-> Nonaktif)
 */
exports.toggleStatus = async (req, res) => {
  try {
    await ensureStaffColumns();
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/\D/g, ''));

    const rows = await prisma.$queryRawUnsafe(`SELECT status FROM staff WHERE staff_id = $1`, cleanId);
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Staf tidak ditemukan',
      });
    }

    const currentStatus = rows[0].status;
    const nextStatus = (currentStatus === 'inactive' || currentStatus === 'Nonaktif') ? 'active' : 'inactive';
    const nextDeletedAt = nextStatus === 'inactive' ? new Date() : null;

    await prisma.$executeRawUnsafe(`
      UPDATE staff
      SET status = $1, deleted_at = $2, updated_at = NOW()
      WHERE staff_id = $3
    `, nextStatus, nextDeletedAt, cleanId);

    const fullRows = await prisma.$queryRawUnsafe(`
      SELECT 
        s.*,
        st.store_name,
        st.city,
        st.address,
        st.workspace_id,
        a.name AS admin_name
      FROM staff s
      LEFT JOIN store st ON s.store_id = st.store_id
      LEFT JOIN admin a ON s.admin_id = a.admin_id
      WHERE s.staff_id = $1
    `, cleanId);

    const formatted = formatStaff(fullRows[0]);

    return res.status(200).json({
      status: 'success',
      message: `Status staf ${formatted.fullName} diubah menjadi ${formatted.status}`,
      data: formatted,
    });
  } catch (error) {
    console.error('❌ Error toggling staff status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengubah status staf',
      error: error.message,
    });
  }
};

/**
 * Format string waktu "HH:mm" atau Date object menjadi "HH:mm"
 */
const formatTimeString = (time) => {
  if (!time) return '09:00';
  if (typeof time === 'string') {
    if (time.includes('T')) {
      const parts = time.split('T')[1].split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    const parts = time.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return time.substring(0, 5);
  }
  if (time instanceof Date) {
    const hours = String(time.getUTCHours()).padStart(2, '0');
    const minutes = String(time.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return '09:00';
};

/**
 * GET /api/staff/my-schedules
 * Mengambil jadwal audit & checklist harian untuk staf lapangan yang sedang login
 * Terhubung langsung secara real-time ke tabel PostgreSQL `schedule`
 */
exports.getMySchedules = async (req, res) => {
  try {
    const user = await extractUser(req);
    let staffId = null;
    let storeId = null;
    let staffName = user?.fullName || 'Staf Lapangan';
    let storeName = 'Toko Cabang';
    let storeLocation = 'Kota Malang';
    let storeCode = 'ST-01';
    let staffPosition = 'Auditor Lapangan';

    const isStaffUser =
      user &&
      (user.role === 'Staff' ||
       user.role === 'Auditor Lapangan' ||
       user.id?.toString().startsWith('staff-') ||
       user.role?.toLowerCase().includes('staff') ||
       user.role?.toLowerCase().includes('auditor'));

    // 1. Identifikasi Staff jika user login sebagai Staff
    if (isStaffUser) {
      const cleanStaffId = user.rawId || user.id?.toString().replace(/^staff-/, '');
      if (cleanStaffId && !isNaN(Number(cleanStaffId))) {
        try {
          const st = await prisma.staff.findUnique({
            where: { staff_id: BigInt(cleanStaffId) },
            include: { store: true },
          });
          if (st) {
            staffId = st.staff_id;
            storeId = st.store_id;
            staffName = st.name;
            staffPosition = st.position || 'Auditor Lapangan';
            if (st.store) {
              storeName = st.store.store_name;
              storeLocation = `${st.store.address || st.store.city || 'Cabang'} • ST-${st.store.store_id}`;
              storeCode = `ST-${st.store.store_id.toString()}`;
            }
          }
        } catch (e) {
          console.warn('⚠️ Gagal mengambil detail staff:', e.message);
        }
      }
    }

    // Jika staffId belum terisi dan ada email user, cari langsung ke tabel staff
    if (!staffId && user?.email) {
      try {
        const stByEmail = await prisma.staff.findUnique({
          where: { email: user.email.trim().toLowerCase() },
          include: { store: true },
        });
        if (stByEmail) {
          staffId = stByEmail.staff_id;
          storeId = stByEmail.store_id;
          staffName = stByEmail.name;
          staffPosition = stByEmail.position || 'Auditor Lapangan';
          if (stByEmail.store) {
            storeName = stByEmail.store.store_name;
            storeLocation = `${stByEmail.store.address || stByEmail.store.city || 'Cabang'} • ST-${stByEmail.store.store_id}`;
            storeCode = `ST-${stByEmail.store.store_id.toString()}`;
          }
        }
      } catch (e) {}
    }

    if (req.query.staffId) {
      // Dukungan query param jika Admin/SuperAdmin ingin melihat jadwal staf tertentu
      try {
        const cleanStaffId = req.query.staffId.toString().replace(/^staff-/, '');
        const st = await prisma.staff.findUnique({
          where: { staff_id: BigInt(cleanStaffId) },
          include: { store: true },
        });
        if (st) {
          staffId = st.staff_id;
          storeId = st.store_id;
          staffName = st.name;
          staffPosition = st.position || 'Auditor Lapangan';
          if (st.store) {
            storeName = st.store.store_name;
            storeLocation = `${st.store.address || st.store.city || 'Cabang'} • ST-${st.store.store_id}`;
            storeCode = `ST-${st.store.store_id.toString()}`;
          }
        }
      } catch (e) {}
    }

    // 2. Kriteria pencarian jadwal dari database
    const where = {
      deleted_at: null,
      status: { not: 'cancelled' },
    };

    if (staffId && storeId) {
      where.OR = [
        { store_id: storeId },
        { schedule_staff: { some: { staff_id: staffId } } },
      ];
    } else if (storeId) {
      where.store_id = storeId;
    } else if (staffId) {
      where.schedule_staff = { some: { staff_id: staffId } };
    } else {
      // Jika Super Admin / Admin atau belum spesifik staff:
      const requestedStoreId = req.query.storeId || req.headers['x-store-id'];
      const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'] || user?.workspaceId;

      if (requestedStoreId) {
        where.store_id = BigInt(requestedStoreId.toString().replace(/^str-/, ''));
      } else if (requestedWsId && requestedWsId !== 'all') {
        const cleanWs = BigInt(requestedWsId.toString().replace(/^ws-/, ''));
        where.store = { workspace_id: cleanWs };
      }
    }

    // 3. Query PostgreSQL Schedule dengan relasi lengkap
    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        store: true,
        checklist_template: {
          include: {
            template_category: {
              include: { template_task: true },
            },
          },
        },
        schedule_staff: {
          include: { staff: true },
        },
        schedule_exception: true,
        checklist_report: {
          include: { staff: true },
        },
      },
      orderBy: [
        { start_date: 'desc' },
        { start_time: 'asc' },
      ],
    });

    // Jika storeName belum didapat dari staff tetapi schedules ada:
    if (!storeId && schedules.length > 0 && schedules[0].store) {
      storeName = schedules[0].store.store_name;
      storeLocation = `${schedules[0].store.address || schedules[0].store.city || 'Cabang'} • ST-${schedules[0].store.store_id}`;
      storeCode = `ST-${schedules[0].store.store_id.toString()}`;
    }

    // Waktu realtime saat ini di WIB (UTC+7)
    const now = new Date();
    const utcHours = now.getUTCHours();
    const wibHours = (utcHours + 7) % 24;
    const currentMinutes = wibHours * 60 + now.getUTCMinutes();

    const todayFormatted = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // 4. Transformasi data jadwal real dari database
    const scheduleItems = schedules.map((s) => {
      const startTimeStr = formatTimeString(s.start_time);
      const endTimeStr = formatTimeString(s.end_time);
      const timeRange = `${startTimeStr} - ${endTimeStr} WIB`;

      const taskList = s.checklist_template?.template_category?.flatMap(cat => cat.template_task || []) || [];
      const taskCount = taskList.length;
      const templateName = s.checklist_template?.template_name || 'Standar SOP';
      const checklistInfo = taskCount > 0
        ? `${taskCount} Item Checklist • ${templateName}`
        : templateName;

      // Cek laporan penyelesaian
      const reports = s.checklist_report || [];
      const completedReport = reports.find(r => r.status === 'submitted' || r.status === 'completed');

      // Cek pengecualian / libur
      const exceptions = s.schedule_exception || [];
      const hasHolidayException = exceptions.some(e => e.is_skip) || s.status === 'Libur' || s.notes?.toLowerCase().includes('libur');

      const [sH, sM] = startTimeStr.split(':').map(v => parseInt(v, 10));
      const [eH, eM] = endTimeStr.split(':').map(v => parseInt(v, 10));
      const startMinutes = (isNaN(sH) ? 0 : sH) * 60 + (isNaN(sM) ? 0 : sM);
      const endMinutes = (isNaN(eH) ? 23 : eH) * 60 + (isNaN(eM) ? 59 : eM);

      let status = 'Siap Dimulai';
      let statusBadge = 'Siap Dimulai';
      let submittedInfo;
      let canStart = false;
      let isCompleted = false;
      let isHighlighted = false;
      let isHoliday = false;
      let isLocked = false;
      let hasDetail = false;
      let actionText;
      let infoNote;
      let exemptionText;
      let unlockText;

      if (completedReport) {
        status = 'Selesai';
        statusBadge = 'Selesai';
        const repTime = completedReport.submitted_at || completedReport.created_at;
        const timeStr = repTime ? formatTimeString(repTime) : startTimeStr;
        const repStaffName = completedReport.staff?.name || staffName;
        submittedInfo = `Diserahkan pukul ${timeStr} WIB oleh ${repStaffName}`;
        isCompleted = true;
        hasDetail = true;
        canStart = false;
      } else if (hasHolidayException) {
        status = 'Libur';
        statusBadge = 'Libur';
        const exReason = exceptions[0]?.reason || s.notes || 'Pengecualian Terjadwal';
        infoNote = `Jadwal Ditiadakan / ${exReason}`;
        exemptionText = `Bebas Tugas: ${exReason}`;
        isHoliday = true;
        canStart = false;
      } else if (currentMinutes < startMinutes) {
        status = 'Terkunci';
        statusBadge = 'Terkunci';
        unlockText = `Terbuka Pukul ${startTimeStr} WIB`;
        isLocked = true;
        canStart = false;
      } else {
        status = 'Siap Dimulai';
        statusBadge = 'Siap Dimulai';
        canStart = true;
        actionText = 'Kerjakan Checklist →';
      }

      return {
        id: s.schedule_id.toString(),
        timeRange,
        title: s.title,
        checklistInfo,
        infoNote,
        status,
        statusBadge,
        submittedInfo,
        actionText,
        exemptionText,
        unlockText,
        canStart,
        isCompleted,
        isHighlighted,
        isHoliday,
        isLocked,
        hasDetail,
        templateId: s.template_id ? s.template_id.toString() : null,
        templateName: s.checklist_template?.template_name,
        storeId: s.store_id ? s.store_id.toString() : null,
        storeName: s.store ? s.store.store_name : null,
        tasks: taskList.map(t => ({
          id: t.task_id.toString(),
          name: t.task_description,
          description: t.task_description,
          isPhotoRequired: t.is_photo_required === true,
          priority: t.priority || 'Low',
        })),
        report: completedReport ? {
          reportId: completedReport.report_id.toString(),
          status: completedReport.status,
          submittedAt: completedReport.submitted_at,
          submittedBy: completedReport.staff?.name,
          notes: completedReport.notes,
        } : null,
      };
    });

    // Tandai jadwal aktif pertama yang siap dimulai sebagai highlighted
    let foundFirstReady = false;
    for (const item of scheduleItems) {
      if (item.status === 'Siap Dimulai' && !foundFirstReady) {
        item.isHighlighted = true;
        foundFirstReady = true;
      }
    }

    const nonHolidayTasks = scheduleItems.filter((t) => t.status !== 'Libur');
    const completedCount = scheduleItems.filter((t) => t.status === 'Selesai').length;
    const totalCount = nonHolidayTasks.length;

    return res.status(200).json({
      status: 'success',
      data: {
        staff: {
          name: staffName,
          shift: staffPosition || 'Auditor Lapangan',
          dateFormatted: todayFormatted,
        },
        store: {
          name: storeName,
          location: storeLocation,
          code: storeCode,
        },
        progress: {
          completed: completedCount,
          total: totalCount,
          percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
          label: `${completedCount} dari ${totalCount} Tugas Selesai`,
        },
        schedules: scheduleItems,
      },
    });
  } catch (error) {
    console.error('❌ Error in getMySchedules:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memuat jadwal tugas staff',
      error: error.message,
    });
  }
};

/**
 * GET /api/staff/schedules/:id
 * Mengambil detail satu jadwal audit beserta seluruh butir checklist real dari tabel template_task
 */
exports.getStaffScheduleDetail = async (req, res) => {
  try {
    const rawId = req.params.id.toString().replace(/^sch-/, '');
    const scheduleId = BigInt(rawId);

    const schedule = await prisma.schedule.findUnique({
      where: { schedule_id: scheduleId },
      include: {
        store: true,
        checklist_template: {
          include: {
            template_category: {
              orderBy: { sort_order: 'asc' },
              include: {
                template_task: {
                  orderBy: { sort_order: 'asc' },
                },
              },
            },
          },
        },
        schedule_staff: {
          include: { staff: true },
        },
        checklist_report: {
          include: { staff: true },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!schedule) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan',
      });
    }

    const startTimeStr = formatTimeString(schedule.start_time);
    const endTimeStr = formatTimeString(schedule.end_time);
    const timeRange = `${startTimeStr} - ${endTimeStr} WIB`;

    const categories = schedule.checklist_template?.template_category || [];
    let taskNumber = 0;
    const tasks = categories.flatMap((cat) => {
      const catTasks = cat.template_task || [];
      return catTasks.map((t) => {
        taskNumber++;
        const isCritical = t.priority === 'High' || t.priority === 'Critical';
        return {
          id: Number(t.task_id),
          taskId: t.task_id.toString(),
          itemNumber: taskNumber,
          sopCode: `ITEM SOP #${String(taskNumber).padStart(2, '0')}`,
          category: cat.category_name,
          title: t.task_description,
          instruction: t.task_description,
          isCritical,
          isPhotoRequired: t.is_photo_required === true,
          priority: t.priority || 'Low',
          defaultStandard: 'Ya, Sesuai Standar',
          defaultStandardSub: 'Kondisi fisik dan operasional sesuai SOP',
          defaultNA: 'Tidak Relevan / N/A',
          defaultNASub: 'Kondisi saat ini tidak relevan dengan butir ini',
        };
      });
    });

    const completedReport = (schedule.checklist_report || []).find(
      (r) => r.status === 'submitted' || r.status === 'completed'
    );

    return res.status(200).json({
      status: 'success',
      data: {
        id: schedule.schedule_id.toString(),
        title: schedule.title,
        timeRange,
        startTime: startTimeStr,
        endTime: endTimeStr,
        startDate: schedule.start_date,
        templateId: schedule.template_id ? schedule.template_id.toString() : null,
        templateName: schedule.checklist_template?.template_name || 'Standar SOP',
        store: {
          id: schedule.store?.store_id?.toString() || '',
          name: schedule.store?.store_name || 'Toko Cabang',
          address: schedule.store?.address || '',
          city: schedule.store?.city || '',
          code: `ST-${schedule.store?.store_id?.toString() || '01'}`,
        },
        totalQuestions: tasks.length,
        tasks,
        isCompleted: Boolean(completedReport),
        report: completedReport
          ? {
              reportId: completedReport.report_id.toString(),
              status: completedReport.status,
              submittedAt: completedReport.submitted_at || completedReport.completed_at,
              submittedBy: completedReport.staff?.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('❌ Error in getStaffScheduleDetail:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memuat detail jadwal audit',
      error: error.message,
    });
  }
};

/**
 * POST /api/staff/schedules/:id/submit
 * Menyerahkan laporan audit staf ke tabel PostgreSQL checklist_report dan checklist_answer
 */
exports.submitStaffAudit = async (req, res) => {
  try {
    const rawId = req.params.id.toString().replace(/^sch-/, '');
    const scheduleId = BigInt(rawId);

    const user = await extractUser(req);
    let staffId = null;

    if (user?.id) {
      const rawStaffId = user.id.toString().replace(/^staff-/, '');
      if (!isNaN(Number(rawStaffId))) {
        staffId = BigInt(rawStaffId);
      }
    }

    if (!staffId && user?.email) {
      const st = await prisma.staff.findUnique({
        where: { email: user.email.trim().toLowerCase() },
      });
      if (st) staffId = st.staff_id;
    }

    if (!staffId) {
      const schedule = await prisma.schedule.findUnique({
        where: { schedule_id: scheduleId },
        include: {
          schedule_staff: true,
          store: { include: { staff: true } },
        },
      });
      if (schedule?.schedule_staff?.length > 0) {
        staffId = schedule.schedule_staff[0].staff_id;
      } else if (schedule?.store?.staff?.length > 0) {
        staffId = schedule.store.staff[0].staff_id;
      } else {
        const firstStaff = await prisma.staff.findFirst();
        if (firstStaff) staffId = firstStaff.staff_id;
      }
    }

    if (!staffId) {
      return res.status(400).json({
        status: 'error',
        message: 'Tidak dapat mengidentifikasi staf pelapor.',
      });
    }

    const {
      answers = [], // array of { taskId, answer: 'standard' | 'na', note, photo }
      notes,
      selfiePhoto,
      signature,
      startedAt,
    } = req.body;

    const totalQuestions = answers.length;
    const answeredCount = answers.filter((a) => a.answer).length;
    const photoCount = answers.filter((a) => a.photo).length + (selfiePhoto ? 1 : 0);

    const now = new Date();

    const report = await prisma.checklist_report.create({
      data: {
        schedule_id: scheduleId,
        staff_id: staffId,
        started_at: startedAt ? new Date(startedAt) : now,
        completed_at: now,
        duration_minute: 15,
        status: 'submitted',
        total_questions: totalQuestions,
        answered_questions: answeredCount,
        skipped_questions: Math.max(0, totalQuestions - answeredCount),
        total_attachments: photoCount,
      },
    });

    for (const ans of answers) {
      if (!ans.taskId) continue;
      const cleanTaskId = BigInt(ans.taskId.toString().replace(/\D/g, ''));

      let normalizedAnswer = 'yes';
      if (ans.answer === 'na' || ans.answer === 'N/A' || ans.answer === 'tidak relevan') {
        normalizedAnswer = 'N/A';
      } else if (ans.answer === 'no' || ans.answer === 'tidak' || ans.answer === 'temuan') {
        normalizedAnswer = 'no';
      } else {
        normalizedAnswer = 'yes';
      }

      const createdAnswer = await prisma.checklist_answer.create({
        data: {
          report_id: report.report_id,
          task_id: cleanTaskId,
          answer: normalizedAnswer,
          comment: ans.note || null,
          answered_at: now,
        },
      });

      if (ans.photo && typeof ans.photo === 'string') {
        try {
          await prisma.attachment.create({
            data: {
              report_id: report.report_id,
              answer_id: createdAnswer.answer_id,
              caption: `Bukti Foto Task #${cleanTaskId}`,
              file_url: Buffer.from(ans.photo.slice(0, 500)),
              file_type: 'task_photo',
            },
          });
        } catch (attErr) {
          console.warn('⚠️ Gagal menyimpan attachment:', attErr.message);
        }
      }
    }

    if (selfiePhoto && typeof selfiePhoto === 'string') {
      try {
        await prisma.attachment.create({
          data: {
            report_id: report.report_id,
            caption: 'Foto Verifikasi Kehadiran Bertugas',
            signer_name: user?.fullName || 'Staff Auditor',
            signer_role: user?.position || 'Auditor Lapangan',
            file_url: Buffer.from(selfiePhoto.slice(0, 500)),
            file_type: 'report_photo',
          },
        });
      } catch (selfieErr) {
        console.warn('⚠️ Gagal menyimpan selfie attachment:', selfieErr.message);
      }
    }

    if (signature && typeof signature === 'string') {
      try {
        await prisma.attachment.create({
          data: {
            report_id: report.report_id,
            caption: 'Tanda Tangan Digital Verifikasi Staff',
            signer_name: user?.fullName || 'Staff Auditor',
            signer_role: user?.position || 'Auditor Lapangan',
            file_url: Buffer.from(signature.slice(0, 500)),
            file_type: 'signature',
          },
        });
      } catch (sigErr) {
        console.warn('⚠️ Gagal menyimpan signature attachment:', sigErr.message);
      }
    }

    return res.status(201).json({
      status: 'success',
      message: 'Laporan audit berhasil diserahkan ke Store Manager!',
      data: {
        reportId: report.report_id.toString(),
        submittedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('❌ Error in submitStaffAudit:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menyerahkan laporan audit',
      error: error.message,
    });
  }
};

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
 * GET /api/staff/my-schedules
 * Mengambil jadwal audit & checklist harian untuk staf lapangan yang sedang login
 */
exports.getMySchedules = async (req, res) => {
  try {
    const user = await extractUser(req);
    let staffId = null;
    let storeId = null;
    let staffName = user?.fullName || 'Siti Rahmawati';
    let storeName = 'Kopi Kenangan';
    let storeLocation = 'Mall Kelapa Gading 3 • KK-JKT-15';
    let storeCode = 'KK-JKT-15';

    if (user && user.role === 'Staff') {
      const cleanStaffId = user.rawId || user.id?.toString().replace(/^staff-/, '');
      if (cleanStaffId) {
        try {
          const st = await prisma.staff.findUnique({
            where: { staff_id: BigInt(cleanStaffId) },
            include: { store: true },
          });
          if (st) {
            staffId = st.staff_id;
            storeId = st.store_id;
            staffName = st.name;
            if (st.store) {
              storeName = st.store.store_name;
              storeLocation = `${st.store.address || st.store.city || 'Mall Kelapa Gading 3'} • ST-${st.store.store_id}`;
              storeCode = `ST-${st.store.store_id.toString()}`;
            }
          }
        } catch (e) {
          console.warn('⚠️ Gagal mengambil detail staff:', e.message);
        }
      }
    }

    const todayFormatted = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const tasks = [
      {
        id: 'sch-1',
        timeRange: '06:30 - 07:30 WIB',
        title: 'Opening Store & Persiapan Barista',
        checklistInfo: '12 Item Checklist • Termasuk verifikasi chiller',
        status: 'Selesai',
        statusBadge: 'Selesai',
        submittedInfo: `Diserahkan pukul 07:15 WIB oleh ${staffName.split(' ')[0]} R.`,
        canStart: false,
        isCompleted: true,
        hasDetail: true,
      },
      {
        id: 'sch-2',
        timeRange: '11:00 - 12:00 WIB',
        title: 'Hygiene & Sanitasi Meja Bar',
        checklistInfo: '8 Item Checklist • Foto wajib di area bar & sink',
        status: 'Siap Dimulai',
        statusBadge: 'Siap Dimulai',
        canStart: true,
        actionText: 'Kerjakan Checklist →',
        isHighlighted: true,
      },
      {
        id: 'sch-3',
        timeRange: '14:00 - 15:00 WIB',
        title: 'Pengecekan Kebersihan Area Dine-in',
        infoNote: 'Jadwal Ditiadakan / Toko Sedang Perawatan Gedung',
        status: 'Libur',
        statusBadge: 'Libur',
        exemptionText: 'Bebas Tugas: Pengecualian Terjadwal (Maintenance Mall)',
        canStart: false,
        isHoliday: true,
      },
      {
        id: 'sch-4',
        timeRange: '21:00 - 22:30 WIB',
        title: 'Closing Kasir & End-of-Day',
        checklistInfo: '15 Item Checklist • Rekonsiliasi EDC & gembok',
        status: 'Terkunci',
        statusBadge: 'Terkunci',
        unlockText: 'Terbuka Pukul 20:30 WIB',
        canStart: false,
        isLocked: true,
      },
    ];

    const nonHolidayTasks = tasks.filter((t) => t.status !== 'Libur');
    const completedCount = tasks.filter((t) => t.status === 'Selesai').length;
    const totalCount = nonHolidayTasks.length;

    return res.status(200).json({
      status: 'success',
      data: {
        staff: {
          name: staffName,
          shift: 'Shift Pagi',
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
          percentage: Math.round((completedCount / (totalCount || 1)) * 100),
          label: `${completedCount} dari ${totalCount} Tugas Selesai`,
        },
        schedules: tasks,
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

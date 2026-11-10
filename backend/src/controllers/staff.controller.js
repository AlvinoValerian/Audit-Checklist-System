const prisma = require('../config/prisma');
const bcrypt = require('bcrypt');
const { extractUser } = require('../middlewares/auth.middleware');
const { encryptImageData, decryptImageData } = require('../utils/imageCrypto');
const { syncExpiredSchedulesToDb } = require('../utils/scheduleSync');

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
    profilePicture: row.photo || null,
    storeAddress: row.address || '-',
    workspaceId: row.workspace_id ? row.workspace_id.toString() : undefined,
    workspaceName: row.workspace_name || 'Mie Gacoan Indonesia',
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
        a.name AS admin_name,
        w.company_name AS workspace_name
      FROM staff s
      LEFT JOIN store st ON s.store_id = st.store_id
      LEFT JOIN admin a ON s.admin_id = a.admin_id
      LEFT JOIN workspace w ON st.workspace_id = w.workspace_id
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
        a.name AS admin_name,
        w.company_name AS workspace_name
      FROM staff s
      LEFT JOIN store st ON s.store_id = st.store_id
      LEFT JOIN admin a ON s.admin_id = a.admin_id
      LEFT JOIN workspace w ON st.workspace_id = w.workspace_id
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
      photo,
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

    let photoClause = '';
    if (photo !== undefined) {
      const encryptedPhoto = photo ? encryptImageData(photo) : null;
      params.push(encryptedPhoto);
      photoClause = `, photo = $${params.length}`;
    }

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
        ${photoClause}
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
      const d = new Date(time);
      if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
        const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
        const h = String(wib.getUTCHours()).padStart(2, '0');
        const m = String(wib.getUTCMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      }
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
    if (time.getFullYear() > 1970) {
      const wib = new Date(time.getTime() + 7 * 60 * 60 * 1000);
      const hours = String(wib.getUTCHours()).padStart(2, '0');
      const minutes = String(wib.getUTCMinutes()).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    const hours = String(time.getUTCHours()).padStart(2, '0');
    const minutes = String(time.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return '09:00';
};

/**
 * Format string tanggal atau Date object menjadi "YYYY-MM-DD" dalam zona waktu WIB (UTC+7)
 */
const formatDateString = (date) => {
  if (!date) return '';
  if (typeof date === 'string') {
    if (date.includes('T')) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000);
        const y = wib.getUTCFullYear();
        const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
        const day = String(wib.getUTCDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      }
    }
    return date.split('T')[0].substring(0, 10);
  }
  if (date instanceof Date) {
    const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const y = wib.getUTCFullYear();
    const m = String(wib.getUTCMonth() + 1).padStart(2, '0');
    const day = String(wib.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return String(date).substring(0, 10);
};

/**
 * Helper untuk mengambil kolom tambahan staff (position, deleted_at)
 * yang belum didefinisikan pada Prisma schema statik
 */
const getStaffExtra = async (staffId) => {
  if (!staffId) return {};
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT staff_id, position, deleted_at FROM staff WHERE staff_id = $1 LIMIT 1`,
      staffId
    );
    return rows && rows[0] ? rows[0] : {};
  } catch (e) {
    return {};
  }
};

const getStaffExtrasMap = async (staffIds = []) => {
  const map = new Map();
  const uniqueIds = Array.from(new Set(staffIds.filter(Boolean).map((id) => id.toString())));
  if (uniqueIds.length === 0) return map;
  try {
    const rows = await prisma.$queryRawUnsafe(
      `SELECT staff_id, position, deleted_at FROM staff WHERE staff_id = ANY($1::bigint[])`,
      uniqueIds.map((id) => BigInt(id))
    );
    for (const r of rows || []) {
      map.set(r.staff_id.toString(), r);
    }
  } catch (e) {}
  return map;
};

/**
 * Helper zona waktu WIB (UTC+7)
 */
const getWibDateParts = (date = new Date()) => {
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const wibTimestamp = safeDate.getTime() + 7 * 60 * 60 * 1000;
  const wibDate = new Date(wibTimestamp);
  const year = wibDate.getUTCFullYear();
  const month = wibDate.getUTCMonth();
  const day = wibDate.getUTCDate();
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  const hours = wibDate.getUTCHours();
  const minutes = wibDate.getUTCMinutes();
  const hoursStr = String(hours).padStart(2, '0');
  const minsStr = String(minutes).padStart(2, '0');
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const dayOfWeekShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][wibDate.getUTCDay()];

  return {
    dateStr: `${year}-${monthStr}-${dayStr}`,
    dayOfWeekShort,
    wibHours: hours,
    wibMinutes: minutes,
    currentMinutes: hours * 60 + minutes,
    timeStr: `${hoursStr}:${minsStr}`,
    formattedDateTime: `${day} ${shortMonths[month]} ${year}, ${hoursStr}:${minsStr} WIB`,
    formattedDateLong: safeDate.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta',
    }),
  };
};

const DAY_NAME_SHORT_MAP = {
  senin: 'Sen',
  sen: 'Sen',
  selasa: 'Sel',
  sel: 'Sel',
  rabu: 'Rab',
  rab: 'Rab',
  kamis: 'Kam',
  kam: 'Kam',
  jumat: 'Jum',
  "jum'at": 'Jum',
  jum: 'Jum',
  sabtu: 'Sab',
  sab: 'Sab',
  minggu: 'Min',
  min: 'Min',
};

const normalizeDayToken = (day) => {
  const key = String(day || '').trim().toLowerCase();
  return DAY_NAME_SHORT_MAP[key] || String(day || '').trim();
};

const parseSelectedDays = (selectedDaysRaw) => {
  if (!selectedDaysRaw) return [];
  if (Array.isArray(selectedDaysRaw)) return selectedDaysRaw.map(normalizeDayToken).filter(Boolean);
  if (typeof selectedDaysRaw === 'string') {
    try {
      const parsed = JSON.parse(selectedDaysRaw);
      if (Array.isArray(parsed)) return parsed.map(normalizeDayToken).filter(Boolean);
    } catch {}
    return selectedDaysRaw.split(',').map(normalizeDayToken).filter(Boolean);
  }
  return [];
};

const normalizeRecurrence = (repeatTime) => {
  const val = (repeatTime || '').toString().trim().toLowerCase();
  if (val === 'daily' || val === 'setiap hari' || val === 'harian') return 'daily';
  if (val === 'custom' || val === 'weekly' || val === 'hari tertentu' || val === 'mingguan') return 'custom';
  return 'once';
};

const isRecurringSchedule = (schedule) => normalizeRecurrence(schedule?.repeat_time) !== 'once';

const doesScheduleApplyOnDate = (schedule, targetDateStr, targetDayShort) => {
  if (!schedule) return false;
  const scheduleDateStr = formatDateString(schedule.start_date);
  if (scheduleDateStr && scheduleDateStr > targetDateStr) return false;

  const rec = normalizeRecurrence(schedule.repeat_time);
  const isRec = rec !== 'once';

  if (schedule.end_date) {
    const scheduleEndDateStr = formatDateString(schedule.end_date);
    if (scheduleEndDateStr && (!isRec || scheduleEndDateStr > scheduleDateStr) && scheduleEndDateStr < targetDateStr) {
      return false;
    }
  }

  if (rec === 'daily') return true;
  if (rec === 'custom') {
    const selectedDays = parseSelectedDays(schedule.selected_days);
    if (selectedDays.length === 0) return true;
    return selectedDays.some((d) => d.toLowerCase() === targetDayShort.toLowerCase());
  }
  return scheduleDateStr === targetDateStr;
};

const getActiveHolidaysOnDate = async (targetDateStr) => {
  try {
    return await prisma.$queryRawUnsafe(`
      SELECT * FROM store_holiday
      WHERE deleted_at IS NULL
        AND status != 'Dibatalkan'
        AND start_date <= $1::date
        AND end_date >= $1::date
    `, targetDateStr);
  } catch (e) {
    return [];
  }
};

const evaluateHolidayForSchedule = (schedule, targetDateStr, storeHolidays = [], fallbackStoreName = '') => {
  if (!schedule) return { isHoliday: false, reason: null, matchedStoreHoliday: null, matchedException: null };
  const sIdStr = schedule.schedule_id.toString();
  const sStoreId = schedule.store_id ? schedule.store_id.toString() : '';
  const sStoreName = (schedule.store?.store_name || fallbackStoreName || '').trim().toLowerCase();

  const matchedException = (schedule.schedule_exception || []).find((e) => {
    if (e.is_skip === false) return false;
    const eStart = formatDateString(e.start_date);
    const eEnd = formatDateString(e.end_date);
    if (!eStart || !eEnd) return false;
    return targetDateStr >= eStart && targetDateStr <= eEnd;
  }) || null;

  const matchedStoreHoliday = (storeHolidays || []).find((h) => {
    const hStoreId = h.store_id ? h.store_id.toString() : '';
    const hStoreName = (h.store_name || '').trim().toLowerCase();
    const storeMatches = (hStoreId && hStoreId === sStoreId) || (hStoreName && hStoreName === sStoreName);
    if (!storeMatches) return false;

    const lType = h.libur_type || 'full';
    if (lType === 'full') return true;

    let hSchedules = [];
    if (Array.isArray(h.schedules)) hSchedules = h.schedules.map((id) => String(id).replace(/^sch-/, ''));
    else if (typeof h.schedules === 'string') {
      try {
        hSchedules = JSON.parse(h.schedules).map((id) => String(id).replace(/^sch-/, ''));
      } catch {
        hSchedules = [];
      }
    }
    return hSchedules.includes(sIdStr);
  }) || null;

  const isStatusHoliday = schedule.status === 'Libur' || Boolean(schedule.notes?.toLowerCase().includes('libur'));
  const isHoliday = Boolean(matchedException) || Boolean(matchedStoreHoliday) || isStatusHoliday;
  const reason = matchedStoreHoliday?.reason || matchedException?.note || matchedException?.reason || schedule.notes || 'Toko Sedang Libur';

  return { isHoliday, reason, matchedStoreHoliday, matchedException };
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
    let staffPosition = user?.position || 'Auditor Lapangan';
    let staffPhoto = user?.profilePicture || null;

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
            const extra = await getStaffExtra(st.staff_id);
            if (extra.deleted_at || st.status === 'inactive' || st.status === 'Nonaktif') {
              return res.status(403).json({
                status: 'error',
                message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus. Hubungi Admin untuk mengaktifkan kembali.',
              });
            }
            staffId = st.staff_id;
            storeId = st.store_id;
            staffName = st.name;
            staffPosition = extra.position || 'Auditor Lapangan';
            staffPhoto = st.photo || staffPhoto;
            if (st.store) {
              storeName = st.store.store_name;
              storeLocation = st.store.address || st.store.city || 'Cabang';
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
          const extra = await getStaffExtra(stByEmail.staff_id);
          if (extra.deleted_at || stByEmail.status === 'inactive' || stByEmail.status === 'Nonaktif') {
            return res.status(403).json({
              status: 'error',
              message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus.',
            });
          }
          staffId = stByEmail.staff_id;
          storeId = stByEmail.store_id;
          staffName = stByEmail.name;
          staffPosition = extra.position || 'Auditor Lapangan';
          staffPhoto = stByEmail.photo || staffPhoto;
          if (stByEmail.store) {
            storeName = stByEmail.store.store_name;
            storeLocation = stByEmail.store.address || stByEmail.store.city || 'Cabang';
            storeCode = `ST-${stByEmail.store.store_id.toString()}`;
          }
        }
      } catch (e) {}
    }

    if (req.query.staffId && !isStaffUser) {
      // Dukungan query param jika Admin/SuperAdmin ingin melihat jadwal staf tertentu
      try {
        const cleanStaffId = req.query.staffId.toString().replace(/^staff-/, '');
        const st = await prisma.staff.findUnique({
          where: { staff_id: BigInt(cleanStaffId) },
          include: { store: true },
        });
        if (st) {
          const extra = await getStaffExtra(st.staff_id);
          staffId = st.staff_id;
          storeId = st.store_id;
          staffName = st.name;
          staffPosition = extra.position || 'Auditor Lapangan';
          staffPhoto = st.photo || null;
          if (st.store) {
            storeName = st.store.store_name;
            storeLocation = st.store.address || st.store.city || 'Cabang';
            storeCode = `ST-${st.store.store_id.toString()}`;
          }
        }
      } catch (e) {}
    }

    // Resolusi Store ID spesifik: Staf HANYA melihat jadwal untuk toko yang dinaungi
    let targetStoreId = null;

    if (storeId) {
      targetStoreId = storeId;
    } else if (req.query.storeId || req.headers['x-store-id']) {
      const sId = (req.query.storeId || req.headers['x-store-id']).toString().replace(/^str-/, '').replace(/^st-/, '');
      if (!isNaN(Number(sId))) {
        targetStoreId = BigInt(sId);
      }
    } else if (user?.storeId) {
      const sId = user.storeId.toString().replace(/^str-/, '').replace(/^st-/, '');
      if (!isNaN(Number(sId))) {
        targetStoreId = BigInt(sId);
      }
    }

    if (!targetStoreId && user?.storeName) {
      const sByName = await prisma.store.findFirst({
        where: { store_name: { contains: user.storeName.trim(), mode: 'insensitive' } },
      });
      if (sByName) targetStoreId = sByName.store_id;
    }

    // Default ke toko pertama jika belum terdefinisi
    if (!targetStoreId) {
      const firstStore = await prisma.store.findFirst({
        orderBy: { store_id: 'asc' },
      });
      if (firstStore) targetStoreId = firstStore.store_id;
    }

    // Update informasi gerai aktif sesuai targetStoreId
    if (targetStoreId) {
      const activeStore = await prisma.store.findUnique({
        where: { store_id: targetStoreId },
      });
      if (activeStore) {
        storeId = activeStore.store_id;
        storeName = activeStore.store_name;
        storeLocation = activeStore.address || activeStore.city || 'Cabang';
        storeCode = `ST-${activeStore.store_id.toString()}`;
      }
    }

    // 2. Kriteria pencarian jadwal dari database: HANYA untuk toko yang dinaungi
    const where = {
      deleted_at: null,
      status: { notIn: ['cancelled', 'inactive', 'Dibatalkan', 'Nonaktif'] },
      store_id: targetStoreId,
    };

    // Auto-sync jadwal kedaluwarsa ke database checklist_report sebelum mengambil data
    if (targetStoreId) {
      await syncExpiredSchedulesToDb({ storeId: targetStoreId, staffId });
    }

    // 3. Query PostgreSQL Schedule dengan relasi lengkap
    const schedules = await prisma.schedule.findMany({
      where,
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
        schedule_exception: true,
        checklist_report: {
          include: {
            staff: true,
            attachment: true,
          },
          orderBy: { created_at: 'desc' },
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
      storeLocation = schedules[0].store.address || schedules[0].store.city || 'Cabang';
      storeCode = `ST-${schedules[0].store.store_id.toString()}`;
    }

    // Waktu realtime saat ini di WIB (UTC+7)
    const now = new Date();
    const wibNow = getWibDateParts(now);
    const todayStr = wibNow.dateStr;
    const dayOfWeekShort = wibNow.dayOfWeekShort;
    const currentMinutes = wibNow.currentMinutes;
    const todayFormatted = wibNow.formattedDateLong;

    // 4. Filter HANYA jadwal yang berlaku hari ini (realtime)
    const todaySchedules = schedules.filter((s) => doesScheduleApplyOnDate(s, todayStr, dayOfWeekShort));

    // Ambil data libur toko (store_holiday) aktif hari ini
    const todayStoreHolidays = await getActiveHolidaysOnDate(todayStr);

    // 5. Transformasi data jadwal real hari ini dari database
    const scheduleItems = todaySchedules.map((s) => {
      const startTimeStr = formatTimeString(s.start_time);
      const endTimeStr = formatTimeString(s.end_time);
      const timeRange = `${startTimeStr} - ${endTimeStr} WIB`;

      const taskList = s.checklist_template?.template_category?.flatMap(cat => cat.template_task || []) || [];
      const taskCount = taskList.length;
      const templateName = s.checklist_template?.template_name || 'Standar SOP';
      const checklistInfo = taskCount > 0
        ? `${taskCount} Item Checklist • ${templateName}`
        : templateName;

      // Cek laporan penyelesaian (termasuk status terlambat dan filter hari ini untuk jadwal berulang)
      const reports = s.checklist_report || [];
      const isRecurring = isRecurringSchedule(s);
      const completedReport = reports.find(r => {
        const isFinished =
          r.status === 'submitted' ||
          r.status === 'completed' ||
          r.status === 'terlambat' ||
          r.status === 'late' ||
          r.status === 'submitted_late';
        if (!isFinished) return false;
        if (isRecurring) {
          const rDateStr = formatDateString(r.completed_at || r.submitted_at || r.created_at);
          return rDateStr === todayStr;
        }
        return true;
      });

      const uncompletedReport = reports.find(r => {
        const isUndone = r.status === 'tidak_mengerjakan' || r.status === 'tidak_patuh';
        if (!isUndone) return false;
        if (isRecurring) {
          const rDateStr = formatDateString(r.completed_at || r.submitted_at || r.created_at);
          return rDateStr === todayStr;
        }
        return true;
      });

      // Cek pengecualian / libur dari tabel schedule_exception atau store_holiday
      const holidayEval = evaluateHolidayForSchedule(s, todayStr, todayStoreHolidays, storeName);
      const hasHolidayException = holidayEval.isHoliday;

      const [sH, sM] = startTimeStr.split(':').map(v => parseInt(v, 10));
      const [eH, eM] = endTimeStr.split(':').map(v => parseInt(v, 10));
      const startMinutes = (isNaN(sH) ? 0 : sH) * 60 + (isNaN(sM) ? 0 : sM);
      const endMinutes = (isNaN(eH) ? 23 : eH) * 60 + (isNaN(eM) ? 59 : eM);

      // Toleransi keterlambatan 1 jam setelah jadwal akhir selesai (+60 menit)
      const toleranceMinutes = endMinutes + 60;
      const tolH = Math.floor(toleranceMinutes / 60) % 24;
      const tolM = toleranceMinutes % 60;
      const toleranceTimeStr = `${String(tolH).padStart(2, '0')}:${String(tolM).padStart(2, '0')}`;

      let status = 'Siap Dimulai';
      let statusBadge = 'Siap Dimulai';
      let submittedInfo;
      let canStart = false;
      let isCompleted = false;
      let isHighlighted = false;
      let isHoliday = false;
      let isLocked = false;
      let isLate = false;
      let isExpired = false;
      let isNonCompliant = false;
      let hasDetail = false;
      let actionText;
      let infoNote;
      let exemptionText;
      let unlockText;
      let resolvedSubmitterName = null;

      if (completedReport) {
        status = 'Selesai';
        const isLateSubmission =
          completedReport.status === 'terlambat' ||
          completedReport.status === 'late' ||
          completedReport.status === 'submitted_late';
        statusBadge = isLateSubmission ? 'Selesai (Terlambat)' : 'Selesai';
        const repTime = completedReport.submitted_at || completedReport.completed_at || completedReport.created_at;
        const timeStr = repTime ? formatTimeString(repTime) : startTimeStr;
        const sigAttachment = completedReport.attachment?.find((a) => a.file_type === 'signature' || a.signer_name);
        resolvedSubmitterName = sigAttachment?.signer_name || completedReport.staff?.name || staffName;
        submittedInfo = `Diserahkan pukul ${timeStr} WIB oleh ${resolvedSubmitterName}${isLateSubmission ? ' (Terlambat)' : ''}`;
        isCompleted = true;
        isLate = isLateSubmission;
        hasDetail = true;
        canStart = false;
      } else if (hasHolidayException) {
        status = 'Libur';
        statusBadge = 'Libur';
        const exReason = holidayEval.reason;
        infoNote = `Toko Diliburkan / ${exReason}`;
        exemptionText = `Bebas Tugas: ${exReason}`;
        isHoliday = true;
        canStart = false;
      } else if (currentMinutes < startMinutes) {
        status = 'Terkunci';
        statusBadge = 'Terkunci';
        unlockText = `Terbuka Pukul ${startTimeStr} WIB`;
        isLocked = true;
        canStart = false;
      } else if (uncompletedReport || currentMinutes > toleranceMinutes) {
        // Melewati batas toleransi keterlambatan 1 jam: Ditutup otomatis sebagai Tidak Patuh
        status = 'Kedaluwarsa';
        statusBadge = 'Tidak Patuh';
        canStart = false;
        isExpired = true;
        isLate = true;
        isNonCompliant = true;
        actionText = 'Audit Kedaluwarsa (Tidak Patuh)';
        infoNote = `Batas toleransi keterlambatan 1 jam telah berakhir (pukul ${toleranceTimeStr} WIB). Audit ditutup otomatis oleh sistem dan tercatat sebagai Tidak Mengerjakan / Tidak Patuh.`;
      } else if (currentMinutes > endMinutes) {
        // Masih dalam batas toleransi 1 jam: Diberikan keringanan dengan label Terlambat
        status = 'Terlambat';
        statusBadge = 'Terlambat';
        canStart = true;
        isLate = true;
        actionText = 'Kerjakan Checklist (Terlambat) →';
        infoNote = `Toleransi keterlambatan 1 jam diberikan hingga pukul ${toleranceTimeStr} WIB. Harap segera selesaikan sebelum audit ditutup otomatis sebagai Tidak Patuh.`;
      } else {
        status = 'Siap Dimulai';
        statusBadge = 'Siap Dimulai';
        canStart = true;
        actionText = 'Kerjakan Checklist →';
      }

      const activeReport = completedReport || uncompletedReport;

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
        isLate,
        isExpired,
        isNonCompliant,
        toleranceTime: toleranceTimeStr,
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
        report: activeReport ? {
          reportId: activeReport.report_id.toString(),
          status: activeReport.status,
          submittedAt: activeReport.submitted_at || activeReport.completed_at,
          submittedBy: completedReport ? resolvedSubmitterName : null,
          notes: activeReport.notes,
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
    const expiredCount = scheduleItems.filter((t) => t.status === 'Kedaluwarsa').length;
    const lateCount = scheduleItems.filter((t) => t.status === 'Terlambat').length;
    const totalCount = nonHolidayTasks.length;

    return res.status(200).json({
      status: 'success',
      data: {
        staff: {
          name: staffName,
          shift: staffPosition || 'Auditor Lapangan',
          dateFormatted: todayFormatted,
          photo: staffPhoto || null,
        },
        store: {
          id: storeId ? storeId.toString() : null,
          name: storeName,
          location: storeLocation,
          code: storeCode,
        },
        progress: {
          completed: completedCount,
          total: totalCount,
          expired: expiredCount,
          late: lateCount,
          percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
          label: `${completedCount} dari ${totalCount} Tugas Selesai${expiredCount > 0 ? ` • ${expiredCount} Tidak Patuh` : ''}`,
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
    if (!rawId || isNaN(Number(rawId))) {
      return res.status(400).json({
        status: 'error',
        message: 'ID jadwal audit tidak valid.',
      });
    }
    const scheduleId = BigInt(rawId);

    const user = await extractUser(req);
    const isStaffUser =
      user &&
      (user.role === 'Staff' ||
       user.role === 'Auditor Lapangan' ||
       user.id?.toString().startsWith('staff-') ||
       user.role?.toLowerCase().includes('staff') ||
       user.role?.toLowerCase().includes('auditor'));

    let viewerStoreId = null;
    if (isStaffUser) {
      let st = null;
      const cleanStaffId = user.rawId || user.id?.toString().replace(/^staff-/, '');
      if (cleanStaffId && !isNaN(Number(cleanStaffId))) {
        st = await prisma.staff.findUnique({ where: { staff_id: BigInt(cleanStaffId) } });
      }
      if (!st && user.email) {
        st = await prisma.staff.findUnique({ where: { email: user.email.trim().toLowerCase() } });
      }
      if (st) {
        const extra = await getStaffExtra(st.staff_id);
        if (extra.deleted_at || st.status === 'inactive' || st.status === 'Nonaktif') {
          return res.status(403).json({
            status: 'error',
            message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus.',
          });
        }
        viewerStoreId = st.store_id;
      }
    }

    const baseSchedule = await prisma.schedule.findUnique({
      where: { schedule_id: scheduleId },
      select: { schedule_id: true, store_id: true, deleted_at: true, status: true },
    });

    if (!baseSchedule || baseSchedule.deleted_at) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan atau telah dihapus',
      });
    }

    if (['cancelled', 'inactive', 'Dibatalkan', 'Nonaktif'].includes(baseSchedule.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Jadwal audit ini berstatus Nonaktif atau telah dibatalkan.',
      });
    }

    if (isStaffUser && viewerStoreId && baseSchedule.store_id.toString() !== viewerStoreId.toString()) {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses ke jadwal cabang gerai lain.',
      });
    }

    // Sinkronkan status jadwal kedaluwarsa terlebih dahulu sebelum membaca detail
    await syncExpiredSchedulesToDb({ storeId: baseSchedule.store_id });

    const currentSchedule = await prisma.schedule.findUnique({
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
        schedule_exception: true,
        checklist_report: {
          include: {
            staff: true,
            attachment: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!currentSchedule || currentSchedule.deleted_at) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan atau telah dihapus',
      });
    }

    const startTimeStr = formatTimeString(currentSchedule.start_time);
    const endTimeStr = formatTimeString(currentSchedule.end_time);
    const timeRange = `${startTimeStr} - ${endTimeStr} WIB`;

    const categories = currentSchedule.checklist_template?.template_category || [];
    let taskNumber = 0;
    const tasks = categories.flatMap((cat) => {
      const catTasks = cat.template_task || [];
      return catTasks.map((t) => {
        taskNumber++;
        const isCritical = t.priority === 'High' || t.priority === 'Critical';

        const descLower = t.task_description.toLowerCase();
        let standardSub = 'Kondisi area kerja bersih & higienis';
        let issueSub = 'Suhu chiller >4°C atau terdapat ketidaksesuaian';

        if (descLower.includes('lantai') || descLower.includes('licin') || descLower.includes('kering')) {
          standardSub = 'Kondisi area kerja bersih & higienis';
          issueSub = 'Lantai basah/licin atau terdapat genangan air';
        } else if (descLower.includes('chiller') || descLower.includes('suhu')) {
          standardSub = 'Suhu chiller stabil pada batas aman SOP';
          issueSub = 'Suhu chiller >4°C atau terdapat ketidaksesuaian';
        } else if (descLower.includes('pos') || descLower.includes('kasir') || descLower.includes('printer')) {
          standardSub = 'Perangkat POS normal dan modal kasir lengkap';
          issueSub = 'Perangkat POS kendala atau modal kasir tidak balance';
        } else if (descLower.includes('meja') || descLower.includes('grinder')) {
          standardSub = 'Kondisi meja bar bersih & higienis';
          issueSub = 'Terdapat sisa tumpahan bubuk kopi di meja bar';
        } else if (descLower.includes('pitcher') || descLower.includes('steam')) {
          standardSub = 'Peralatan steril dan higienis';
          issueSub = 'Terdapat kerak susu menumpuk atau tidak steril';
        } else if (descLower.includes('kalibrasi') || descLower.includes('espresso') || descLower.includes('ekstraksi')) {
          standardSub = 'Rasio ekstraksi dan crema optimal';
          issueSub = 'Ekstraksi under/over-extracted atau rasa asam/pahit';
        } else if (descLower.includes('es') || descLower.includes('air') || descLower.includes('ro')) {
          standardSub = 'Kondisi es higienis dan suplai air normal';
          issueSub = 'Es terkontaminasi atau tekanan air rendah';
        } else if (descLower.includes('fifo') || descLower.includes('sirup') || descLower.includes('susu')) {
          standardSub = 'Seluruh bahan baku fresh berlabel FIFO';
          issueSub = 'Bahan baku melewati batas masa pakai atau tanpa label';
        } else if (descLower.includes('sink') || descLower.includes('cuci')) {
          standardSub = 'Sink bersih dan saluran lancar';
          issueSub = 'Saluran mampet atau terdapat ampas kopi menumpuk';
        }

        return {
          id: Number(t.task_id),
          taskId: t.task_id.toString(),
          itemNumber: taskNumber,
          sopCode: `ITEM SOP #${String(taskNumber).padStart(2, '0')}`,
          category: cat.category_name,
          title: t.task_description,
          instruction: '',
          isCritical,
          isPhotoRequired: t.is_photo_required === true,
          priority: t.priority || 'Low',
          defaultStandard: 'Ya, Sesuai Standar',
          defaultStandardSub: standardSub,
          defaultIssue: 'Tidak / Bermasalah',
          defaultIssueSub: issueSub,
          defaultNA: 'Tidak Relevan / N/A',
          defaultNASub: 'Kondisi saat ini tidak relevan dengan butir ini',
        };
      });
    });

    const wibNow = getWibDateParts(new Date());
    const todayStr = wibNow.dateStr;
    const currentMinutes = wibNow.currentMinutes;

    const isRecurring = isRecurringSchedule(currentSchedule);
    const appliesToday = doesScheduleApplyOnDate(currentSchedule, todayStr, wibNow.dayOfWeekShort);

    const todayStoreHolidays = await getActiveHolidaysOnDate(todayStr);
    const holidayEval = evaluateHolidayForSchedule(currentSchedule, todayStr, todayStoreHolidays);

    const reports = currentSchedule.checklist_report || [];
    const completedReport = reports.find((r) => {
      const isFinished =
        r.status === 'submitted' ||
        r.status === 'completed' ||
        r.status === 'terlambat' ||
        r.status === 'late' ||
        r.status === 'submitted_late';
      if (!isFinished) return false;
      if (isRecurring) {
        const rDateStr = formatDateString(r.completed_at || r.submitted_at || r.created_at);
        return rDateStr === todayStr;
      }
      return true;
    });

    const uncompletedReport = reports.find((r) => {
      const isUndone = r.status === 'tidak_mengerjakan' || r.status === 'tidak_patuh';
      if (!isUndone) return false;
      if (isRecurring) {
        const rDateStr = formatDateString(r.completed_at || r.submitted_at || r.created_at);
        return rDateStr === todayStr;
      }
      return true;
    });

    const [sH, sM] = startTimeStr.split(':').map((v) => parseInt(v, 10));
    const [eH, eM] = endTimeStr.split(':').map((v) => parseInt(v, 10));
    const startMinutes = (isNaN(sH) ? 0 : sH) * 60 + (isNaN(sM) ? 0 : sM);
    const endMinutes = (isNaN(eH) ? 23 : eH) * 60 + (isNaN(eM) ? 59 : eM);

    // Toleransi keterlambatan 1 jam (+60 menit)
    const toleranceMinutes = endMinutes + 60;
    const tolH = Math.floor(toleranceMinutes / 60) % 24;
    const tolM = toleranceMinutes % 60;
    const toleranceTimeStr = `${String(tolH).padStart(2, '0')}:${String(tolM).padStart(2, '0')}`;

    const isHoliday = holidayEval.isHoliday;
    const isNotScheduledToday = !appliesToday;
    const isLocked = !completedReport && !isHoliday && !isNotScheduledToday && currentMinutes < startMinutes;
    const isExpired = !completedReport && !isHoliday && !isNotScheduledToday && (Boolean(uncompletedReport) || currentMinutes > toleranceMinutes);
    const isLate = !completedReport && !isHoliday && !isNotScheduledToday && !isExpired && currentMinutes > endMinutes;
    const canStart = !completedReport && !isHoliday && !isNotScheduledToday && !isLocked && !isExpired;

    let scheduleStatus = 'Siap Dimulai';
    let scheduleBadge = 'Siap Dimulai';
    if (completedReport) {
      scheduleStatus = 'Selesai';
      const isRepLate = completedReport.status === 'terlambat' || completedReport.status === 'late' || completedReport.status === 'submitted_late';
      scheduleBadge = isRepLate ? 'Selesai (Terlambat)' : 'Selesai';
    } else if (isHoliday) {
      scheduleStatus = 'Libur';
      scheduleBadge = 'Libur';
    } else if (isNotScheduledToday) {
      scheduleStatus = 'Tidak Aktif Hari Ini';
      scheduleBadge = 'Tidak Berlaku Hari Ini';
    } else if (isExpired) {
      scheduleStatus = 'Kedaluwarsa';
      scheduleBadge = 'Tidak Patuh';
    } else if (isLate) {
      scheduleStatus = 'Terlambat';
      scheduleBadge = 'Terlambat';
    } else if (isLocked) {
      scheduleStatus = 'Terkunci';
      scheduleBadge = 'Terkunci';
    }

    const activeReport = completedReport || uncompletedReport;
    const completedSig = completedReport?.attachment?.find((a) => a.file_type === 'signature' || a.signer_name);

    return res.status(200).json({
      status: 'success',
      data: {
        id: currentSchedule.schedule_id.toString(),
        title: currentSchedule.title,
        timeRange,
        startTime: startTimeStr,
        endTime: endTimeStr,
        toleranceTime: toleranceTimeStr,
        status: scheduleStatus,
        statusBadge: scheduleBadge,
        startDate: currentSchedule.start_date,
        templateId: currentSchedule.template_id ? currentSchedule.template_id.toString() : null,
        templateName: currentSchedule.checklist_template?.template_name || 'Standar SOP',
        store: {
          id: currentSchedule.store?.store_id?.toString() || '',
          name: currentSchedule.store?.store_name || 'Toko Cabang',
          address: currentSchedule.store?.address || '',
          city: currentSchedule.store?.city || '',
          code: `ST-${currentSchedule.store?.store_id?.toString() || '01'}`,
          latitude: currentSchedule.store?.latitude != null ? Number(currentSchedule.store.latitude) : -7.9553,
          longitude: currentSchedule.store?.longitude != null ? Number(currentSchedule.store.longitude) : 112.6412,
          radius: currentSchedule.store?.location_radius_gps != null ? Number(currentSchedule.store.location_radius_gps) : 100,
          hasCoordinates: currentSchedule.store?.latitude != null && currentSchedule.store?.longitude != null,
        },
        totalQuestions: tasks.length,
        tasks,
        isCompleted: Boolean(completedReport),
        isHoliday,
        holidayReason: isHoliday ? holidayEval.reason : null,
        isNotScheduledToday,
        isNonCompliant: isExpired,
        isLate,
        isExpired,
        isLocked,
        canStart,
        report: activeReport
          ? {
              reportId: activeReport.report_id.toString(),
              status: activeReport.status,
              submittedAt: activeReport.submitted_at || activeReport.completed_at,
              submittedBy: completedReport ? (completedSig?.signer_name || completedReport.staff?.name || null) : null,
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
    if (!rawId || isNaN(Number(rawId))) {
      return res.status(400).json({
        status: 'error',
        message: 'ID jadwal audit tidak valid.',
      });
    }
    const scheduleId = BigInt(rawId);

    const schedule = await prisma.schedule.findUnique({
      where: { schedule_id: scheduleId },
      include: {
        store: true,
        checklist_template: {
          include: {
            template_category: {
              include: { template_task: true },
            },
          },
        },
        schedule_exception: true,
        schedule_staff: true,
      },
    });

    if (!schedule || schedule.deleted_at) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan atau telah dihapus.',
      });
    }

    if (['cancelled', 'inactive', 'Dibatalkan', 'Nonaktif'].includes(schedule.status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Jadwal audit ini berstatus Nonaktif atau telah dibatalkan.',
      });
    }

    const user = await extractUser(req);
    const isStaffUser =
      user &&
      (user.role === 'Staff' ||
       user.role === 'Auditor Lapangan' ||
       user.id?.toString().startsWith('staff-') ||
       user.role?.toLowerCase().includes('staff') ||
       user.role?.toLowerCase().includes('auditor'));

    let staffId = null;
    let resolvedStaff = null;
    let staffPosition = 'Auditor Lapangan';

    if (user?.id) {
      const rawStaffId = (user.rawId || user.id.toString()).replace(/^staff-/, '');
      if (isStaffUser && rawStaffId && !isNaN(Number(rawStaffId))) {
        resolvedStaff = await prisma.staff.findUnique({
          where: { staff_id: BigInt(rawStaffId) },
        });
      }
    }

    if (!resolvedStaff && user?.email) {
      resolvedStaff = await prisma.staff.findUnique({
        where: { email: user.email.trim().toLowerCase() },
      });
    }

    if (resolvedStaff) {
      const extra = await getStaffExtra(resolvedStaff.staff_id);
      if (extra.deleted_at || resolvedStaff.status === 'inactive' || resolvedStaff.status === 'Nonaktif') {
        return res.status(403).json({
          status: 'error',
          message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus.',
        });
      }
      if (isStaffUser && resolvedStaff.store_id && resolvedStaff.store_id.toString() !== schedule.store_id.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak dapat menyerahkan laporan audit untuk cabang gerai lain.',
        });
      }
      staffId = resolvedStaff.staff_id;
      staffPosition = extra.position || 'Auditor Lapangan';
    }

    if (!staffId) {
      // Cari staf aktif yang tidak terhapus pada jadwal atau toko terkait
      const activeStoreStaff = await prisma.$queryRawUnsafe(`
        SELECT s.staff_id, s.name, s.position
        FROM staff s
        WHERE s.store_id = $1
          AND s.deleted_at IS NULL
          AND s.status IN ('active', 'Aktif')
        ORDER BY s.staff_id ASC
        LIMIT 1
      `, schedule.store_id);

      if (activeStoreStaff && activeStoreStaff[0]) {
        staffId = activeStoreStaff[0].staff_id;
        resolvedStaff = activeStoreStaff[0];
        staffPosition = activeStoreStaff[0].position || 'Auditor Lapangan';
      } else {
        const anyActiveStaff = await prisma.$queryRawUnsafe(`
          SELECT staff_id, name, position
          FROM staff
          WHERE deleted_at IS NULL
            AND status IN ('active', 'Aktif')
          ORDER BY staff_id ASC
          LIMIT 1
        `);
        if (anyActiveStaff && anyActiveStaff[0]) {
          staffId = anyActiveStaff[0].staff_id;
          resolvedStaff = anyActiveStaff[0];
          staffPosition = anyActiveStaff[0].position || 'Auditor Lapangan';
        }
      }
    }

    if (!staffId) {
      return res.status(400).json({
        status: 'error',
        message: 'Tidak dapat mengidentifikasi staf pelapor aktif.',
      });
    }

    const {
      answers = [], // array of { taskId, answer: 'standard' | 'na' | 'issue', note, photo }
      notes,
      selfiePhoto,
      signature,
      signerName,
      signerRole,
      startedAt,
    } = req.body;

    const totalQuestions = answers.length;
    const answeredCount = answers.filter((a) => a.answer).length;
    const photoCount = answers.filter((a) => a.photo).length + (selfiePhoto ? 1 : 0);

    if (totalQuestions === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Jawaban butir checklist wajib diisi sebelum menyerahkan laporan.',
      });
    }

    const now = new Date();
    const wibNow = getWibDateParts(now);
    const todayDateStr = wibNow.dateStr;

    // Cek apakah jadwal berlaku hari ini
    if (!doesScheduleApplyOnDate(schedule, todayDateStr, wibNow.dayOfWeekShort)) {
      return res.status(400).json({
        status: 'error',
        message: 'Jadwal audit ini tidak berlaku atau belum dijadwalkan untuk hari ini.',
      });
    }

    // Cek apakah toko / jadwal sedang berstatus LIBUR hari ini
    const storeHolidays = await getActiveHolidaysOnDate(todayDateStr);
    const holidayEval = evaluateHolidayForSchedule(schedule, todayDateStr, storeHolidays);

    if (holidayEval.isHoliday) {
      return res.status(400).json({
        status: 'error',
        message: `Laporan audit tidak dapat diserahkan karena gerai sedang libur (${holidayEval.reason}).`,
      });
    }

    // Sinkronkan status kedaluwarsa & cek apakah laporan sudah pernah ada hari ini
    await syncExpiredSchedulesToDb({ storeId: schedule.store_id });
    const existingReports = await prisma.checklist_report.findMany({
      where: { schedule_id: scheduleId },
      orderBy: { created_at: 'desc' },
    });
    const isRecurring = isRecurringSchedule(schedule);

    const existingCompleted = existingReports.find((r) => {
      const isFinished =
        r.status === 'submitted' ||
        r.status === 'completed' ||
        r.status === 'terlambat' ||
        r.status === 'late' ||
        r.status === 'submitted_late';
      if (!isFinished) return false;
      if (isRecurring) {
        return formatDateString(r.completed_at || r.submitted_at || r.created_at) === todayDateStr;
      }
      return true;
    });

    if (existingCompleted) {
      return res.status(409).json({
        status: 'error',
        message: 'Jadwal audit ini sudah selesai dikerjakan dan dilaporkan ke database.',
      });
    }

    const existingNonCompliant = existingReports.find((r) => {
      const isUndone = r.status === 'tidak_mengerjakan' || r.status === 'tidak_patuh';
      if (!isUndone) return false;
      if (isRecurring) {
        return formatDateString(r.completed_at || r.submitted_at || r.created_at) === todayDateStr;
      }
      return true;
    });

    if (existingNonCompliant) {
      return res.status(400).json({
        status: 'error',
        message: 'Jadwal audit ini telah ditutup otomatis sebagai Tidak Patuh dan tidak dapat diserahkan.',
      });
    }

    let isLate = false;
    if (schedule?.start_time || schedule?.end_time) {
      const startTimeStr = formatTimeString(schedule.start_time);
      const endTimeStr = formatTimeString(schedule.end_time);
      const [sH, sM] = startTimeStr.split(':').map(Number);
      const [eH, eM] = endTimeStr.split(':').map(Number);
      const startMinutes = (isNaN(sH) ? 0 : sH) * 60 + (isNaN(sM) ? 0 : sM);
      const endMinutes = (isNaN(eH) ? 23 : eH) * 60 + (isNaN(eM) ? 0 : eM);
      const currentMinutes = wibNow.currentMinutes;
      const toleranceMinutes = endMinutes + 60;
      const tolH = Math.floor(toleranceMinutes / 60) % 24;
      const tolM = toleranceMinutes % 60;
      const toleranceTimeStr = `${String(tolH).padStart(2, '0')}:${String(tolM).padStart(2, '0')}`;

      if (currentMinutes < startMinutes) {
        return res.status(400).json({
          status: 'error',
          message: `Jadwal audit belum dimulai. Jadwal baru dibuka pukul ${startTimeStr} WIB.`,
        });
      }

      // Tolak penyerahan jika sudah melewati batas toleransi 1 jam
      if (currentMinutes > toleranceMinutes) {
        return res.status(400).json({
          status: 'error',
          message: `Batas toleransi keterlambatan 1 jam telah berakhir (pukul ${toleranceTimeStr} WIB). Jadwal audit telah ditutup sebagai Tidak Patuh dan tidak dapat diserahkan.`,
        });
      }

      if (currentMinutes > endMinutes) {
        isLate = true;
      }
    }

    const reportStatus = isLate ? 'terlambat' : 'submitted';

    // Hitung skor aktual kepatuhan dari jawaban checklist (bukan hardcoded 100%)
    const noAnswers = answers.filter(a => a.answer === 'no' || a.answer === 'tidak' || a.answer === 'temuan' || a.answer === 'issue');
    const naAnswers = answers.filter(a => a.answer === 'na' || a.answer === 'N/A' || a.answer === 'tidak relevan');
    const applicableTotal = Math.max(1, totalQuestions - naAnswers.length);
    const compliancePercent = Math.max(0, Math.min(100, Math.round(((applicableTotal - noAnswers.length) / applicableTotal) * 100)));
    const calculatedScoreText = `${compliancePercent}%`;

    const startDateObj = startedAt && !isNaN(new Date(startedAt).getTime()) ? new Date(startedAt) : now;
    const durationMinute = Math.max(1, Math.min(1440, Math.round((now.getTime() - startDateObj.getTime()) / 60000)));

    const resolvedSignerName = (signerName || '').trim() || resolvedStaff?.name || user?.fullName || 'Staf Lapangan';
    const resolvedSignerRole = (signerRole || '').trim() || staffPosition || user?.position || 'Auditor Lapangan';

    const report = await prisma.checklist_report.create({
      data: {
        schedule_id: scheduleId,
        staff_id: staffId,
        started_at: startDateObj,
        completed_at: now,
        duration_minute: durationMinute,
        status: reportStatus, // Simpan status terlambat di database jika melewati jam akhir
        total_questions: totalQuestions,
        answered_questions: answeredCount,
        skipped_questions: Math.max(0, totalQuestions - answeredCount),
        total_attachments: photoCount,
      },
    });

    // Ambil task fallback jika task_id dari client tidak cocok dengan foreign key template_task
    const fallbackTemplateTask = await prisma.template_task.findFirst({
      where: schedule?.template_id ? {
        template_category: { template_id: schedule.template_id }
      } : {},
      select: { task_id: true }
    });

    for (const ans of answers) {
      if (!ans.taskId) continue;
      const parsedNum = ans.taskId.toString().replace(/\D/g, '');
      const rawTaskId = parsedNum ? BigInt(parsedNum) : null;
      if (!rawTaskId) continue;

      let validTaskId = rawTaskId;
      try {
        const taskExists = await prisma.template_task.findUnique({
          where: { task_id: rawTaskId },
          select: { task_id: true }
        });
        if (!taskExists && fallbackTemplateTask) {
          validTaskId = fallbackTemplateTask.task_id;
        }
      } catch (chkErr) {
        if (fallbackTemplateTask) validTaskId = fallbackTemplateTask.task_id;
      }

      let normalizedAnswer = 'yes';
      if (ans.answer === 'na' || ans.answer === 'N/A' || ans.answer === 'tidak relevan') {
        normalizedAnswer = 'N/A';
      } else if (ans.answer === 'no' || ans.answer === 'tidak' || ans.answer === 'temuan' || ans.answer === 'issue') {
        normalizedAnswer = 'no';
      } else {
        normalizedAnswer = 'yes';
      }

      let createdAnswer = null;
      try {
        createdAnswer = await prisma.checklist_answer.create({
          data: {
            report_id: report.report_id,
            task_id: validTaskId,
            answer: normalizedAnswer,
            comment: ans.note || null,
            answered_at: now,
          },
        });
      } catch (ansErr) {
        console.warn('⚠️ Gagal menyimpan checklist_answer item:', ansErr.message);
      }

      if (createdAnswer && ans.photo && typeof ans.photo === 'string') {
        try {
          const encryptedPhoto = ans.photo.startsWith('ENC:v1:') ? ans.photo : encryptImageData(ans.photo);
          await prisma.attachment.create({
            data: {
              report_id: report.report_id,
              answer_id: createdAnswer.answer_id,
              caption: `Bukti Foto Task #${validTaskId}`,
              file_url: Buffer.from(encryptedPhoto, 'utf8'),
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
        const encryptedSelfie = selfiePhoto.startsWith('ENC:v1:') ? selfiePhoto : encryptImageData(selfiePhoto);
        await prisma.attachment.create({
          data: {
            report_id: report.report_id,
            caption: 'Foto Verifikasi Kehadiran Bertugas',
            signer_name: resolvedSignerName,
            signer_role: resolvedSignerRole,
            file_url: Buffer.from(encryptedSelfie, 'utf8'),
            file_type: 'report_photo',
          },
        });
      } catch (selfieErr) {
        console.warn('⚠️ Gagal menyimpan selfie attachment:', selfieErr.message);
      }
    }

    if (signature && typeof signature === 'string') {
      try {
        const encryptedSig = signature.startsWith('ENC:v1:') ? signature : encryptImageData(signature);
        await prisma.attachment.create({
          data: {
            report_id: report.report_id,
            caption: 'Tanda Tangan Digital Verifikasi Staff',
            signer_name: resolvedSignerName,
            signer_role: resolvedSignerRole,
            file_url: Buffer.from(encryptedSig, 'utf8'),
            file_type: 'signature',
          },
        });
      } catch (sigErr) {
        console.warn('⚠️ Gagal menyimpan signature attachment:', sigErr.message);
      }
    }

    const reportNumber = `CHK-${todayDateStr.replace(/-/g, '')}-${report.report_id.toString().padStart(4, '0')}`;
    const submittedAtFormatted = wibNow.formattedDateTime;

    return res.status(201).json({
      status: 'success',
      message: isLate
        ? 'Laporan audit berhasil diserahkan (Status: Terlambat).'
        : 'Laporan audit berhasil diserahkan ke Store Manager!',
      data: {
        reportId: report.report_id.toString(),
        reportNumber,
        status: reportStatus,
        isLate,
        totalQuestions,
        answeredQuestions: answeredCount,
        scoreText: calculatedScoreText,
        storeName: schedule?.store?.store_name || user?.storeName || 'Toko Cabang',
        storeCode: `ST-${schedule?.store?.store_id?.toString() || '01'}`,
        scheduleTitle: schedule?.title || schedule?.checklist_template?.template_name || 'Jadwal Audit Operasional Reguler',
        signerName: resolvedSignerName,
        signerRole: resolvedSignerRole,
        submittedAt: now.toISOString(),
        submittedAtFormatted,
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

/**
 * GET /api/staff/reports/:id
 * Mengambil detail hasil penyerahan laporan audit dari database PostgreSQL
 */
exports.getReportDetail = async (req, res) => {
  try {
    const user = await extractUser(req);
    const isStaffUser =
      user &&
      (user.role === 'Staff' ||
       user.role === 'Auditor Lapangan' ||
       user.id?.toString().startsWith('staff-') ||
       user.role?.toLowerCase().includes('staff') ||
       user.role?.toLowerCase().includes('auditor'));

    let viewerStaffId = null;
    let viewerStoreId = null;
    if (isStaffUser) {
      let st = null;
      const cleanStaffId = user.rawId || user.id?.toString().replace(/^staff-/, '');
      if (cleanStaffId && !isNaN(Number(cleanStaffId))) {
        st = await prisma.staff.findUnique({ where: { staff_id: BigInt(cleanStaffId) } });
      }
      if (!st && user.email) {
        st = await prisma.staff.findUnique({ where: { email: user.email.trim().toLowerCase() } });
      }
      if (st) {
        const extra = await getStaffExtra(st.staff_id);
        if (extra.deleted_at || st.status === 'inactive' || st.status === 'Nonaktif') {
          return res.status(403).json({
            status: 'error',
            message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus.',
          });
        }
        viewerStaffId = st.staff_id;
        viewerStoreId = st.store_id;
      }
    }

    const rawParam = req.params.id ? req.params.id.toString() : '';
    const isLatestRequest = !rawParam || rawParam.toLowerCase() === 'latest';
    const rawId = !isLatestRequest ? rawParam.replace(/\D/g, '') : '';
    let report = null;

    if (!isLatestRequest) {
      if (!rawId) {
        return res.status(400).json({
          status: 'error',
          message: 'ID laporan audit tidak valid.',
        });
      }
      report = await prisma.checklist_report.findUnique({
        where: { report_id: BigInt(rawId) },
        include: {
          schedule: {
            include: {
              store: true,
              checklist_template: true,
            },
          },
          staff: true,
          checklist_answer: true,
          attachment: true,
        },
      });
      if (!report) {
        return res.status(404).json({
          status: 'error',
          message: 'Laporan audit tidak ditemukan di database.',
        });
      }
      if (isStaffUser && viewerStoreId && report.schedule?.store_id?.toString() !== viewerStoreId.toString()) {
        return res.status(403).json({
          status: 'error',
          message: 'Anda tidak memiliki akses ke laporan audit gerai lain.',
        });
      }
    } else {
      const latestWhere = viewerStoreId
        ? { schedule: { store_id: viewerStoreId } }
        : (viewerStaffId ? { staff_id: viewerStaffId } : {});
      report = await prisma.checklist_report.findFirst({
        where: latestWhere,
        include: {
          schedule: {
            include: {
              store: true,
              checklist_template: true,
            },
          },
          staff: true,
          checklist_answer: true,
          attachment: true,
        },
        orderBy: [
          { completed_at: 'desc' },
          { created_at: 'desc' },
        ],
      });
    }

    if (!report) {
      return res.status(404).json({
        status: 'error',
        message: 'Laporan audit tidak ditemukan di database.',
      });
    }

    const dateObj = report.completed_at || report.created_at || new Date();
    const wibDateParts = getWibDateParts(dateObj);
    const submittedAtFormatted = wibDateParts.formattedDateTime;

    const isNonCompliant = report.status === 'tidak_mengerjakan' || report.status === 'tidak_patuh';
    const answersList = report.checklist_answer || [];
    const totalQuestions = report.total_questions || answersList.length || 0;
    const answeredCount = isNonCompliant ? 0 : (report.answered_questions ?? totalQuestions);

    let compliancePercent = 0;
    if (!isNonCompliant && totalQuestions > 0) {
      const noCount = answersList.filter((a) => a.answer === 'no').length;
      const naCount = answersList.filter((a) => a.answer === 'N/A' || a.answer === 'na').length;
      const applicableTotal = Math.max(1, totalQuestions - naCount);
      compliancePercent = Math.max(0, Math.min(100, Math.round(((applicableTotal - noCount) / applicableTotal) * 100)));
    }

    const repStaffExtra = await getStaffExtra(report.staff_id);
    const sigAttachment = report.attachment?.find(
      (a) => a.file_type === 'signature' || a.signer_name
    );
    const signerName = isNonCompliant
      ? '-'
      : (sigAttachment?.signer_name || report.staff?.name || 'Staf Lapangan');
    const signerRole = isNonCompliant
      ? null
      : (sigAttachment?.signer_role || repStaffExtra.position || 'Auditor Lapangan');

    const isLate =
      report.status === 'terlambat' ||
      report.status === 'late' ||
      report.status === 'submitted_late';
    const reportNumber = `CHK-${wibDateParts.dateStr.replace(/-/g, '')}-${report.report_id.toString().padStart(4, '0')}`;

    return res.status(200).json({
      status: 'success',
      data: {
        reportId: report.report_id.toString(),
        reportNumber,
        status: report.status || (isLate ? 'terlambat' : 'submitted'),
        isLate,
        isNonCompliant,
        totalQuestions,
        answeredQuestions: answeredCount,
        scoreText: `${compliancePercent}%`,
        storeName:
          report.schedule?.store?.store_name || 'Gerai',
        storeCode: report.schedule?.store?.store_id ? `ST-${report.schedule.store.store_id}` : '',
        storeLocation: report.schedule?.store?.city || 'Cabang Gerai',
        scheduleTitle:
          report.schedule?.title ||
          report.schedule?.checklist_template?.template_name ||
          'Jadwal Audit',
        signerName,
        signerRole,
        submittedAt: dateObj.toISOString(),
        submittedAtFormatted,
      },
    });
  } catch (error) {
    console.error('❌ Error in getReportDetail:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memuat detail laporan: ' + error.message,
    });
  }
};

/**
 * GET /api/staff/history
 * Mengambil riwayat laporan audit checklist staf yang tersimpan secara realtime di database
 */
exports.getMyHistory = async (req, res) => {
  try {
    const user = await extractUser(req);
    let staffId = null;
    let storeId = null;

    const isStaffUser =
      user &&
      (user.role === 'Staff' ||
       user.role === 'Auditor Lapangan' ||
       user.id?.toString().startsWith('staff-') ||
       user.role?.toLowerCase().includes('staff') ||
       user.role?.toLowerCase().includes('auditor'));

    // 1. Prioritaskan resolusi store_id dari database tabel staff (bukan cache client/query param)
    if (isStaffUser) {
      let st = null;
      const cleanStaffId = user.rawId || user.id?.toString().replace(/^staff-/, '');
      if (cleanStaffId && !isNaN(Number(cleanStaffId))) {
        st = await prisma.staff.findUnique({ where: { staff_id: BigInt(cleanStaffId) } });
      }
      if (!st && user.email) {
        st = await prisma.staff.findUnique({ where: { email: user.email.trim().toLowerCase() } });
      }
      if (st) {
        const extra = await getStaffExtra(st.staff_id);
        if (extra.deleted_at || st.status === 'inactive' || st.status === 'Nonaktif') {
          return res.status(403).json({
            status: 'error',
            message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus.',
          });
        }
        staffId = st.staff_id;
        storeId = st.store_id;
      }
    } else if (user?.email) {
      const st = await prisma.staff.findUnique({
        where: { email: user.email.trim().toLowerCase() },
      });
      if (st) {
        const extra = await getStaffExtra(st.staff_id);
        if (extra.deleted_at || st.status === 'inactive' || st.status === 'Nonaktif') {
          return res.status(403).json({
            status: 'error',
            message: 'Akun staf Anda berstatus Nonaktif atau telah dihapus.',
          });
        }
        staffId = st.staff_id;
        storeId = st.store_id;
      }
    }

    if (req.query.staffId && !isStaffUser) {
      try {
        const cleanStaffId = req.query.staffId.toString().replace(/^staff-/, '');
        const st = await prisma.staff.findUnique({ where: { staff_id: BigInt(cleanStaffId) } });
        if (st) {
          staffId = st.staff_id;
          storeId = st.store_id;
        }
      } catch (e) {}
    }

    if (!storeId) {
      if (req.query.storeId || req.headers['x-store-id']) {
        const sId = (req.query.storeId || req.headers['x-store-id']).toString().replace(/^str-/, '').replace(/^st-/, '');
        if (!isNaN(Number(sId))) storeId = BigInt(sId);
      } else if (user?.storeId) {
        const sId = user.storeId.toString().replace(/^str-/, '').replace(/^st-/, '');
        if (!isNaN(Number(sId))) storeId = BigInt(sId);
      }
    }

    const whereClause = {};
    if (storeId) {
      whereClause.schedule = { store_id: storeId };
      await syncExpiredSchedulesToDb({ storeId, staffId });
    }

    let reports = await prisma.checklist_report.findMany({
      where: whereClause,
      include: {
        schedule: {
          include: {
            store: true,
            checklist_template: true,
          },
        },
        staff: true,
        checklist_answer: true,
        attachment: true,
      },
      orderBy: [
        { completed_at: 'desc' },
        { created_at: 'desc' },
      ],
    });

    // Jangan bocorkan laporan gerai lain jika gerai staf ini memang belum memiliki riwayat
    if (reports.length === 0 && !storeId) {
      reports = await prisma.checklist_report.findMany({
        include: {
          schedule: {
            include: {
              store: true,
              checklist_template: true,
            },
          },
          staff: true,
          checklist_answer: true,
          attachment: true,
        },
        orderBy: [
          { completed_at: 'desc' },
          { created_at: 'desc' },
        ],
      });
    }

    const staffExtrasMap = await getStaffExtrasMap(reports.map((r) => r.staff_id));
    const groupsMap = new Map();

    for (const r of reports) {
      const dateObj = r.completed_at || r.created_at || new Date();
      const dateKey = formatDateString(dateObj);

      const answersList = r.checklist_answer || [];
      const totalAnswers = r.total_questions || answersList.length || 0;
      const noAnswers = answersList.filter(a => a.answer === 'no');
      const naAnswers = answersList.filter(a => a.answer === 'N/A' || a.answer === 'na');
      const hasIssues = noAnswers.length > 0;
      const applicableTotal = Math.max(1, totalAnswers - naAnswers.length);

      const isNonCompliant = r.status === 'tidak_mengerjakan' || r.status === 'tidak_patuh';
      let scoreText = '100% Sesuai';
      if (isNonCompliant) {
        scoreText = '0% (Tidak Patuh)';
      } else if (totalAnswers > 0) {
        const compliantCount = Math.max(0, applicableTotal - noAnswers.length);
        const pct = Math.max(0, Math.min(100, Math.round((compliantCount / applicableTotal) * 100)));
        scoreText = `${pct}% Skor SOP`;
      } else {
        scoreText = '0% Skor SOP';
      }

      const isExplicitLate = r.status === 'terlambat' || r.status === 'late' || r.status === 'submitted_late';
      let isLate = isExplicitLate;
      if (!isNonCompliant && !isLate && r.schedule?.end_time && (r.completed_at || r.created_at)) {
        const schedEndTime = formatTimeString(r.schedule.end_time);
        const reportTime = formatTimeString(r.completed_at || r.created_at);
        const [eH, eM] = schedEndTime.split(':').map(Number);
        const [rH, rM] = reportTime.split(':').map(Number);
        if (!isNaN(eH) && !isNaN(rH) && (rH * 60 + rM > eH * 60 + eM)) {
          isLate = true;
        }
      }

      let statusType = 'selesai';
      let statusBadge = 'Selesai';
      let rightBadge = undefined;

      if (isNonCompliant) {
        statusType = 'tidak_patuh';
        statusBadge = 'Tidak Patuh';
        rightBadge = 'Tidak Mengerjakan';
      } else if (hasIssues) {
        statusType = 'temuan';
        statusBadge = isLate ? `${noAnswers.length} Temuan (Terlambat)` : `${noAnswers.length} Temuan`;
        rightBadge = isLate ? 'Terlambat' : `${noAnswers.length} Temuan`;
      } else if (isLate) {
        statusType = 'terlambat';
        statusBadge = 'Terlambat';
        rightBadge = 'Terlambat';
      }

      const completedTimeStr = formatTimeString(dateObj);

      // Ambil nama dan role auditor dari attachment tanda tangan atau staff DB
      const sigAttachment = r.attachment?.find(a => a.file_type === 'signature' || a.signer_name);
      const staffExtra = r.staff_id ? staffExtrasMap.get(r.staff_id.toString()) : null;
      const auditor = isNonCompliant ? '-' : (sigAttachment?.signer_name || r.staff?.name || user?.fullName || 'Staf Lapangan');
      const auditorRole = isNonCompliant ? null : (sigAttachment?.signer_role || staffExtra?.position || 'Auditor Lapangan');

      const firstIssueComment = noAnswers.find(a => a.comment)?.comment;
      const notes = isNonCompliant
        ? 'Melewati batas toleransi pengerjaan 1 jam. Ditutup otomatis oleh sistem dan tercatat sebagai Tidak Mengerjakan / Tidak Patuh.'
        : (firstIssueComment || (hasIssues ? `${noAnswers.length} butir checklist bermasalah.` : 'Semua butir checklist sesuai standar SOP operasional.'));

      const item = {
        id: r.report_id.toString(),
        time: `${completedTimeStr} WIB`,
        title: r.schedule?.title || r.schedule?.checklist_template?.template_name || 'Checklist Operasional',
        auditor,
        auditorRole,
        itemCount: isNonCompliant ? 'Tidak Dikerjakan' : `${totalAnswers} Item Checklist`,
        scoreText,
        statusType,
        statusBadge,
        rightBadge,
        isLate: Boolean(isLate && !isNonCompliant),
        isGpsValid: !isNonCompliant,
        storeName: r.schedule?.store?.store_name || user?.storeName || 'Toko Cabang',
        notes,
        completedAt: dateObj.toISOString(),
        totalQuestions: totalAnswers,
        answeredQuestions: isNonCompliant ? 0 : (r.answered_questions ?? totalAnswers),
        durationMinute: r.duration_minute || 0,
        issues: noAnswers.map(a => ({
          taskId: a.task_id?.toString(),
          comment: a.comment,
        })),
      };

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey).push(item);
    }

    const wibNowTimestamp = Date.now() + 7 * 60 * 60 * 1000;
    const wibNowDate = new Date(wibNowTimestamp);
    const todayStr = `${wibNowDate.getUTCFullYear()}-${String(wibNowDate.getUTCMonth() + 1).padStart(2, '0')}-${String(wibNowDate.getUTCDate()).padStart(2, '0')}`;
    const yesterdayDate = new Date(wibNowTimestamp - 24 * 60 * 60 * 1000);
    const yesterdayStr = `${yesterdayDate.getUTCFullYear()}-${String(yesterdayDate.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getUTCDate()).padStart(2, '0')}`;

    const resultGroups = [];
    for (const [dKey, items] of groupsMap.entries()) {
      const dObj = new Date(`${dKey}T12:00:00Z`);
      const dateFormatted = dObj.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      }).toUpperCase();

      let dateHeader = dateFormatted;
      if (dKey === todayStr) {
        dateHeader = `HARI INI — ${dateFormatted}`;
      } else if (dKey === yesterdayStr) {
        dateHeader = `KEMARIN — ${dateFormatted}`;
      }

      resultGroups.push({
        dateKey: dKey,
        dateHeader,
        itemCountLabel: `${items.length} Checklist`,
        items,
      });
    }

    let primaryStore = null;
    if (storeId) {
      const activeStore = await prisma.store.findUnique({ where: { store_id: storeId } });
      if (activeStore) {
        primaryStore = {
          id: activeStore.store_id.toString(),
          name: activeStore.store_name,
          location: activeStore.city || activeStore.address || 'Cabang Gerai',
          code: `ST-${activeStore.store_id}`,
          address: activeStore.address || 'Alamat gerai belum diatur',
        };
      }
    } else if (reports.length > 0 && reports[0].schedule?.store) {
      const s = reports[0].schedule.store;
      primaryStore = {
        id: s.store_id.toString(),
        name: s.store_name,
        location: s.city || s.address || 'Cabang Gerai',
        code: `ST-${s.store_id}`,
        address: s.address || 'Alamat gerai belum diatur',
      };
    }

    return res.status(200).json({
      status: 'success',
      totalReports: reports.length,
      store: primaryStore,
      data: resultGroups,
    });
  } catch (error) {
    console.error('❌ [getMyHistory] Error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil riwayat audit staff: ' + error.message,
    });
  }
};

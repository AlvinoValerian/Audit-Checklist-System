const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');

/**
 * Pastikan tabel store_holiday selalu tersedia di PostgreSQL
 */
const ensureHolidayTable = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS store_holiday (
        holiday_id BIGSERIAL PRIMARY KEY,
        store_id BIGINT,
        workspace_id BIGINT,
        store_name VARCHAR(255) NOT NULL,
        store_location VARCHAR(255),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        duration_days INT DEFAULT 1,
        reason TEXT NOT NULL,
        created_by VARCHAR(255) DEFAULT 'Admin',
        creator_role VARCHAR(100) DEFAULT 'Admin',
        status VARCHAR(50) DEFAULT 'Terjadwal',
        libur_type VARCHAR(50) DEFAULT 'full',
        schedules JSONB DEFAULT '[]'::jsonb,
        deleted_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn('⚠️ [ensureHolidayTable]:', err.message);
  }
};

// Jalankan self-healing table saat file dimuat
ensureHolidayTable();

/**
 * Helper tanggal YYYY-MM-DD
 */
const formatDate = (d) => {
  if (!d) return '';
  if (typeof d === 'string') return d.substring(0, 10);
  if (d instanceof Date) return d.toISOString().substring(0, 10);
  return String(d).substring(0, 10);
};

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Format entitas store_holiday untuk Frontend
 */
const formatHoliday = (row) => {
  const todayStr = getTodayStr();
  const startDateStr = formatDate(row.start_date);
  const endDateStr = formatDate(row.end_date);

  let status = row.status || 'Terjadwal';
  // Jika masih Terjadwal namun tanggal selesai sudah lewat dari hari ini -> Selesai
  if (status === 'Terjadwal' && endDateStr < todayStr) {
    status = 'Selesai';
  }

  let schedules = [];
  if (Array.isArray(row.schedules)) {
    schedules = row.schedules;
  } else if (typeof row.schedules === 'string') {
    try {
      schedules = JSON.parse(row.schedules);
    } catch {
      schedules = [];
    }
  }

  return {
    id: row.holiday_id ? row.holiday_id.toString() : '',
    holidayId: row.holiday_id ? row.holiday_id.toString() : '',
    storeId: row.store_id ? row.store_id.toString() : undefined,
    workspaceId: row.workspace_id ? row.workspace_id.toString() : undefined,
    storeName: row.store_name,
    storeLocation: row.store_location || 'Lokasi Toko',
    startDate: startDateStr,
    endDate: endDateStr,
    durationDays: Number(row.duration_days) || 1,
    reason: row.reason || '',
    createdBy: row.created_by || 'Admin',
    creatorRole: row.creator_role || 'Admin',
    status: status,
    liburType: row.libur_type || 'full',
    schedules: schedules,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
};

/**
 * GET /api/holidays
 * Mengambil daftar libur toko
 */
exports.getAllHolidays = async (req, res) => {
  try {
    await ensureHolidayTable();

    const user = await extractUser(req);
    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    const { storeName, status } = req.query;

    let query = `SELECT * FROM store_holiday WHERE 1=1`;
    const params = [];

    if (requestedWsId && requestedWsId !== 'all') {
      try {
        const cleanWs = BigInt(requestedWsId.toString().replace(/^ws-/, ''));
        params.push(cleanWs);
        query += ` AND workspace_id = $${params.length}`;
      } catch (e) {}
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      try {
        const cleanWs = BigInt(user.workspaceId.toString().replace(/^ws-/, ''));
        params.push(cleanWs);
        query += ` AND workspace_id = $${params.length}`;
      } catch (e) {}
    }

    if (storeName) {
      params.push(`%${storeName}%`);
      query += ` AND store_name ILIKE $${params.length}`;
    }

    if (status && status !== 'Semua') {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    query += ` ORDER BY start_date DESC, created_at DESC`;

    const rows = await prisma.$queryRawUnsafe(query, ...params);
    const data = rows.map(formatHoliday);

    return res.status(200).json({
      status: 'success',
      total: data.length,
      data,
    });
  } catch (error) {
    console.error('❌ Error in getAllHolidays:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memuat data libur toko dari database.',
      error: error.message,
    });
  }
};

/**
 * POST /api/holidays
 * Menambahkan data libur toko (bisa single object atau batch array)
 */
exports.createHoliday = async (req, res) => {
  try {
    await ensureHolidayTable();

    const loggedInUser = await extractUser(req);
    const fallbackName = loggedInUser?.fullName || loggedInUser?.name || loggedInUser?.email || 'Admin';
    const fallbackRole = loggedInUser?.role || 'Admin';

    const payload = req.body;

    // Cek jika payload adalah batch array
    const itemsToCreate = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.holidays)
      ? payload.holidays
      : [payload];

    if (itemsToCreate.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Data libur tidak boleh kosong.',
      });
    }

    const createdRecords = [];

    for (const item of itemsToCreate) {
      const {
        storeId,
        workspaceId,
        storeName,
        storeLocation,
        startDate,
        endDate,
        reason,
        createdBy,
        creatorRole,
        status,
        liburType,
        schedules,
      } = item;

      if (!storeName || !startDate || !endDate || !reason) {
        continue;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

      const schedulesJson = JSON.stringify(Array.isArray(schedules) ? schedules : []);

      const insertQuery = `
        INSERT INTO store_holiday (
          store_id, workspace_id, store_name, store_location,
          start_date, end_date, duration_days, reason,
          created_by, creator_role, status, libur_type,
          schedules, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5::date, $6::date, $7, $8,
          $9, $10, $11, $12,
          $13::jsonb, NOW(), NOW()
        ) RETURNING *
      `;

      const rawWs = workspaceId || req.query.workspaceId || req.headers['x-workspace-id'] || loggedInUser?.workspaceId;
      let finalWsId = null;
      if (rawWs && rawWs !== 'all') {
        try {
          finalWsId = BigInt(rawWs.toString().replace(/^ws-/, ''));
        } catch (e) {}
      }

      let finalStoreId = null;
      if (storeId) {
        try {
          finalStoreId = BigInt(storeId.toString().replace(/^str-/, ''));
        } catch (e) {}
      } else if (storeName) {
        try {
          const storeFound = await prisma.store.findFirst({
            where: {
              store_name: storeName.trim(),
              ...(finalWsId ? { workspace_id: finalWsId } : {}),
            },
          });
          if (storeFound) {
            finalStoreId = storeFound.store_id;
            if (!finalWsId && storeFound.workspace_id) {
              finalWsId = storeFound.workspace_id;
            }
          }
        } catch (e) {}
      }

      const values = [
        finalStoreId,
        finalWsId,
        storeName.trim(),
        storeLocation || 'Lokasi Toko',
        startDate,
        endDate,
        durationDays,
        reason.trim(),
        createdBy || fallbackName,
        creatorRole || fallbackRole,
        status || 'Terjadwal',
        liburType || 'full',
        schedulesJson,
      ];

      const [newRow] = await prisma.$queryRawUnsafe(insertQuery, ...values);
      if (newRow) {
        createdRecords.push(formatHoliday(newRow));
      }
    }

    return res.status(201).json({
      status: 'success',
      message: `Berhasil menyimpan ${createdRecords.length} jadwal libur toko.`,
      data: createdRecords.length === 1 ? createdRecords[0] : createdRecords,
    });
  } catch (error) {
    console.error('❌ Error in createHoliday:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal menyimpan libur toko ke database.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/holidays/:id
 * Mengupdate data libur toko
 */
exports.updateHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^hol-/, ''));
    const {
      storeName,
      storeLocation,
      startDate,
      endDate,
      reason,
      status,
      liburType,
      schedules,
    } = req.body;

    const existingRows = await prisma.$queryRawUnsafe(
      `SELECT * FROM store_holiday WHERE holiday_id = $1`,
      cleanId
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal libur toko tidak ditemukan.',
      });
    }

    const current = existingRows[0];
    const sDate = startDate || formatDate(current.start_date);
    const eDate = endDate || formatDate(current.end_date);
    const start = new Date(sDate);
    const end = new Date(eDate);
    const durationDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const schedulesJson = JSON.stringify(
      schedules !== undefined ? schedules : current.schedules
    );

    const updateQuery = `
      UPDATE store_holiday SET
        store_name = COALESCE($1, store_name),
        store_location = COALESCE($2, store_location),
        start_date = $3::date,
        end_date = $4::date,
        duration_days = $5,
        reason = COALESCE($6, reason),
        status = COALESCE($7, status),
        libur_type = COALESCE($8, libur_type),
        schedules = $9::jsonb,
        updated_at = NOW()
      WHERE holiday_id = $10
      RETURNING *
    `;

    const values = [
      storeName || null,
      storeLocation || null,
      sDate,
      eDate,
      durationDays,
      reason || null,
      status || null,
      liburType || null,
      schedulesJson,
      cleanId,
    ];

    const [updatedRow] = await prisma.$queryRawUnsafe(updateQuery, ...values);

    return res.status(200).json({
      status: 'success',
      message: 'Jadwal libur toko berhasil diperbarui.',
      data: formatHoliday(updatedRow),
    });
  } catch (error) {
    console.error('❌ Error in updateHoliday:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui libur toko di database.',
      error: error.message,
    });
  }
};

/**
 * PATCH /api/holidays/:id/restore
 * Mengembalikan status libur yang sebelumnya dibatalkan / soft delete
 */
exports.restoreHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^hol-/, ''));

    // 1. Ambil data libur yang ingin dipulihkan
    const [target] = await prisma.$queryRawUnsafe(
      `SELECT * FROM store_holiday WHERE holiday_id = $1`,
      cleanId
    );

    if (!target) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal libur tidak ditemukan untuk dipulihkan.',
      });
    }

    // 2. Pengecekan Tabrakan / Collision dengan Libur Aktif Lainnya
    const targetStartDate = formatDate(target.start_date);
    const targetEndDate = formatDate(target.end_date);

    const activeHolidays = await prisma.$queryRawUnsafe(
      `
      SELECT * FROM store_holiday
      WHERE holiday_id != $1
        AND status != 'Dibatalkan'
        AND store_name = $2
        AND start_date <= $3::date
        AND end_date >= $4::date
      `,
      cleanId,
      target.store_name,
      targetEndDate,
      targetStartDate
    );

    if (activeHolidays && activeHolidays.length > 0) {
      let collisionHoliday = null;
      const targetType = target.libur_type || 'full';
      let targetSchedules = [];
      try {
        targetSchedules = Array.isArray(target.schedules)
          ? target.schedules
          : JSON.parse(target.schedules || '[]');
      } catch {
        targetSchedules = [];
      }

      for (const active of activeHolidays) {
        const activeType = active.libur_type || 'full';
        // Jika salah satu adalah libur full, maka pasti bertabrakan
        if (targetType === 'full' || activeType === 'full') {
          collisionHoliday = active;
          break;
        }

        // Jika keduanya libur sebagian (partial), periksa apakah ada shift/jadwal yang sama
        let activeSchedules = [];
        try {
          activeSchedules = Array.isArray(active.schedules)
            ? active.schedules
            : JSON.parse(active.schedules || '[]');
        } catch {
          activeSchedules = [];
        }

        const hasOverlap = targetSchedules.some((s) => activeSchedules.includes(s));
        if (hasOverlap || targetSchedules.length === 0 || activeSchedules.length === 0) {
          collisionHoliday = active;
          break;
        }
      }

      if (collisionHoliday) {
        const cStart = formatDate(collisionHoliday.start_date);
        const cEnd = formatDate(collisionHoliday.end_date);
        const dateRange = cStart === cEnd ? cStart : `${cStart} s/d ${cEnd}`;
        return res.status(409).json({
          status: 'error',
          message: `Tidak dapat memulihkan libur: Jadwal libur bertabrakan dengan libur aktif yang sudah ada pada tanggal ${dateRange} (${collisionHoliday.libur_type === 'partial' ? 'Libur Sebagian' : 'Libur Penuh'}: "${collisionHoliday.reason}").`,
        });
      }
    }

    const todayStr = getTodayStr();

    const [updatedRow] = await prisma.$queryRawUnsafe(
      `
      UPDATE store_holiday SET
        status = CASE WHEN end_date < $1::date THEN 'Selesai' ELSE 'Terjadwal' END,
        deleted_at = NULL,
        updated_at = NOW()
      WHERE holiday_id = $2
      RETURNING *
    `,
      todayStr,
      cleanId
    );

    if (!updatedRow) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal libur tidak ditemukan untuk dipulihkan.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Jadwal libur berhasil dipulihkan.',
      data: formatHoliday(updatedRow),
    });
  } catch (error) {
    console.error('❌ Error in restoreHoliday:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memulihkan jadwal libur.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/holidays/:id
 * Soft delete (Dibatalkan) atau permanent delete
 */
exports.deleteHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^hol-/, ''));
    const isPermanent = req.query.permanent === 'true';

    if (isPermanent) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM store_holiday WHERE holiday_id = $1`,
        cleanId
      );
      return res.status(200).json({
        status: 'success',
        message: 'Jadwal libur berhasil dihapus permanen dari database.',
      });
    }

    // Soft delete -> Dibatalkan
    const [updatedRow] = await prisma.$queryRawUnsafe(
      `
      UPDATE store_holiday SET
        status = 'Dibatalkan',
        deleted_at = NOW(),
        updated_at = NOW()
      WHERE holiday_id = $1
      RETURNING *
    `,
      cleanId
    );

    if (!updatedRow) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal libur tidak ditemukan.',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Jadwal libur toko berhasil dibatalkan.',
      data: formatHoliday(updatedRow),
    });
  } catch (error) {
    console.error('❌ Error in deleteHoliday:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membatalkan jadwal libur.',
      error: error.message,
    });
  }
};

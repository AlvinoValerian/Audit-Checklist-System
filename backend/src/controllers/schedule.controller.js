const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');

/**
 * Format string waktu "HH:mm" atau Date object menjadi "HH:mm"
 */
const formatTimeString = (time) => {
  if (!time) return '09:00';
  if (typeof time === 'string') {
    // Jika bentuk ISO date string atau "08:30:00"
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
 * Format string tanggal atau Date object menjadi "YYYY-MM-DD"
 */
const formatDateString = (date) => {
  if (!date) return new Date().toISOString().split('T')[0];
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  return String(date).substring(0, 10);
};

/**
 * Resolusi realtime status jadwal
 */
/**
 * Helper: Cek apakah jadwal sedang berlangsung saat ini
 * (berlaku pada hari ini dan sedang berada di dalam rentang waktu start_time s/d end_time)
 */
const isScheduleRunningNow = (scheduleRecord) => {
  if (!scheduleRecord) return false;
  if (scheduleRecord.status === 'inactive' || scheduleRecord.deleted_at) {
    return false;
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  const dayOfWeekShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][now.getDay()];

  const scheduleDateStr = formatDateString(scheduleRecord.start_date);
  const recurrence = scheduleRecord.repeat_time === 'daily' ? 'Setiap Hari' : 'Hari Tertentu';
  const selectedDays = scheduleRecord.selected_days ? scheduleRecord.selected_days.split(',') : [];

  const runsToday =
    scheduleDateStr === todayStr ||
    recurrence === 'Setiap Hari' ||
    (recurrence === 'Hari Tertentu' && selectedDays.includes(dayOfWeekShort));

  if (!runsToday) return false;

  const startTimeStr = formatTimeString(scheduleRecord.start_time);
  const endTimeStr = formatTimeString(scheduleRecord.end_time);

  const [sH, sM] = startTimeStr.split(':').map((v) => parseInt(v, 10));
  const [eH, eM] = endTimeStr.split(':').map((v) => parseInt(v, 10));

  if (isNaN(sH) || isNaN(eH)) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = sH * 60 + (isNaN(sM) ? 0 : sM);
  const endMinutes = eH * 60 + (isNaN(eM) ? 0 : eM);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
};

const computeRealtimeStatus = (rawStatus, scheduleDateStr, endTimeStr, recurrence, selectedDays) => {
  if (rawStatus === 'cancelled' || rawStatus === 'Dibatalkan' || rawStatus === 'inactive') {
    return 'Dibatalkan';
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  const dayOfWeekShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][now.getDay()];

  // Cek apakah jadwal ini aktif/berlaku pada hari ini (today):
  const runsToday =
    scheduleDateStr === todayStr ||
    recurrence === 'Setiap Hari' ||
    (recurrence === 'Hari Tertentu' && Array.isArray(selectedDays) && selectedDays.includes(dayOfWeekShort));

  if (runsToday) {
    if (endTimeStr) {
      const parts = endTimeStr.split(':');
      if (parts.length >= 2) {
        const endH = parseInt(parts[0], 10);
        const endM = parseInt(parts[1], 10);
        if (!isNaN(endH) && !isNaN(endM)) {
          const scheduleEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM, 0, 0);
          if (now.getTime() >= scheduleEnd.getTime()) {
            return 'Selesai';
          }
        }
      }
    }
    return 'Terjadwal';
  }

  // Jika bukan hari ini:
  if (scheduleDateStr < todayStr) {
    return 'Selesai';
  }

  return 'Terjadwal';
};

/**
 * Format entitas Schedule dari DB PostgreSQL ke antarmuka Frontend
 */
const formatSchedule = (s) => {
  const startTime = formatTimeString(s.start_time);
  const endTime = formatTimeString(s.end_time);
  const date = formatDateString(s.start_date);
  const createdAt = formatDateString(s.created_at);
  const deletedAt = s.deleted_at ? formatDateString(s.deleted_at) : undefined;

  const recurrence =
    s.repeat_time === 'daily' || s.repeat_time === 'Setiap Hari'
      ? 'Setiap Hari'
      : 'Hari Tertentu';

  let selectedDays = [];
  if (s.selected_days) {
    selectedDays = s.selected_days.split(',').map((d) => d.trim()).filter(Boolean);
  }

  // Auditor name: ambil dari schedule_staff pertama atau nama admin
  let auditorName = 'Hendra Wijaya';
  if (Array.isArray(s.schedule_staff) && s.schedule_staff.length > 0 && s.schedule_staff[0].staff) {
    auditorName = s.schedule_staff[0].staff.name;
  } else if (s.admin && s.admin.name) {
    auditorName = s.admin.name;
  }

  const status = computeRealtimeStatus(s.status, date, endTime, recurrence, selectedDays);

  const storeName = s.store?.store_name || 'Cabang Toko';
  let storeLocation = s.store?.city || s.store?.address || 'Jakarta Pusat';
  if (s.store?.address && !s.store?.city) {
    if (s.store.address.includes('Malang')) storeLocation = 'Kota Malang';
    else if (s.store.address.includes('Surabaya')) storeLocation = 'Kota Surabaya';
    else if (s.store.address.includes('Jakarta')) storeLocation = 'DKI Jakarta';
    else if (s.store.address.includes('Tangerang')) storeLocation = 'Tangerang';
  }

  return {
    id: s.schedule_id.toString(),
    storeId: s.store_id ? s.store_id.toString() : undefined,
    storeName,
    storeLocation,
    selectedStores: [storeName],
    scheduleName: s.title,
    templateId: s.template_id ? s.template_id.toString() : undefined,
    templateName: s.checklist_template?.template_name || 'Checklist Operasional Harian',
    auditorName,
    timeRange: `${startTime} - ${endTime}`,
    startTime,
    endTime,
    date,
    recurrence,
    selectedDays,
    status,
    notes: s.notes || '',
    createdAt,
    deletedAt,
  };
};

/**
 * GET /api/schedules
 * Mengambil daftar seluruh jadwal audit dengan filter workspace & role
 */
exports.getAllSchedules = async (req, res) => {
  try {
    const user = await extractUser(req);
    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    const where = {};

    // 1. Logika penentuan workspace:
    if (requestedWsId && requestedWsId !== 'all') {
      const cleanWs = BigInt(requestedWsId.toString().replace(/^ws-/, ''));
      where.store = { workspace_id: cleanWs };
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      where.store = { workspace_id: BigInt(user.workspaceId) };
    } else if (user && user.role === 'Super Admin' && user.rawId) {
      const cleanSaId = BigInt(user.rawId);
      where.store = {
        workspace: { super_admin_id: cleanSaId },
      };
    } else if (req.query.superAdminId) {
      const cleanSaId = BigInt(req.query.superAdminId.toString().replace(/^sa-/, ''));
      where.store = {
        workspace: { super_admin_id: cleanSaId },
      };
    }

    // 2. Query ke PostgreSQL
    let schedules = await prisma.schedule.findMany({
      where,
      include: {
        store: true,
        checklist_template: true,
        admin: true,
        schedule_staff: {
          include: { staff: true },
        },
      },
      orderBy: [
        { start_date: 'desc' },
        { start_time: 'asc' },
      ],
    });

    const formatted = schedules.map(formatSchedule);

    return res.status(200).json({
      status: 'success',
      total: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error('❌ Error in getAllSchedules:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil daftar jadwal audit dari database.',
      error: error.message,
    });
  }
};

/**
 * GET /api/schedules/:id
 * Mengambil detail jadwal audit berdasarkan ID
 */
exports.getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^sch-/, ''));

    const s = await prisma.schedule.findUnique({
      where: { schedule_id: cleanId },
      include: {
        store: true,
        checklist_template: true,
        admin: true,
        schedule_staff: {
          include: { staff: true },
        },
      },
    });

    if (!s) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan.',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: formatSchedule(s),
    });
  } catch (error) {
    console.error('❌ Error in getScheduleById:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal mengambil detail jadwal audit.',
      error: error.message,
    });
  }
};

/**
 * POST /api/schedules
 * Menambahkan satu atau beberapa jadwal audit baru
 */
exports.createSchedule = async (req, res) => {
  try {
    const user = await extractUser(req);
    const body = req.body;
    const rawWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    let targetWsId = null;
    if (rawWsId && rawWsId !== 'all') {
      try {
        targetWsId = BigInt(rawWsId.toString().replace(/^ws-/, ''));
      } catch (e) {}
    } else if (user && user.role === 'Admin' && user.workspaceId) {
      try {
        targetWsId = BigInt(user.workspaceId.toString().replace(/^ws-/, ''));
      } catch (e) {}
    }

    // Validasi Workspace: jika workspace dinonaktifkan, hentikan pembuatan jadwal
    if (targetWsId) {
      const ws = await prisma.workspace.findUnique({
        where: { workspace_id: targetWsId },
        select: { status: true },
      });
      if (ws && (ws.status === 'inactive' || ws.status === 'Nonaktif')) {
        return res.status(403).json({
          status: 'error',
          message: 'Workspace ini sedang dinonaktifkan. Seluruh sistem operasional dan pembuatan jadwal audit diberhentikan.',
        });
      }
    }

    // Menangani baik single payload maupun batch payload
    const rawItems = Array.isArray(body) ? body : (Array.isArray(body.items) ? body.items : [body]);

    if (rawItems.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Data jadwal audit tidak boleh kosong.',
      });
    }

    const createdResults = [];

    for (const item of rawItems) {
      // 1. Resolusi Toko: bisa via storeId atau storeName atau selectedStores
      let storeRecord = null;
      if (item.storeId) {
        try {
          storeRecord = await prisma.store.findUnique({
            where: { store_id: BigInt(item.storeId.toString().replace(/^str-/, '')) },
          });
        } catch (e) {}
      }

      if (!storeRecord && item.storeName) {
        if (targetWsId) {
          storeRecord = await prisma.store.findFirst({
            where: {
              store_name: item.storeName.trim(),
              workspace_id: targetWsId,
            },
          });
        }
        if (!storeRecord) {
          storeRecord = await prisma.store.findFirst({
            where: { store_name: item.storeName.trim() },
          });
        }
      }

      // Fallback ke toko dalam workspace jika belum ada
      if (!storeRecord && targetWsId) {
        storeRecord = await prisma.store.findFirst({
          where: { workspace_id: targetWsId },
        });
      }

      if (!storeRecord) {
        storeRecord = await prisma.store.findFirst();
      }

      if (!storeRecord) {
        return res.status(400).json({
          status: 'error',
          message: 'Toko belum tersedia di database. Harap buat toko terlebih dahulu.',
        });
      }

      // 2. Resolusi Template: bisa via templateId atau templateName
      let templateRecord = null;
      if (item.templateId) {
        try {
          templateRecord = await prisma.checklist_template.findUnique({
            where: { template_id: BigInt(item.templateId.toString().replace(/^tpl-/, '')) },
          });
        } catch (e) {}
      }

      if (!templateRecord && item.templateName) {
        templateRecord = await prisma.checklist_template.findFirst({
          where: { template_name: item.templateName.trim() },
        });
      }

      if (templateRecord && (templateRecord.status === 'inactive' || templateRecord.status === 'Nonaktif')) {
        return res.status(400).json({
          status: 'error',
          message: `Template checklist "${templateRecord.template_name}" sedang berstatus Nonaktif dan tidak dapat dipilih untuk jadwal audit baru.`,
        });
      }

      if (!templateRecord) {
        templateRecord = await prisma.checklist_template.findFirst({
          where: {
            OR: [{ status: 'active' }, { status: 'Aktif' }, { status: null }],
          },
        });
      }

      if (!templateRecord) {
        return res.status(400).json({
          status: 'error',
          message: 'Template checklist aktif belum tersedia. Harap buat atau aktifkan template checklist terlebih dahulu.',
        });
      }

      // 3. Resolusi Admin: gunakan admin pemilik toko atau admin saat ini
      let adminId = storeRecord.admin_id;
      if (!adminId) {
        const fallbackAdmin = await prisma.admin.findFirst();
        adminId = fallbackAdmin?.admin_id;
      }

      // 4. Resolusi Waktu & Tanggal
      const startTimeStr = item.startTime || '09:00';
      const endTimeStr = item.endTime || '12:00';
      const dateStr = item.date || new Date().toISOString().split('T')[0];

      const startDateTime = new Date(`1970-01-01T${startTimeStr.padStart(5, '0')}:00.000Z`);
      const endDateTime = new Date(`1970-01-01T${endTimeStr.padStart(5, '0')}:00.000Z`);
      const startDate = new Date(`${dateStr}T00:00:00.000Z`);

      // 5. Resolusi Recurrence & Selected Days
      const repeatTime = item.recurrence === 'Setiap Hari' ? 'daily' : 'custom';
      const selectedDaysStr = Array.isArray(item.selectedDays)
        ? item.selectedDays.join(',')
        : (item.selectedDays || '');

      // 6. Buat Jadwal di PostgreSQL
      const title = item.scheduleName || item.title || `Audit ${storeRecord.store_name}`;
      const scheduleCreated = await prisma.schedule.create({
        data: {
          admin_id: adminId,
          store_id: storeRecord.store_id,
          template_id: templateRecord.template_id,
          title,
          start_time: startDateTime,
          end_time: endDateTime,
          repeat_time: repeatTime,
          start_date: startDate,
          status: item.status === 'Dibatalkan' || item.status === 'inactive' ? 'inactive' : 'active',
          notes: item.notes || '',
          selected_days: selectedDaysStr,
        },
        include: {
          store: true,
          checklist_template: true,
          admin: true,
          schedule_staff: { include: { staff: true } },
        },
      });

      // 7. Jika ada auditorName, tautkan ke schedule_staff
      if (item.auditorName) {
        const staffMember = await prisma.staff.findFirst({
          where: { name: { contains: item.auditorName.trim(), mode: 'insensitive' } },
        });
        if (staffMember) {
          await prisma.schedule_staff.create({
            data: {
              schedule_id: scheduleCreated.schedule_id,
              staff_id: staffMember.staff_id,
              role_in_schedule: 'Auditor Lapangan',
            },
          });
        }
      }

      createdResults.push(formatSchedule(scheduleCreated));
    }

    return res.status(201).json({
      status: 'success',
      message: `${createdResults.length} jadwal audit berhasil dibuat dan disimpan ke database.`,
      data: createdResults.length === 1 ? createdResults[0] : createdResults,
    });
  } catch (error) {
    console.error('❌ Error in createSchedule:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membuat jadwal audit di database.',
      error: error.message,
    });
  }
};

/**
 * PUT /api/schedules/:id
 * Memperbarui data jadwal audit yang sudah ada
 */
exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^sch-/, ''));
    const body = req.body;

    const existing = await prisma.schedule.findUnique({
      where: { schedule_id: cleanId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan untuk diperbarui.',
      });
    }

    // Pengecekan jika jadwal sedang berlangsung saat ini (di jam dan hari pelaksanaan)
    // Jadwal yang sedang berjalan tidak dapat diedit atau dibatalkan/soft-delete
    if (isScheduleRunningNow(existing)) {
      const isDeactivating = body.status === 'inactive' || body.status === 'Dibatalkan' || body.deletedAt;
      if (isDeactivating) {
        return res.status(400).json({
          status: 'error',
          message: `Jadwal audit "${existing.title}" sedang berlangsung saat ini. Jadwal tidak dapat dibatalkan atau dinonaktifkan saat audit sedang berjalan.`,
        });
      } else {
        return res.status(400).json({
          status: 'error',
          message: `Jadwal audit "${existing.title}" sedang berlangsung saat ini. Jadwal tidak dapat diedit selama audit sedang berjalan.`,
        });
      }
    }

    const updateData = {};

    if (body.scheduleName || body.title) {
      updateData.title = (body.scheduleName || body.title).trim();
    }

    if (body.startTime) {
      updateData.start_time = new Date(`1970-01-01T${body.startTime.padStart(5, '0')}:00.000Z`);
    }

    if (body.endTime) {
      updateData.end_time = new Date(`1970-01-01T${body.endTime.padStart(5, '0')}:00.000Z`);
    }

    if (body.date) {
      updateData.start_date = new Date(`${body.date}T00:00:00.000Z`);
    }

    if (body.recurrence) {
      updateData.repeat_time = body.recurrence === 'Setiap Hari' ? 'daily' : 'custom';
    }

    if (body.selectedDays !== undefined) {
      updateData.selected_days = Array.isArray(body.selectedDays)
        ? body.selectedDays.join(',')
        : String(body.selectedDays || '');
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes;
    }

    if (body.status !== undefined) {
      updateData.status =
        body.status === 'Dibatalkan' || body.status === 'cancelled' || body.status === 'inactive' ? 'inactive' : 'active';
    }

    if (body.deletedAt !== undefined) {
      updateData.deleted_at = body.deletedAt ? new Date(body.deletedAt) : null;
    }

    // Resolusi & Update Template Checklist saat edit
    if (body.templateId || body.templateName || body.template) {
      let targetTemplate = null;
      if (body.templateId) {
        try {
          const cleanTplId = BigInt(body.templateId.toString().replace(/^tpl-/, ''));
          targetTemplate = await prisma.checklist_template.findUnique({
            where: { template_id: cleanTplId },
          });
        } catch (e) {}
      }

      if (!targetTemplate && (body.templateName || body.template)) {
        const tplName = (body.templateName || body.template).trim();
        targetTemplate = await prisma.checklist_template.findFirst({
          where: { template_name: tplName },
        });
      }

      if (targetTemplate) {
        if (targetTemplate.status === 'inactive' || targetTemplate.status === 'Nonaktif') {
          return res.status(400).json({
            status: 'error',
            message: `Template checklist "${targetTemplate.template_name}" sedang berstatus Nonaktif dan tidak dapat dipilih.`,
          });
        }
        updateData.template_id = targetTemplate.template_id;
      }
    }

    // Resolusi & Update Toko saat edit (jika diubah)
    if (body.storeId || body.storeName) {
      let storeRecord = null;
      if (body.storeId) {
        try {
          const cleanStoreId = BigInt(body.storeId.toString().replace(/^str-/, ''));
          storeRecord = await prisma.store.findUnique({
            where: { store_id: cleanStoreId },
          });
        } catch (e) {}
      }
      if (!storeRecord && body.storeName) {
        storeRecord = await prisma.store.findFirst({
          where: { store_name: body.storeName.trim() },
        });
      }
      if (storeRecord) {
        updateData.store_id = storeRecord.store_id;
      }
    }

    const updated = await prisma.schedule.update({
      where: { schedule_id: cleanId },
      data: updateData,
      include: {
        store: true,
        checklist_template: true,
        admin: true,
        schedule_staff: { include: { staff: true } },
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Jadwal audit berhasil diperbarui.',
      data: formatSchedule(updated),
    });
  } catch (error) {
    console.error('❌ Error in updateSchedule:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal memperbarui jadwal audit di database.',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/schedules/:id
 * Menghapus atau membatalkan (soft-delete) jadwal audit
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const cleanId = BigInt(id.toString().replace(/^sch-/, ''));
    const isPermanent = req.query.permanent === 'true';

    const existing = await prisma.schedule.findUnique({
      where: { schedule_id: cleanId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan untuk dihapus.',
      });
    }

    if (isPermanent) {
      await prisma.schedule.delete({
        where: { schedule_id: cleanId },
      });
      return res.status(200).json({
        status: 'success',
        message: 'Jadwal audit berhasil dihapus secara permanen.',
      });
    }

    // Soft delete / tandai Dibatalkan
    const updated = await prisma.schedule.update({
      where: { schedule_id: cleanId },
      data: {
        status: 'inactive',
        deleted_at: new Date(),
      },
      include: {
        store: true,
        checklist_template: true,
        admin: true,
        schedule_staff: { include: { staff: true } },
      },
    });

    return res.status(200).json({
      status: 'success',
      message: 'Jadwal audit berhasil dibatalkan.',
      data: formatSchedule(updated),
    });
  } catch (error) {
    console.error('❌ Error in deleteSchedule:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Gagal membatalkan jadwal audit.',
      error: error.message,
    });
  }
};

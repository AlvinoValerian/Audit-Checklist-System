const prisma = require('../config/prisma');
const { extractUser } = require('../middlewares/auth.middleware');
const { toBigIntSafe } = require('../utils/teknisScope');
const {
  sendSafeError,
  assertWorkspaceAccess,
  resolveScopedWorkspaceContext,
  assertStoreAccess,
} = require('../utils/tenantScope');
const { emitWorkspaceEvent } = require('../utils/realtimeEmitter');

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
 * Konversi string waktu format apapun (termasuk jika ada AM/PM) menjadi format 24 jam "HH:mm"
 */
const to24HourString = (str) => {
  if (!str) return '09:00';
  str = String(str).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return str.substring(0, 5);
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
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
  return '';
};

const getWibDateParts = (date = new Date()) => {
  const safeDate = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const wibDate = new Date(safeDate.getTime() + 7 * 60 * 60 * 1000);
  const y = wibDate.getUTCFullYear();
  const m = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wibDate.getUTCDate()).padStart(2, '0');
  const hours = wibDate.getUTCHours();
  const minutes = wibDate.getUTCMinutes();
  const dayOfWeekShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][wibDate.getUTCDay()];
  return {
    dateStr: `${y}-${m}-${d}`,
    dayOfWeekShort,
    currentMinutes: hours * 60 + minutes,
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
  if (Array.isArray(selectedDaysRaw)) {
    return selectedDaysRaw.map(normalizeDayToken).filter(Boolean);
  }
  if (typeof selectedDaysRaw === 'string') {
    try {
      const parsed = JSON.parse(selectedDaysRaw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeDayToken).filter(Boolean);
      }
    } catch {}
    return selectedDaysRaw.split(',').map(normalizeDayToken).filter(Boolean);
  }
  return [];
};

const normalizeRecurrenceLabel = (repeatTime) => {
  const val = (repeatTime || '').toString().trim().toLowerCase();
  if (val === 'daily' || val === 'setiap hari' || val === 'harian') return 'Setiap Hari';
  if (val === 'custom' || val === 'weekly' || val === 'hari tertentu' || val === 'mingguan') return 'Hari Tertentu';
  return 'Sekali';
};

const getActiveHolidaysOnDate = async (targetDateStr, workspaceIds = null) => {
  try {
    if (Array.isArray(workspaceIds) && workspaceIds.length > 0) {
      return await prisma.$queryRawUnsafe(
        `
        SELECT * FROM store_holiday
        WHERE deleted_at IS NULL
          AND status != 'Dibatalkan'
          AND start_date <= $1::date
          AND end_date >= $1::date
          AND workspace_id = ANY($2::bigint[])
        `,
        targetDateStr,
        workspaceIds
      );
    }
    return await prisma.$queryRawUnsafe(
      `
      SELECT * FROM store_holiday
      WHERE deleted_at IS NULL
        AND status != 'Dibatalkan'
        AND start_date <= $1::date
        AND end_date >= $1::date
      `,
      targetDateStr
    );
  } catch (e) {
    return [];
  }
};

const evaluateHolidayForSchedule = (schedule, targetDateStr, storeHolidays = []) => {
  if (!schedule) return { isHoliday: false, reason: null };
  const sIdStr = schedule.schedule_id ? schedule.schedule_id.toString() : '';
  const sStoreId = schedule.store_id ? schedule.store_id.toString() : '';
  const sWorkspaceId = schedule.store?.workspace_id ? schedule.store.workspace_id.toString() : '';
  const sStoreName = (schedule.store?.store_name || '').trim().toLowerCase();

  const matchedException = (schedule.schedule_exception || []).find((e) => {
    if (e.is_skip === false) return false;
    const eStart = formatDateString(e.start_date);
    const eEnd = formatDateString(e.end_date || e.start_date);
    if (!eStart || !eEnd) return false;
    return targetDateStr >= eStart && targetDateStr <= eEnd;
  });

  const matchedStoreHoliday = (storeHolidays || []).find((h) => {
    const hStoreId = h.store_id ? h.store_id.toString() : '';
    const hWorkspaceId = h.workspace_id ? h.workspace_id.toString() : '';
    const hStoreName = (h.store_name || '').trim().toLowerCase();
    const sameWorkspace = Boolean(hWorkspaceId && sWorkspaceId && hWorkspaceId === sWorkspaceId);
    const storeMatches =
      (hStoreId && hStoreId === sStoreId) ||
      (sameWorkspace && !hStoreId && hStoreName && hStoreName === sStoreName);
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
  });

  const isStatusHoliday = schedule.status === 'Libur' || Boolean(schedule.notes?.toLowerCase().includes('libur'));
  const isHoliday = Boolean(matchedException) || Boolean(matchedStoreHoliday) || isStatusHoliday;
  const reason = matchedStoreHoliday?.reason || matchedException?.note || (isStatusHoliday ? schedule.notes : null) || 'Toko Sedang Libur';

  return { isHoliday, reason: isHoliday ? reason : null };
};

/**
 * Resolusi realtime status jadwal
 */
/**
 * Helper: Cek apakah jadwal sedang berlangsung saat ini
 * (berlaku pada hari ini dan sedang berada di dalam rentang waktu start_time s/d end_time)
 */
const isScheduleRunningNow = (scheduleRecord, todayStoreHolidays = []) => {
  if (!scheduleRecord) return false;
  if (
    scheduleRecord.deleted_at ||
    ['inactive', 'cancelled', 'Dibatalkan', 'Nonaktif'].includes(scheduleRecord.status)
  ) {
    return false;
  }

  const { dateStr: todayStr, dayOfWeekShort, currentMinutes } = getWibDateParts(new Date());
  if (evaluateHolidayForSchedule(scheduleRecord, todayStr, todayStoreHolidays).isHoliday) {
    return false;
  }

  const scheduleDateStr = formatDateString(scheduleRecord.start_date);
  if (scheduleDateStr && scheduleDateStr > todayStr) return false;

  const recurrence = normalizeRecurrenceLabel(scheduleRecord.repeat_time);
  const isRecurring = recurrence === 'Setiap Hari' || recurrence === 'Hari Tertentu';

  if (scheduleRecord.end_date) {
    const endDateStr = formatDateString(scheduleRecord.end_date);
    if (endDateStr && (!isRecurring || endDateStr > scheduleDateStr) && endDateStr < todayStr) {
      return false;
    }
  }

  const selectedDays = parseSelectedDays(scheduleRecord.selected_days);
  const runsToday =
    recurrence === 'Setiap Hari'
      ? !scheduleDateStr || scheduleDateStr <= todayStr
      : recurrence === 'Hari Tertentu'
        ? (!scheduleDateStr || scheduleDateStr <= todayStr) &&
          (selectedDays.length === 0 || selectedDays.includes(dayOfWeekShort))
        : scheduleDateStr === todayStr;

  if (!runsToday) return false;

  const startTimeStr = formatTimeString(scheduleRecord.start_time);
  const endTimeStr = formatTimeString(scheduleRecord.end_time);

  const [sH, sM] = startTimeStr.split(':').map((v) => parseInt(v, 10));
  const [eH, eM] = endTimeStr.split(':').map((v) => parseInt(v, 10));

  if (isNaN(sH) || isNaN(eH)) return false;

  const startMinutes = sH * 60 + (isNaN(sM) ? 0 : sM);
  const endMinutes = eH * 60 + (isNaN(eM) ? 0 : eM);

  if (endMinutes >= startMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
};

const calculateDuration = (startTimeStr, endTimeStr) => {
  if (!startTimeStr || !endTimeStr) return '0 Jam';
  const [sH, sM] = startTimeStr.split(':').map((v) => parseInt(v, 10));
  const [eH, eM] = endTimeStr.split(':').map((v) => parseInt(v, 10));
  if (isNaN(sH) || isNaN(eH)) return '0 Jam';

  let startMin = sH * 60 + (isNaN(sM) ? 0 : sM);
  let endMin = eH * 60 + (isNaN(eM) ? 0 : eM);
  if (endMin < startMin) endMin += 24 * 60;
  const diff = endMin - startMin;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;

  if (minutes === 0) return `${hours} Jam`;
  if (hours === 0) return `${minutes} Menit`;
  return `${hours} Jam ${minutes} Menit`;
};

const computeRealtimeStatus = (
  rawStatus,
  scheduleDateStr,
  endDateStr,
  startTimeStr,
  endTimeStr,
  recurrence,
  selectedDays,
  hasCompletedReport = false,
  deletedAt = null,
  isHolidayToday = false
) => {
  if (
    deletedAt ||
    rawStatus === 'cancelled' ||
    rawStatus === 'Dibatalkan' ||
    rawStatus === 'inactive' ||
    rawStatus === 'Nonaktif'
  ) {
    return 'Dibatalkan';
  }

  // Jika sudah dikerjakan oleh staff:
  if (hasCompletedReport) {
    return 'Selesai';
  }

  const { dateStr: todayStr, dayOfWeekShort, currentMinutes } = getWibDateParts(new Date());
  const isRecurring = recurrence === 'Setiap Hari' || recurrence === 'Hari Tertentu';

  // Jika start_date di masa depan, jadwal belum dimulai
  if (scheduleDateStr && scheduleDateStr > todayStr) {
    return 'Terjadwal';
  }

  // Jika end_date sudah berlalu (dan bukan penanda single-day end_date === start_date pada jadwal berulang)
  if (endDateStr && (!isRecurring || endDateStr > scheduleDateStr) && endDateStr < todayStr) {
    return 'Selesai';
  }

  // Jika tanggal jadwal masa lalu (< today) dan bukan pengulangan berulang, maka sudah selesai:
  if (scheduleDateStr && scheduleDateStr < todayStr && !isRecurring) {
    return 'Selesai';
  }

  // Jika toko atau jadwal sedang libur hari ini, tidak berstatus Sedang Berjalan
  if (isHolidayToday) {
    return 'Terjadwal';
  }

  const normalizedDays = Array.isArray(selectedDays) ? selectedDays.map(normalizeDayToken) : [];

  // Cek apakah jadwal ini aktif/berlaku pada hari ini (today):
  const runsToday =
    recurrence === 'Setiap Hari'
      ? !scheduleDateStr || scheduleDateStr <= todayStr
      : recurrence === 'Hari Tertentu'
        ? (!scheduleDateStr || scheduleDateStr <= todayStr) &&
          (normalizedDays.length === 0 || normalizedDays.includes(dayOfWeekShort))
        : scheduleDateStr === todayStr;

  if (runsToday) {
    if (startTimeStr && endTimeStr) {
      const [sH, sM] = startTimeStr.split(':').map((v) => parseInt(v, 10));
      const [eH, eM] = endTimeStr.split(':').map((v) => parseInt(v, 10));
      if (!isNaN(sH) && !isNaN(eH)) {
        const startMinutes = sH * 60 + (isNaN(sM) ? 0 : sM);
        const endMinutes = eH * 60 + (isNaN(eM) ? 0 : eM);

        if (endMinutes >= startMinutes) {
          // Jadwal normal dalam satu hari (misal 09:00 - 12:00)
          if (currentMinutes < startMinutes) {
            return 'Terjadwal';
          } else if (currentMinutes <= endMinutes) {
            return 'Sedang Berjalan';
          } else {
            // Jam akhir sudah selesai / terlewati jam sekarang!
            return 'Selesai';
          }
        } else {
          // Jadwal shift malam lintas hari (misal 22:00 - 02:00)
          if (currentMinutes >= startMinutes || currentMinutes <= endMinutes) {
            return 'Sedang Berjalan';
          } else {
            return 'Terjadwal';
          }
        }
      }
    } else if (startTimeStr) {
      const [sH, sM] = startTimeStr.split(':').map((v) => parseInt(v, 10));
      if (!isNaN(sH)) {
        const startMinutes = sH * 60 + (isNaN(sM) ? 0 : sM);
        if (currentMinutes < startMinutes) {
          return 'Terjadwal';
        } else {
          return 'Sedang Berjalan';
        }
      }
    }
    return 'Terjadwal';
  }

  // Jadwal berulang yang masih aktif namun tidak jatuh pada hari ini tetap berstatus Terjadwal
  return 'Terjadwal';
};

/**
 * Format entitas Schedule dari DB PostgreSQL ke antarmuka Frontend
 */
const formatSchedule = (s, todayStoreHolidays = []) => {
  const startTime = formatTimeString(s.start_time);
  const endTime = formatTimeString(s.end_time);
  const date = formatDateString(s.start_date);
  const endDate = s.end_date ? formatDateString(s.end_date) : undefined;
  const createdAt = formatDateString(s.created_at);
  const deletedAt = s.deleted_at ? formatDateString(s.deleted_at) : undefined;

  const recurrence = normalizeRecurrenceLabel(s.repeat_time) === 'Setiap Hari' ? 'Setiap Hari' : 'Hari Tertentu';

  const selectedDays = parseSelectedDays(s.selected_days);

  // Auditor name: ambil dari schedule_staff pertama atau nama admin
  let auditorName = 'Hendra Wijaya';
  if (Array.isArray(s.schedule_staff) && s.schedule_staff.length > 0 && s.schedule_staff[0].staff) {
    auditorName = s.schedule_staff[0].staff.name;
  } else if (s.admin && s.admin.name) {
    auditorName = s.admin.name;
  }

  const finishedStatuses = ['completed', 'submitted', 'terlambat', 'late', 'submitted_late'];
  const hasCompletedReport = Array.isArray(s.checklist_report) && s.checklist_report.some((r) => finishedStatuses.includes(r.status));
  const { dateStr: todayDateStr } = getWibDateParts(new Date());

  const isCompletedToday = Array.isArray(s.checklist_report) && s.checklist_report.some((r) => {
    if (!finishedStatuses.includes(r.status)) return false;
    const rDateStr = r.completed_at ? formatDateString(r.completed_at) : (r.created_at ? formatDateString(r.created_at) : null);
    return rDateStr === todayDateStr;
  });

  const holidayEval = evaluateHolidayForSchedule(s, todayDateStr, todayStoreHolidays);
  const isRecurring = recurrence === 'Setiap Hari' || recurrence === 'Hari Tertentu';
  const reportDoneForSchedule = isRecurring ? isCompletedToday : hasCompletedReport;
  const status = computeRealtimeStatus(
    s.status,
    date,
    endDate,
    startTime,
    endTime,
    recurrence,
    selectedDays,
    reportDoneForSchedule,
    s.deleted_at,
    holidayEval.isHoliday
  );
  const duration = calculateDuration(startTime, endTime);

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
    duration,
    date,
    endDate,
    recurrence,
    selectedDays,
    status,
    isHolidayToday: holidayEval.isHoliday,
    holidayReason: holidayEval.reason || undefined,
    isCompletedToday,
    isCompletedByStaff: hasCompletedReport,
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
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
    }

    const requestedWsId = req.query.workspaceId || req.headers['x-workspace-id'];
    const scope = await resolveScopedWorkspaceContext(user, requestedWsId, {
      teknisUseSingleDefaultOnAll: true,
    });

    if (!scope.ok) {
      return res.status(scope.status).json({ status: 'error', message: scope.message });
    }
    if (scope.workspaceIds.length === 0) {
      return res.status(200).json({ status: 'success', total: 0, data: [] });
    }

    const storeScopeFilter = scope.prismaWorkspaceWhere.workspace_id
      ? { workspace_id: scope.prismaWorkspaceWhere.workspace_id }
      : { workspace: scope.prismaWorkspaceWhere };

    const where = {
      store: storeScopeFilter,
    };

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
        schedule_exception: true,
        checklist_report: {
          select: {
            report_id: true,
            status: true,
            completed_at: true,
            created_at: true,
          },
        },
      },
      orderBy: [
        { start_date: 'desc' },
        { start_time: 'asc' },
      ],
    });

    const { dateStr: todayWibStr } = getWibDateParts(new Date());
    const todayStoreHolidays = await getActiveHolidaysOnDate(todayWibStr, scope.workspaceIds);
    const formatted = schedules.map((s) => formatSchedule(s, todayStoreHolidays));

    return res.status(200).json({
      status: 'success',
      total: formatted.length,
      data: formatted,
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil daftar jadwal audit dari database.');
  }
};

/**
 * GET /api/schedules/:id
 * Mengambil detail jadwal audit berdasarkan ID
 */
exports.getScheduleById = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
    }
    const { id } = req.params;
    const cleanId = toBigIntSafe(id, ['sch-']);
    if (!cleanId) {
      return res.status(400).json({
        status: 'error',
        message: 'Format ID jadwal audit tidak valid.',
      });
    }

    const s = await prisma.schedule.findUnique({
      where: { schedule_id: cleanId },
      include: {
        store: true,
        checklist_template: true,
        admin: true,
        schedule_staff: {
          include: { staff: true },
        },
        schedule_exception: true,
        checklist_report: {
          select: {
            report_id: true,
            status: true,
            completed_at: true,
            created_at: true,
          },
        },
      },
    });

    if (!s) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan.',
      });
    }

    const access = await assertWorkspaceAccess(user, s.store?.workspace_id);
    if (!access.ok) {
      return res.status(access.status === 400 ? 403 : access.status).json({
        status: 'error',
        message: access.message || 'Anda tidak memiliki akses ke jadwal milik tenant lain.',
      });
    }

    const { dateStr: todayWibStr } = getWibDateParts(new Date());
    const todayStoreHolidays = await getActiveHolidaysOnDate(
      todayWibStr,
      s.store?.workspace_id ? [s.store.workspace_id] : null
    );

    return res.status(200).json({
      status: 'success',
      data: formatSchedule(s, todayStoreHolidays),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal mengambil detail jadwal audit.');
  }
};

/**
 * POST /api/schedules
 * Menambahkan satu atau beberapa jadwal audit baru
 */
exports.createSchedule = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
    }
    const body = req.body;
    const rawWsId = (!Array.isArray(body) ? body?.workspaceId : null) || req.query.workspaceId || req.headers['x-workspace-id'];

    const scope = await resolveScopedWorkspaceContext(user, rawWsId, {
      teknisUseSingleDefaultOnAll: true,
    });
    if (!scope.ok) {
      return res.status(scope.status).json({ status: 'error', message: scope.message });
    }

    const targetWsId = scope.targetWorkspaceId;
    const storeScopeFilter = scope.prismaWorkspaceWhere.workspace_id
      ? { workspace_id: scope.prismaWorkspaceWhere.workspace_id }
      : { workspace: scope.prismaWorkspaceWhere };

    // Validasi Workspace target jika sudah spesifik
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
    const { dateStr: wibTodayStr } = getWibDateParts(new Date());
    const todayStoreHolidays = await getActiveHolidaysOnDate(wibTodayStr, scope.workspaceIds);

    for (const item of rawItems) {
      // 1. Resolusi Toko strictly inside user's workspace scope
      let storeRecord = null;
      if (item.storeId) {
        const stCheck = await assertStoreAccess(user, item.storeId);
        if (!stCheck.ok) {
          return res.status(stCheck.status).json({
            status: 'error',
            message: stCheck.message,
          });
        }
        storeRecord = stCheck.store;
      }

      if (!storeRecord && item.storeName) {
        storeRecord = await prisma.store.findFirst({
          where: {
            store_name: item.storeName.trim(),
            ...(targetWsId ? { workspace_id: targetWsId } : storeScopeFilter),
          },
          include: { workspace: { select: { workspace_id: true, status: true } } },
        });
      }

      // Fallback ke toko di workspace tervalidasi (TIDAK PERNAH fallback global lintas tenant)
      if (!storeRecord && scope.workspaceIds.length > 0) {
        storeRecord = await prisma.store.findFirst({
          where: targetWsId ? { workspace_id: targetWsId } : storeScopeFilter,
          include: { workspace: { select: { workspace_id: true, status: true } } },
          orderBy: { store_id: 'asc' },
        });
      }

      if (!storeRecord) {
        return res.status(400).json({
          status: 'error',
          message: 'Toko belum tersedia di workspace ini. Harap buat toko terlebih dahulu.',
        });
      }

      if (
        storeRecord.workspace &&
        (storeRecord.workspace.status === 'inactive' || storeRecord.workspace.status === 'Nonaktif')
      ) {
        return res.status(403).json({
          status: 'error',
          message: 'Workspace toko ini sedang dinonaktifkan. Pembuatan jadwal audit diberhentikan.',
        });
      }

      const itemWsId = storeRecord.workspace_id;

      // 2. Resolusi Template secara ketat dalam cakupan workspace yang sah
      let templateRecord = null;
      if (item.templateId) {
        const cleanTplId = toBigIntSafe(item.templateId, ['tpl-']);
        if (cleanTplId) {
          templateRecord = await prisma.checklist_template.findUnique({
            where: { template_id: cleanTplId },
            include: { store: { select: { workspace_id: true } } },
          });
          if (templateRecord) {
            const tplAccess = await assertWorkspaceAccess(user, templateRecord.store?.workspace_id);
            if (!tplAccess.ok) {
              return res.status(tplAccess.status === 400 ? 403 : tplAccess.status).json({
                status: 'error',
                message: 'Template checklist yang dipilih berada di luar cakupan workspace Anda.',
              });
            }
          }
        }
      }

      if (!templateRecord && item.templateName) {
        templateRecord = await prisma.checklist_template.findFirst({
          where: {
            template_name: item.templateName.trim(),
            store: { workspace_id: itemWsId },
          },
          include: { store: { select: { workspace_id: true } } },
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
            store: { workspace_id: itemWsId },
            OR: [{ status: 'active' }, { status: 'Aktif' }, { status: null }],
          },
          orderBy: { template_id: 'asc' },
        });
      }

      if (!templateRecord) {
        return res.status(400).json({
          status: 'error',
          message: 'Template checklist aktif belum tersedia pada workspace ini. Harap buat atau aktifkan template checklist terlebih dahulu.',
        });
      }

      // 3. Resolusi Admin strictly dalam workspace toko target
      let adminId = storeRecord.admin_id;
      if (!adminId) {
        const fallbackAdmin = await prisma.admin.findFirst({
          where: { workspace_id: itemWsId },
          select: { admin_id: true },
        });
        adminId = fallbackAdmin?.admin_id;
      }

      if (!adminId) {
        return res.status(400).json({
          status: 'error',
          message: 'Admin penanggung jawab workspace belum tersedia.',
        });
      }

      // 4. Resolusi Waktu & Tanggal (Pastikan Format 24 Jam)
      let startTimeStr = item.startTime || '09:00';
      let endTimeStr = item.endTime || '12:00';
      if ((!item.startTime || !item.endTime) && item.timeRange) {
        const parts = item.timeRange.replace(/WIB/gi, '').split('-');
        if (parts.length >= 2) {
          if (!item.startTime) startTimeStr = parts[0].trim();
          if (!item.endTime) endTimeStr = parts[1].trim();
        }
      }
      startTimeStr = to24HourString(startTimeStr);
      endTimeStr = to24HourString(endTimeStr);
      const dateStr = item.date || wibTodayStr;

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
          schedule_exception: true,
        },
      });

      // 7. Jika ada auditorName, tautkan ke schedule_staff hanya dalam workspace toko target
      if (item.auditorName) {
        const staffMember = await prisma.staff.findFirst({
          where: {
            name: { contains: item.auditorName.trim(), mode: 'insensitive' },
            store: { workspace_id: itemWsId },
          },
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

      createdResults.push(formatSchedule(scheduleCreated, todayStoreHolidays));
    }

    if (store?.workspace_id) {
      try {
        emitWorkspaceEvent(store.workspace_id, 'schedule:updated', { action: 'create' });
      } catch (e) {}
    }

    return res.status(201).json({
      status: 'success',
      message: `${createdResults.length} jadwal audit berhasil dibuat dan disimpan ke database.`,
      data: createdResults.length === 1 ? createdResults[0] : createdResults,
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal membuat jadwal audit di database.');
  }
};

/**
 * PUT /api/schedules/:id
 * Memperbarui data jadwal audit yang sudah ada
 */
exports.updateSchedule = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
    }
    const { id } = req.params;
    const cleanId = toBigIntSafe(id, ['sch-']);
    if (!cleanId) {
      return res.status(400).json({
        status: 'error',
        message: 'Format ID jadwal audit tidak valid.',
      });
    }
    const body = req.body;

    const existing = await prisma.schedule.findUnique({
      where: { schedule_id: cleanId },
      include: {
        store: true,
        schedule_exception: true,
      },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan untuk diperbarui.',
      });
    }

    const access = await assertWorkspaceAccess(user, existing.store?.workspace_id);
    if (!access.ok) {
      return res.status(access.status === 400 ? 403 : access.status).json({
        status: 'error',
        message: access.message || 'Anda tidak memiliki akses untuk mengubah jadwal audit milik tenant lain.',
      });
    }

    const { dateStr: todayWibStr } = getWibDateParts(new Date());
    const todayStoreHolidays = await getActiveHolidaysOnDate(
      todayWibStr,
      existing.store?.workspace_id ? [existing.store.workspace_id] : null
    );

    // Pengecekan jika jadwal sedang berlangsung saat ini (di jam dan hari pelaksanaan)
    // Jadwal yang sedang berjalan tidak dapat diedit atau dibatalkan/soft-delete
    if (isScheduleRunningNow(existing, todayStoreHolidays)) {
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
      const cleanStart = to24HourString(body.startTime);
      updateData.start_time = new Date(`1970-01-01T${cleanStart.padStart(5, '0')}:00.000Z`);
    }

    if (body.endTime) {
      const cleanEnd = to24HourString(body.endTime);
      updateData.end_time = new Date(`1970-01-01T${cleanEnd.padStart(5, '0')}:00.000Z`);
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
    } else if (updateData.status === 'active' && existing.deleted_at) {
      updateData.deleted_at = null;
    }

    // Resolusi & Update Toko saat edit (jika diubah) - diselesaikan secara ketat dalam cakupan workspace
    let resolvedStoreWsId = existing.store?.workspace_id || null;
    if (body.storeId || body.storeName) {
      let storeRecord = null;
      if (body.storeId) {
        const stCheck = await assertStoreAccess(user, body.storeId);
        if (!stCheck.ok) {
          return res.status(stCheck.status).json({
            status: 'error',
            message: stCheck.message,
          });
        }
        storeRecord = stCheck.store;
      } else if (body.storeName && existing.store?.workspace_id) {
        storeRecord = await prisma.store.findFirst({
          where: {
            store_name: body.storeName.trim(),
            workspace_id: existing.store.workspace_id,
          },
        });
      }
      if (storeRecord) {
        updateData.store_id = storeRecord.store_id;
        resolvedStoreWsId = storeRecord.workspace_id;
      }
    }

    // Resolusi & Update Template Checklist saat edit (strictly within user's permitted workspace)
    if (body.templateId || body.templateName || body.template) {
      let targetTemplate = null;
      if (body.templateId) {
        const cleanTplId = toBigIntSafe(body.templateId, ['tpl-']);
        if (cleanTplId) {
          targetTemplate = await prisma.checklist_template.findUnique({
            where: { template_id: cleanTplId },
            include: { store: { select: { workspace_id: true } } },
          });
        }
      }

      if (!targetTemplate && (body.templateName || body.template) && resolvedStoreWsId) {
        const tplName = (body.templateName || body.template).trim();
        targetTemplate = await prisma.checklist_template.findFirst({
          where: {
            template_name: tplName,
            store: { workspace_id: resolvedStoreWsId },
          },
          include: { store: { select: { workspace_id: true } } },
        });
      }

      if (targetTemplate) {
        const tplAccess = await assertWorkspaceAccess(user, targetTemplate.store?.workspace_id);
        if (!tplAccess.ok) {
          return res.status(tplAccess.status === 400 ? 403 : tplAccess.status).json({
            status: 'error',
            message: 'Template checklist tujuan berada di luar lingkup workspace Anda.',
          });
        }
        if (targetTemplate.status === 'inactive' || targetTemplate.status === 'Nonaktif') {
          return res.status(400).json({
            status: 'error',
            message: `Template checklist "${targetTemplate.template_name}" sedang berstatus Nonaktif dan tidak dapat dipilih.`,
          });
        }
        updateData.template_id = targetTemplate.template_id;
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
        schedule_exception: true,
        checklist_report: {
          select: {
            report_id: true,
            status: true,
            completed_at: true,
            created_at: true,
          },
        },
      },
    });

    if (existing.store?.workspace_id) {
      try {
        emitWorkspaceEvent(existing.store.workspace_id, 'schedule:updated', {
          action: 'update',
          scheduleId: cleanId.toString(),
        });
      } catch (e) {}
    }

    return res.status(200).json({
      status: 'success',
      message: 'Jadwal audit berhasil diperbarui.',
      data: formatSchedule(updated, todayStoreHolidays),
    });
  } catch (error) {
    return sendSafeError(res, error, 'Gagal memperbarui jadwal audit di database.');
  }
};

/**
 * DELETE /api/schedules/:id
 * Menghapus atau membatalkan (soft-delete) jadwal audit
 */
exports.deleteSchedule = async (req, res) => {
  try {
    const user = await extractUser(req);
    if (!user) {
      return res.status(401).json({ status: 'error', message: 'Autentikasi diperlukan.' });
    }
    const { id } = req.params;
    const cleanId = toBigIntSafe(id, ['sch-']);
    if (!cleanId) {
      return res.status(400).json({
        status: 'error',
        message: 'Format ID jadwal audit tidak valid.',
      });
    }
    const isPermanent = req.query.permanent === 'true';

    const existing = await prisma.schedule.findUnique({
      where: { schedule_id: cleanId },
      include: {
        store: { select: { workspace_id: true } },
      },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Jadwal audit tidak ditemukan untuk dihapus.',
      });
    }

    const access = await assertWorkspaceAccess(user, existing.store?.workspace_id);
    if (!access.ok) {
      return res.status(access.status === 400 ? 403 : access.status).json({
        status: 'error',
        message: access.message || 'Anda tidak memiliki akses untuk menghapus jadwal audit milik tenant lain.',
      });
    }

    if (existing.store?.workspace_id) {
      try {
        emitWorkspaceEvent(existing.store.workspace_id, 'schedule:updated', {
          action: isPermanent ? 'permanent_delete' : 'soft_delete',
          scheduleId: cleanId.toString(),
        });
      } catch (e) {}
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
    return sendSafeError(res, error, 'Gagal membatalkan jadwal audit.');
  }
};

const prisma = require('../config/prisma');

/**
 * Self-healing: Pastikan check constraint pada status di tabel checklist_report
 * mendukung 'tidak_mengerjakan' dan 'tidak_patuh'
 */
const ensureReportStatusConstraint = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE checklist_report DROP CONSTRAINT IF EXISTS checklist_report_status_check;
      ALTER TABLE checklist_report ADD CONSTRAINT checklist_report_status_check 
      CHECK (status IN ('completed', 'submitted', 'in_progress', 'terlambat', 'late', 'tidak_mengerjakan', 'tidak_patuh'));
    `);
  } catch (err) {
    // Abaikan jika sudah sesuai atau permission terbatas
  }
};
ensureReportStatusConstraint();

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

const lastSyncCache = new Map();
const inFlightSyncs = new Map();

/**
 * Auto-submit jadwal yang melewati batas toleransi keterlambatan (1 jam setelah end_time)
 * secara otomatis ke tabel `checklist_report` di PostgreSQL dengan status 'tidak_mengerjakan'.
 * Memeriksa hingga 7 hari ke belakang agar seluruh toko dalam workspace memiliki laporan kepatuhan yang akurat.
 * Memiliki idempotent guard sehingga tidak akan pernah membuat duplikat untuk jadwal dan tanggal yang sama.
 * Dilengkapi caching throttle 60 detik & in-flight deduplication agar request dashboard/laporan sangat cepat dan ringan.
 *
 * @param {Object} options
 * @param {string|number|BigInt} [options.storeId] - Filter gerai tertentu
 * @param {string|number|BigInt} [options.workspaceId] - Filter workspace tertentu
 * @param {string|number|BigInt} [options.staffId] - ID staff penanggung jawab opsional
 * @param {boolean} [options.force] - Paksa sync tanpa throttle
 * @returns {Promise<number>} Jumlah jadwal yang baru saja di-auto-submit
 */
const syncExpiredSchedulesToDb = async ({ storeId, workspaceId, staffId, force = false } = {}) => {
  const cacheKey = `${storeId || 'all'}_${workspaceId || 'all'}_${staffId || 'all'}`;
  const nowTimestamp = Date.now();
  if (!force && lastSyncCache.has(cacheKey) && nowTimestamp - lastSyncCache.get(cacheKey) < 60000) {
    // Throttle: baru saja di-sync dalam 60 detik terakhir, lewati untuk menghemat resource
    return 0;
  }

  // In-flight deduplication: jika sudah ada request sync yang sedang berjalan untuk target yang sama, reuse promise
  if (inFlightSyncs.has(cacheKey)) {
    return inFlightSyncs.get(cacheKey);
  }

  const syncPromise = (async () => {
    try {
      lastSyncCache.set(cacheKey, Date.now());

      const scheduleWhere = {
        deleted_at: null,
        status: { notIn: ['cancelled', 'inactive', 'Dibatalkan', 'Nonaktif'] },
      };

      if (storeId) {
        scheduleWhere.store_id = BigInt(storeId.toString().replace(/^str-/, '').replace(/^st-/, ''));
      } else if (workspaceId) {
        const cleanWs = BigInt(workspaceId.toString().replace(/^ws-/, ''));
        scheduleWhere.store = { workspace_id: cleanWs };
      }

      const schedules = await prisma.schedule.findMany({
        where: scheduleWhere,
        include: {
          store: {
            select: {
              store_id: true,
              store_name: true,
              workspace_id: true,
            },
          },
          checklist_template: {
            include: {
              template_category: {
                include: {
                  template_task: {
                    select: { task_id: true },
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
            select: {
              report_id: true,
              schedule_id: true,
              completed_at: true,
              created_at: true,
              started_at: true,
              status: true,
            },
          },
        },
      });

    if (!schedules || schedules.length === 0) return 0;

    // Hitung waktu sekarang dalam WIB (UTC+7)
    const now = new Date();
    const wibTimestamp = now.getTime() + 7 * 60 * 60 * 1000;
    const wibDate = new Date(wibTimestamp);
    const y = wibDate.getUTCFullYear();
    const m = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
    const d = String(wibDate.getUTCDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    const curWibMinutes = ((now.getUTCHours() + 7) % 24) * 60 + now.getUTCMinutes();

    let createdCount = 0;

    // Ambil seluruh data libur toko (store_holiday) aktif untuk verifikasi pengecualian libur
    let storeHolidays = [];
    try {
      storeHolidays = await prisma.$queryRawUnsafe(`
        SELECT * FROM store_holiday 
        WHERE deleted_at IS NULL 
          AND status != 'Dibatalkan'
      `);
    } catch (e) {
      storeHolidays = [];
    }

    for (const s of schedules) {
      // 1. Cek apakah libur / pengecualian umum tingkat jadwal
      const exceptions = s.schedule_exception || [];
      const isScheduleAlwaysLibur = s.status === 'Libur' || s.notes?.toLowerCase().includes('libur');
      if (isScheduleAlwaysLibur) continue;

      const scheduleStartDateStr = formatDateString(s.start_date);
      const scheduleEndDateStr = s.end_date ? formatDateString(s.end_date) : null;
      const rtLower = (s.repeat_time || '').toLowerCase();
      const recurrence = rtLower === 'daily' || rtLower === 'setiap hari'
        ? 'Setiap Hari'
        : (rtLower === 'custom' || rtLower === 'weekly' || rtLower === 'hari tertentu' ? 'Hari Tertentu' : s.repeat_time);

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

      let selectedDays = [];
      if (s.selected_days) {
        if (typeof s.selected_days === 'string') {
          try {
            const parsed = JSON.parse(s.selected_days);
            selectedDays = Array.isArray(parsed)
              ? parsed.map(normalizeDayToken).filter(Boolean)
              : [];
          } catch {
            selectedDays = s.selected_days.split(',').map(normalizeDayToken).filter(Boolean);
          }
        } else if (Array.isArray(s.selected_days)) {
          selectedDays = s.selected_days.map(normalizeDayToken).filter(Boolean);
        }
      }

      const isRecurring = recurrence === 'Setiap Hari' || recurrence === 'daily' || recurrence === 'Hari Tertentu' || recurrence === 'weekly' || recurrence === 'custom';

      // Hitung toleransi waktu jadwal
      const endTimeStr = formatTimeString(s.end_time);
      const [eH, eM] = endTimeStr.split(':').map(Number);
      const endMinutes = (isNaN(eH) ? 23 : eH) * 60 + (isNaN(eM) ? 59 : eM);
      const toleranceMinutes = endMinutes + 60; // 1 jam setelah end_time

      // Tentukan rentang tanggal penugasan yang harus diperiksa (hingga 7 hari ke belakang sampai hari ini)
      const datesToCheck = [];
      if (isRecurring) {
        for (let offset = 7; offset >= 0; offset--) {
          const tDate = new Date(wibTimestamp - offset * 24 * 60 * 60 * 1000);
          const tDateStr = `${tDate.getUTCFullYear()}-${String(tDate.getUTCMonth() + 1).padStart(2, '0')}-${String(tDate.getUTCDate()).padStart(2, '0')}`;

          // Jadwal tidak boleh sebelum tanggal mulai aktif jadwal (start_date) atau setelah end_date (jika > start_date)
          if (scheduleStartDateStr && tDateStr < scheduleStartDateStr) continue;
          if (scheduleEndDateStr && scheduleEndDateStr > scheduleStartDateStr && tDateStr > scheduleEndDateStr) continue;

          // Periksa apakah hari ini dijadwalkan
          const tDayShort = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][tDate.getUTCDay()];
          let appliesOnDate = false;
          if (recurrence === 'Setiap Hari' || recurrence === 'daily') {
            appliesOnDate = true;
          } else {
            appliesOnDate = !selectedDays || selectedDays.length === 0 || selectedDays.includes(tDayShort);
          }

          if (appliesOnDate) {
            datesToCheck.push({ dateStr: tDateStr, isToday: offset === 0, dateObj: tDate });
          }
        }
      } else {
        // Jadwal satu kali
        datesToCheck.push({
          dateStr: scheduleStartDateStr,
          isToday: scheduleStartDateStr === todayStr,
          dateObj: new Date(scheduleStartDateStr + 'T00:00:00Z'),
        });
      }

      for (const occ of datesToCheck) {
        // Cek toleransi
        if (occ.isToday) {
          if (curWibMinutes <= toleranceMinutes) {
            // Masih dalam jendela pengerjaan hari ini, jangan auto-submit
            continue;
          }
        } else if (occ.dateStr > todayStr) {
          // Tanggal di masa depan, jangan diproses
          continue;
        }

        // 2a. Cek schedule_exception spesifik untuk tanggal occ.dateStr
        const hasExceptionOnDate = exceptions.some((e) => {
          if (e.is_skip === false) return false;
          const eStart = formatDateString(e.start_date);
          const eEnd = formatDateString(e.end_date || e.start_date);
          return Boolean(eStart) && occ.dateStr >= eStart && occ.dateStr <= (eEnd || eStart);
        });

        // 2b. Cek apakah toko / jadwal sedang berstatus LIBUR pada tanggal ini (store_holiday)
        const sIdStr = s.schedule_id.toString();
        const sStoreName = (s.store?.store_name || '').trim().toLowerCase();
        const sStoreId = s.store_id.toString();
        const sWorkspaceId = s.store?.workspace_id ? s.store.workspace_id.toString() : '';

        const matchingHoliday = storeHolidays.find((h) => {
          const hStoreId = h.store_id ? h.store_id.toString() : '';
          const hWorkspaceId = h.workspace_id ? h.workspace_id.toString() : '';
          const hStoreName = (h.store_name || '').trim().toLowerCase();
          const sameWorkspace = Boolean(hWorkspaceId && sWorkspaceId && hWorkspaceId === sWorkspaceId);
          const storeMatches =
            (hStoreId && hStoreId === sStoreId) ||
            (sameWorkspace && !hStoreId && hStoreName && hStoreName === sStoreName);
          if (!storeMatches) return false;

          const hStart = formatDateString(h.start_date);
          const hEnd = formatDateString(h.end_date || h.start_date);
          if (occ.dateStr < hStart || occ.dateStr > hEnd) return false;

          const lType = h.libur_type || 'full';
          if (lType === 'full') return true;

          let hSchedules = [];
          if (Array.isArray(h.schedules)) hSchedules = h.schedules.map((x) => String(x).replace(/^sch-/, ''));
          else if (typeof h.schedules === 'string') {
            try {
              hSchedules = JSON.parse(h.schedules).map((x) => String(x).replace(/^sch-/, ''));
            } catch {
              hSchedules = [];
            }
          }
          return hSchedules.includes(sIdStr);
        });

        if (hasExceptionOnDate || matchingHoliday) {
          // Toko atau jadwal berstatus LIBUR pada tanggal ini: JANGAN PERNAH dibuatkan laporan 'tidak_mengerjakan'.
          // Jika sebelumnya sempat ada laporan 'tidak_mengerjakan' yang terbuat pada tanggal libur ini, bersihkan otomatis:
          try {
            await prisma.checklist_report.deleteMany({
              where: {
                schedule_id: s.schedule_id,
                status: { in: ['tidak_mengerjakan', 'tidak_patuh'] },
                completed_at: {
                  gte: new Date(occ.dateStr + 'T00:00:00+07:00'),
                  lte: new Date(occ.dateStr + 'T23:59:59.999+07:00'),
                },
              },
            });
          } catch (e) {}
          continue;
        }

        // 3. IDEMPOTENT GUARD: Pastikan belum ada report untuk jadwal ini pada tanggal target
        const existingReport = (s.checklist_report || []).find(r => {
          if (isRecurring) {
            const rDate = formatDateString(r.completed_at || r.created_at || r.submitted_at || r.started_at);
            return rDate === occ.dateStr;
          }
          return true;
        });

        if (existingReport) {
          // Sudah ada laporan (baik completed, submitted, maupun tidak_mengerjakan)
          continue;
        }

        // 4. Cari Staff Penanggung Jawab
        let targetStaffId = null;
        if (s.schedule_staff && s.schedule_staff.length > 0 && s.schedule_staff[0].staff_id) {
          targetStaffId = s.schedule_staff[0].staff_id;
        } else if (staffId) {
          const rawSt = staffId.toString().replace(/^staff-/, '');
          if (!isNaN(Number(rawSt))) targetStaffId = BigInt(rawSt);
        }

        if (!targetStaffId && s.store_id) {
          const fallbackStaffRows = await prisma.$queryRawUnsafe(
            `SELECT staff_id FROM staff WHERE store_id = $1 AND status IN ('active', 'Aktif') AND deleted_at IS NULL ORDER BY staff_id ASC LIMIT 1`,
            s.store_id
          );
          if (fallbackStaffRows && fallbackStaffRows[0]?.staff_id) {
            targetStaffId = fallbackStaffRows[0].staff_id;
          }
        }

        if (!targetStaffId && s.store?.workspace_id) {
          const wsStaffRows = await prisma.$queryRawUnsafe(
            `SELECT st.staff_id
             FROM staff st
             JOIN store sto ON st.store_id = sto.store_id
             WHERE sto.workspace_id = $1 AND st.deleted_at IS NULL
             ORDER BY st.staff_id ASC
             LIMIT 1`,
            s.store.workspace_id
          );
          if (wsStaffRows && wsStaffRows[0]?.staff_id) {
            targetStaffId = wsStaffRows[0].staff_id;
          } else {
            continue;
          }
        } else if (!targetStaffId) {
          continue;
        }

        // 5. Hitung butir pertanyaan template
        const tasks = s.checklist_template?.template_category?.flatMap(cat => cat.template_task || []) || [];
        const taskCount = tasks.length || 0;

        // 6. Buat timestamp selesai sesuai tanggal kejadian penugasan (WIB UTC+7 -> UTC)
        const [targetY, targetM, targetD] = occ.dateStr.split('-').map(Number);
        const submitDateTime = new Date(
          Date.UTC(targetY, targetM - 1, targetD, isNaN(eH) ? 23 : eH, isNaN(eM) ? 0 : eM, 0) - 7 * 60 * 60 * 1000
        );

        await prisma.checklist_report.create({
          data: {
            schedule_id: s.schedule_id,
            staff_id: targetStaffId,
            status: 'tidak_mengerjakan',
            started_at: submitDateTime,
            completed_at: submitDateTime,
            duration_minute: 0,
            total_questions: taskCount,
            answered_questions: 0,
            skipped_questions: taskCount,
            total_attachments: 0,
          },
        });

        // Tambahkan ke checklist_report in-memory schedule agar loop berikutnya tidak menduplikasi
        s.checklist_report.push({
          report_id: BigInt(Date.now()),
          schedule_id: s.schedule_id,
          completed_at: submitDateTime,
          created_at: submitDateTime,
          status: 'tidak_mengerjakan',
        });

        createdCount++;
      }
    }

      return createdCount;
    } catch (err) {
      console.warn('⚠️ [syncExpiredSchedulesToDb] Warning:', err.message);
      return 0;
    } finally {
      inFlightSyncs.delete(cacheKey);
    }
  })();

  inFlightSyncs.set(cacheKey, syncPromise);
  return syncPromise;
};

module.exports = {
  formatTimeString,
  formatDateString,
  syncExpiredSchedulesToDb,
};

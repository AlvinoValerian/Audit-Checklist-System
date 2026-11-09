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

const lastSyncCache = new Map();

/**
 * Auto-submit jadwal yang melewati batas toleransi keterlambatan (1 jam setelah end_time)
 * secara otomatis ke tabel `checklist_report` di PostgreSQL dengan status 'tidak_mengerjakan'.
 * Memeriksa hingga 7 hari ke belakang agar seluruh toko dalam workspace memiliki laporan kepatuhan yang akurat.
 * Memiliki idempotent guard sehingga tidak akan pernah membuat duplikat untuk jadwal dan tanggal yang sama.
 * Dilengkapi caching throttle 30 detik agar request dashboard/laporan sangat cepat dan ringan.
 *
 * @param {Object} options
 * @param {string|number|BigInt} [options.storeId] - Filter gerai tertentu
 * @param {string|number|BigInt} [options.workspaceId] - Filter workspace tertentu
 * @param {string|number|BigInt} [options.staffId] - ID staff penanggung jawab opsional
 * @param {boolean} [options.force] - Paksa sync tanpa throttle
 * @returns {Promise<number>} Jumlah jadwal yang baru saja di-auto-submit
 */
const syncExpiredSchedulesToDb = async ({ storeId, workspaceId, staffId, force = false } = {}) => {
  try {
    const cacheKey = `${storeId || 'all'}_${workspaceId || 'all'}_${staffId || 'all'}`;
    const nowTimestamp = Date.now();
    if (!force && lastSyncCache.has(cacheKey) && nowTimestamp - lastSyncCache.get(cacheKey) < 30000) {
      // Throttle: baru saja di-sync dalam 30 detik terakhir, lewati untuk menghemat resource
      return 0;
    }
    lastSyncCache.set(cacheKey, nowTimestamp);

    const scheduleWhere = {
      deleted_at: null,
      status: { not: 'cancelled' },
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
        checklist_report: true,
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
      // 1. Cek apakah libur / pengecualian umum
      const exceptions = s.schedule_exception || [];
      const isHoliday = exceptions.some(e => e.is_skip) || s.status === 'Libur' || s.notes?.toLowerCase().includes('libur');
      if (isHoliday) continue;

      const scheduleStartDateStr = formatDateString(s.start_date);
      const recurrence = s.repeat_time === 'daily'
        ? 'Setiap Hari'
        : (s.repeat_time === 'custom' || s.repeat_time === 'weekly' ? 'Hari Tertentu' : s.repeat_time);

      let selectedDays = [];
      if (s.selected_days) {
        if (typeof s.selected_days === 'string') {
          try {
            selectedDays = JSON.parse(s.selected_days);
          } catch {
            selectedDays = s.selected_days.split(',').map(x => x.trim());
          }
        } else if (Array.isArray(s.selected_days)) {
          selectedDays = s.selected_days;
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

          // Jadwal tidak boleh sebelum tanggal mulai aktif jadwal (start_date)
          if (scheduleStartDateStr && tDateStr < scheduleStartDateStr) continue;

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

        // 2b. Cek apakah toko / jadwal sedang berstatus LIBUR pada tanggal ini (store_holiday)
        const sIdStr = s.schedule_id.toString();
        const sStoreName = (s.store?.store_name || '').trim().toLowerCase();
        const sStoreId = s.store_id.toString();

        const matchingHoliday = storeHolidays.find((h) => {
          const hStoreId = h.store_id ? h.store_id.toString() : '';
          const hStoreName = (h.store_name || '').trim().toLowerCase();
          const storeMatches = (hStoreId && hStoreId === sStoreId) || (hStoreName && hStoreName === sStoreName);
          if (!storeMatches) return false;

          const hStart = formatDateString(h.start_date);
          const hEnd = formatDateString(h.end_date || h.start_date);
          if (occ.dateStr < hStart || occ.dateStr > hEnd) return false;

          const lType = h.libur_type || 'full';
          if (lType === 'full') return true;

          let hSchedules = [];
          if (Array.isArray(h.schedules)) hSchedules = h.schedules.map(String);
          else if (typeof h.schedules === 'string') {
            try {
              hSchedules = JSON.parse(h.schedules).map(String);
            } catch {
              hSchedules = [];
            }
          }
          return hSchedules.includes(sIdStr);
        });

        if (matchingHoliday) {
          // Toko atau jadwal berstatus LIBUR pada tanggal ini: JANGAN PERNAH dibuatkan laporan 'tidak_mengerjakan'.
          // Jika sebelumnya sempat ada laporan 'tidak_mengerjakan' yang terbuat pada tanggal libur ini, bersihkan otomatis:
          try {
            await prisma.checklist_report.deleteMany({
              where: {
                schedule_id: s.schedule_id,
                status: { in: ['tidak_mengerjakan', 'tidak_patuh'] },
                completed_at: {
                  gte: new Date(occ.dateStr + 'T00:00:00Z'),
                  lte: new Date(occ.dateStr + 'T23:59:59.999Z'),
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
          const fallbackStaff = await prisma.staff.findFirst({
            where: { store_id: s.store_id, status: 'active' },
            orderBy: { staff_id: 'asc' },
          });
          if (fallbackStaff) targetStaffId = fallbackStaff.staff_id;
        }

        if (!targetStaffId) {
          const anyStaff = await prisma.staff.findFirst({ orderBy: { staff_id: 'asc' } });
          if (anyStaff) targetStaffId = anyStaff.staff_id;
          else continue;
        }

        // 5. Hitung butir pertanyaan template
        const tasks = s.checklist_template?.template_category?.flatMap(cat => cat.template_task || []) || [];
        const taskCount = tasks.length || 8;

        // 6. Buat timestamp selesai sesuai tanggal kejadian penugasan
        const [targetY, targetM, targetD] = occ.dateStr.split('-').map(Number);
        // Set ke jam akhir jadwal di hari tersebut dalam UTC (UTC = WIB - 7 jam)
        const utcHours = (eH - 7 + 24) % 24;
        const submitDateTime = new Date(Date.UTC(targetY, targetM - 1, targetD, utcHours, eM || 0, 0));

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
  }
};

module.exports = {
  formatTimeString,
  formatDateString,
  syncExpiredSchedulesToDb,
};

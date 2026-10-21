import { AuditSchedule, ScheduleStats, ScheduleStatus } from "@/types/schedule";

const SCHEDULE_STORAGE_KEY = "audit_pro_jadwal_audit_v6";

// Helper to calculate dynamic dates relative to today's date
const getRelativeDate = (offsetDays: number = 0) => {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getRelativeCreated = (offsetDays: number = 0) => {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays - 2);
  const y = target.getFullYear();
  const m = String(target.getMonth() + 1).padStart(2, "0");
  const d = String(target.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const getDayNameOffset = (offsetDays: number = 0) => {
  const target = new Date();
  target.setDate(target.getDate() + offsetDays);
  return DAY_NAMES_SHORT[target.getDay()];
};

/**
 * Resolves the realtime status of a schedule:
 * - If cancelled ("Dibatalkan"), it remains "Dibatalkan".
 * - If past date (< today), it becomes "Selesai".
 * - If future date (> today), it is "Terjadwal".
 * - If today: if current time (now) has passed endTime, it automatically becomes "Selesai".
 */
export const resolveScheduleStatus = (
  schedule: AuditSchedule,
  now: Date = new Date()
): ScheduleStatus => {
  if (schedule.status === "Dibatalkan") {
    return "Dibatalkan";
  }

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  const scheduleDateStr = schedule.date || todayStr;

  // Tanggal di masa lalu (< hari ini) -> otomatis Selesai
  if (scheduleDateStr < todayStr) {
    return "Selesai";
  }

  // Tanggal di masa depan (> hari ini) -> Terjadwal
  if (scheduleDateStr > todayStr) {
    return "Terjadwal";
  }

  // Tanggal hari ini (scheduleDateStr === todayStr):
  // Cek apakah waktu saat ini sudah melebihi waktu selesai (endTime)
  let endTimeStr = schedule.endTime;
  if (!endTimeStr && schedule.timeRange) {
    const parts = schedule.timeRange.split("-");
    if (parts.length > 1) {
      endTimeStr = parts[1].trim();
    }
  }

  if (endTimeStr) {
    const timeParts = endTimeStr.split(":");
    if (timeParts.length >= 2) {
      const endH = parseInt(timeParts[0], 10);
      const endM = parseInt(timeParts[1], 10);
      if (!isNaN(endH) && !isNaN(endM)) {
        const scheduleEnd = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          endH,
          endM,
          0,
          0
        );
        // Jika waktu saat ini sudah melebihi jam selesai jadwal:
        if (now.getTime() >= scheduleEnd.getTime()) {
          return "Selesai";
        }
      }
    }
  }

  return "Terjadwal";
};

/**
 * Helper to determine if a soft-deleted item has passed 15 days retention.
 * If 15 days or more have passed since it was soft-deleted, it returns true (should be hidden / terhide).
 */
export const isSoftDeletedExpired = (
  deletedAt?: string,
  fallbackDate?: string,
  now: Date = new Date()
): boolean => {
  const dateStr = deletedAt || fallbackDate;
  if (!dateStr) return false;

  const targetDate = new Date(dateStr);
  if (isNaN(targetDate.getTime())) return false;

  targetDate.setHours(0, 0, 0, 0);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

  const diffTime = today.getTime() - targetDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 15;
};

export const defaultSchedules: AuditSchedule[] = [
  // ==========================================
  // JADWAL HARI INI (TANGGAL 21 OKTOBER)
  // ==========================================
  {
    id: "sch-1",
    storeName: "Cabang Sudirman",
    storeLocation: "Jakarta Pusat",
    scheduleName: "Checklist Operasional Pagi",
    auditorName: "Hendra Wijaya",
    timeRange: "08:30 - 11:00",
    startTime: "08:30",
    endTime: "11:00",
    date: getRelativeDate(0),
    recurrence: "Setiap Hari",
    status: "Terjadwal",
    notes: "Pemeriksaan operasional rutin dan kesiapan display toko pagi hari ini.",
    createdAt: getRelativeCreated(0),
  },
  {
    id: "sch-2",
    storeName: "Cabang Thamrin",
    storeLocation: "Jakarta Pusat",
    scheduleName: "Audit Display & Promosi Siang",
    auditorName: "Siti Rahmawati",
    timeRange: "13:00 - 15:30",
    startTime: "13:00",
    endTime: "15:30",
    date: getRelativeDate(0),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(0), getDayNameOffset(2)],
    status: "Terjadwal",
    notes: "Pemeriksaan planogram mingguan dan display promo akhir bulan.",
    createdAt: getRelativeCreated(0),
  },
  {
    id: "sch-3",
    storeName: "Cabang Kemang",
    storeLocation: "Jakarta Selatan",
    scheduleName: "Audit Kebersihan & K3 Sore",
    auditorName: "Budi Santoso",
    timeRange: "16:00 - 18:30",
    startTime: "16:00",
    endTime: "18:30",
    date: getRelativeDate(0),
    recurrence: "Setiap Hari",
    status: "Terjadwal",
    notes: "Inspeksi kebersihan area pelayanan, toilet staf, dan jalur darurat.",
    createdAt: getRelativeCreated(0),
  },
  {
    id: "sch-4",
    storeName: "Cabang Senayan",
    storeLocation: "Jakarta Pusat",
    scheduleName: "Audit Closing & Kasir Malam",
    auditorName: "Ahmad Fauzi",
    timeRange: "22:00 - 23:59",
    startTime: "22:00",
    endTime: "23:59",
    date: getRelativeDate(0),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(0)],
    status: "Terjadwal",
    notes: "Pemeriksaan rekonsiliasi kas register tutup toko dan serah terima kunci gerai.",
    createdAt: getRelativeCreated(0),
  },

  // ==========================================
  // JADWAL MENDATANG (DALAM BATAS 1 MINGGU KE DEPAN)
  // ==========================================
  {
    id: "sch-5",
    storeName: "Cabang PIK",
    storeLocation: "Jakarta Utara",
    scheduleName: "Audit Stok & Inventori",
    auditorName: "Dewi Lestari",
    timeRange: "10:00 - 13:00",
    startTime: "10:00",
    endTime: "13:00",
    date: getRelativeDate(1),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(1)],
    status: "Terjadwal",
    notes: "Stock opname parsial produk fresh dan chiller cold chain.",
    createdAt: getRelativeCreated(1),
  },
  {
    id: "sch-6",
    storeName: "Cabang Kelapa Gading",
    storeLocation: "Jakarta Utara",
    scheduleName: "Audit Kepatuhan Kasir & POS",
    auditorName: "Hendra Wijaya",
    timeRange: "13:30 - 16:00",
    startTime: "13:30",
    endTime: "16:00",
    date: getRelativeDate(2),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(2)],
    status: "Terjadwal",
    notes: "Pemeriksaan rekonsiliasi kas register dan EDC merchant.",
    createdAt: getRelativeCreated(2),
  },
  {
    id: "sch-7",
    storeName: "Cabang Bintaro",
    storeLocation: "Tangerang Selatan",
    scheduleName: "Inspeksi Cold Storage & Chiller",
    auditorName: "Budi Santoso",
    timeRange: "09:00 - 11:30",
    startTime: "09:00",
    endTime: "11:30",
    date: getRelativeDate(3),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(3)],
    status: "Terjadwal",
    notes: "Pengecekan temperatur logbook chiller dan showcase harian.",
    createdAt: getRelativeCreated(3),
  },
  {
    id: "sch-8",
    storeName: "Cabang Puri Indah",
    storeLocation: "Jakarta Barat",
    scheduleName: "Audit Fasilitas & Keamanan",
    auditorName: "Siti Rahmawati",
    timeRange: "10:00 - 12:30",
    startTime: "10:00",
    endTime: "12:30",
    date: getRelativeDate(5),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(5)],
    status: "Terjadwal",
    notes: "Inspeksi tabung APAR, pintu darurat, dan CCTV area kasir.",
    createdAt: getRelativeCreated(5),
  },
  {
    id: "sch-9",
    storeName: "Cabang Fatmawati",
    storeLocation: "Jakarta Selatan",
    scheduleName: "Verifikasi Merchant & QRIS",
    auditorName: "Ahmad Fauzi",
    timeRange: "14:00 - 16:00",
    startTime: "14:00",
    endTime: "16:00",
    date: getRelativeDate(6),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(6)],
    status: "Terjadwal",
    notes: "Verifikasi kode QR static kasir dan kelayakan stiker QRIS.",
    createdAt: getRelativeCreated(6),
  },

  // ==========================================
  // RIWAYAT AUDIT MASA LALU (SEBELUM HARI INI)
  // ==========================================
  {
    id: "sch-10",
    storeName: "Cabang Depok",
    storeLocation: "Jawa Barat",
    scheduleName: "Audit Planogram & Etalase",
    auditorName: "Ahmad Fauzi",
    timeRange: "14:00 - 16:30",
    startTime: "14:00",
    endTime: "16:30",
    date: getRelativeDate(-1),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(-1)],
    status: "Selesai",
    notes: "Pemeriksaan kesesuaian rak gondola selesai tanpa temuan mayor.",
    createdAt: getRelativeCreated(-1),
  },
  {
    id: "sch-11",
    storeName: "Cabang Bekasi",
    storeLocation: "Jawa Barat",
    scheduleName: "Audit Sanitasi & Limbah",
    auditorName: "Dewi Lestari",
    timeRange: "10:00 - 12:00",
    startTime: "10:00",
    endTime: "12:00",
    date: getRelativeDate(-2),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(-2)],
    status: "Selesai",
    notes: "Pemeriksaan grease trap dan pembuangan limbah dapur.",
    createdAt: getRelativeCreated(-2),
  },
  {
    id: "sch-12",
    storeName: "Cabang BSD Serpong",
    storeLocation: "Tangerang",
    scheduleName: "Audit Kelistrikan & Genset",
    auditorName: "Hendra Wijaya",
    timeRange: "15:00 - 17:00",
    startTime: "15:00",
    endTime: "17:00",
    date: getRelativeDate(-2),
    recurrence: "Hari Tertentu",
    selectedDays: [getDayNameOffset(-2)],
    status: "Dibatalkan",
    notes: "Dibatalkan karena toko sedang dalam renovasi elektrikal utama.",
    createdAt: getRelativeCreated(-2),
  },
];

const DAY_MAP_TO_SHORT: Record<string, string> = {
  Senin: "Sen",
  Selasa: "Sel",
  Rabu: "Rab",
  Kamis: "Kam",
  Jumat: "Jum",
  Sabtu: "Sab",
  Minggu: "Min",
  Sen: "Sen",
  Sel: "Sel",
  Rab: "Rab",
  Kam: "Kam",
  Jum: "Jum",
  Sab: "Sab",
  Min: "Min",
};

export const ScheduleService = {
  getAll(): AuditSchedule[] {
    const now = new Date();
    if (typeof window === "undefined") {
      return defaultSchedules
        .map((item) => ({
          ...item,
          status: resolveScheduleStatus(item, now),
        }))
        .filter((item) => {
          if (item.status === "Dibatalkan") {
            const expired = isSoftDeletedExpired(item.deletedAt, item.date, now);
            if (expired) return false;
          }
          return true;
        });
    }
    try {
      const data = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      let list: AuditSchedule[] = [];
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        } else {
          list = defaultSchedules;
        }
      } else {
        list = defaultSchedules;
      }

      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      let changed = false;

      const updated = list.map((item) => {
        let nextItem = { ...item };
        if (item.date && !item.date.startsWith(currentYearMonth)) {
          const dayPart = item.date.split("-")[2] || "01";
          nextItem.date = `${currentYearMonth}-${dayPart}`;
          nextItem.createdAt = item.createdAt?.startsWith(currentYearMonth)
            ? item.createdAt
            : `${currentYearMonth}-01`;
          changed = true;
        }
        if (Array.isArray(nextItem.selectedDays)) {
          const normalized = nextItem.selectedDays.map(
            (d: string) => DAY_MAP_TO_SHORT[d] || d
          );
          if (JSON.stringify(normalized) !== JSON.stringify(nextItem.selectedDays)) {
            nextItem.selectedDays = normalized;
            changed = true;
          }
        }

        // REALTIME: Cek apakah jadwal sudah melebihi jam selesai
        const realtimeStatus = resolveScheduleStatus(nextItem, now);
        if (nextItem.status !== realtimeStatus && nextItem.status !== "Dibatalkan") {
          nextItem.status = realtimeStatus;
          changed = true;
        }

        return nextItem;
      });

      if (changed || !data) {
        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
      }

      // Sembunyikan item yang sudah di-soft delete setelah 15 hari
      return updated.filter((item) => {
        if (item.status === "Dibatalkan") {
          const expired = isSoftDeletedExpired(item.deletedAt, item.date, now);
          if (expired) return false;
        }
        return true;
      });
    } catch {
      return defaultSchedules;
    }
  },

  getById(id: string): AuditSchedule | undefined {
    return this.getAll().find((s) => s.id === id);
  },

  create(data: Omit<AuditSchedule, "id">): AuditSchedule {
    const list = this.getAll();
    const newSchedule: AuditSchedule = {
      ...data,
      id: `sch-${Date.now()}`,
      createdAt: data.createdAt || new Date().toISOString().split("T")[0],
    };
    const updated = [newSchedule, ...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    }
    return newSchedule;
  },

  update(id: string, data: Partial<AuditSchedule>): AuditSchedule | null {
    const list = this.getAll();
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updatedSchedule = { ...list[index], ...data };
    list[index] = updatedSchedule;
    if (typeof window !== "undefined") {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(list));
    }
    return updatedSchedule;
  },

  delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;
    if (typeof window !== "undefined") {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  getStats(schedules?: AuditSchedule[]): ScheduleStats {
    const list = schedules || this.getAll();
    const total = list.length;
    const active = list.filter((s) => s.status === "Terjadwal" || s.status === "Selesai").length;
    const inactive = list.filter((s) => s.status === "Dibatalkan").length;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
    const completed = list.filter((s) => s.status === "Selesai").length;
    const scheduled = list.filter((s) => s.status === "Terjadwal").length;
    const cancelled = list.filter((s) => s.status === "Dibatalkan").length;

    return {
      total,
      active,
      inactive,
      activePercentage,
      completed,
      scheduled,
      cancelled,
    };
  },
};

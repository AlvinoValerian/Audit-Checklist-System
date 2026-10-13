import { AuditSchedule, ScheduleStats } from "@/types/schedule";

const SCHEDULE_STORAGE_KEY = "audit_pro_jadwal_audit_v2";

// Helper to calculate dynamic dates relative to current month & year
const getDynamicDate = (day: number) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getDynamicCreated = (day: number) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(Math.max(1, day - 3)).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const defaultSchedules: AuditSchedule[] = [
  {
    id: "sch-1",
    storeName: "Cabang Sudirman",
    storeLocation: "Jakarta Pusat",
    scheduleName: "Checklist Operasional Harian",
    auditorName: "Hendra Wijaya",
    timeRange: "09:00 - 12:00",
    startTime: "09:00",
    endTime: "12:00",
    date: getDynamicDate(4),
    recurrence: "Setiap Hari",
    status: "Terjadwal",
    notes: "Pemeriksaan operasional rutin pembukaan gerai.",
    createdAt: getDynamicCreated(4),
  },
  {
    id: "sch-2",
    storeName: "Cabang Thamrin",
    storeLocation: "Jakarta Pusat",
    scheduleName: "Audit Display & Promosi",
    auditorName: "Siti Rahmawati",
    timeRange: "13:00 - 15:30",
    startTime: "13:00",
    endTime: "15:30",
    date: getDynamicDate(4),
    recurrence: "Hari Tertentu",
    selectedDays: ["Senin", "Rabu", "Jumat"],
    status: "Terjadwal",
    notes: "Pemeriksaan planogram mingguan dan promo katalog aktif.",
    createdAt: getDynamicCreated(4),
  },
  {
    id: "sch-3",
    storeName: "Cabang Kemang",
    storeLocation: "Jakarta Selatan",
    scheduleName: "Audit Kebersihan & K3",
    auditorName: "Budi Santoso",
    timeRange: "08:00 - 10:00",
    startTime: "08:00",
    endTime: "10:00",
    date: getDynamicDate(4),
    recurrence: "Setiap Hari",
    status: "Selesai",
    notes: "Inspeksi kebersihan area makan dan toilet staf.",
    createdAt: getDynamicCreated(4),
  },
  {
    id: "sch-4",
    storeName: "Cabang Senayan",
    storeLocation: "Jakarta Pusat",
    scheduleName: "Audit Stok & Inventori",
    auditorName: "Ahmad Fauzi",
    timeRange: "10:00 - 12:30",
    startTime: "10:00",
    endTime: "12:30",
    date: getDynamicDate(5),
    recurrence: "Hari Tertentu",
    selectedDays: ["Selasa", "Kamis"],
    status: "Terjadwal",
    notes: "Stock opname parsial kategori susu dan daging beku.",
    createdAt: getDynamicCreated(5),
  },
  {
    id: "sch-5",
    storeName: "Cabang PIK",
    storeLocation: "Jakarta Utara",
    scheduleName: "Audit Fasilitas & Keamanan",
    auditorName: "Dewi Lestari",
    timeRange: "14:00 - 17:00",
    startTime: "14:00",
    endTime: "17:00",
    date: getDynamicDate(5),
    recurrence: "Hari Tertentu",
    selectedDays: ["Selasa"],
    status: "Dibatalkan",
    notes: "Jadwal ditunda karena sedang berlangsung perbaikan lantai toko.",
    createdAt: getDynamicCreated(5),
  },
  {
    id: "sch-6",
    storeName: "Cabang Kelapa Gading",
    storeLocation: "Jakarta Utara",
    scheduleName: "Audit Kepatuhan Kasir & POS",
    auditorName: "Hendra Wijaya",
    timeRange: "09:00 - 11:30",
    startTime: "09:00",
    endTime: "11:30",
    date: getDynamicDate(6),
    recurrence: "Setiap Hari",
    status: "Selesai",
    notes: "Pemeriksaan kas modal dan EDC printer struk.",
    createdAt: getDynamicCreated(6),
  },
  {
    id: "sch-7",
    storeName: "Cabang Bintaro",
    storeLocation: "Tangerang Selatan",
    scheduleName: "Inspeksi Cold Storage & Chiller",
    auditorName: "Budi Santoso",
    timeRange: "13:00 - 15:00",
    startTime: "13:00",
    endTime: "15:00",
    date: getDynamicDate(6),
    recurrence: "Hari Tertentu",
    selectedDays: ["Rabu", "Sabtu"],
    status: "Terjadwal",
    notes: "Pengukuran suhu chiller dan freezer showcase.",
    createdAt: getDynamicCreated(6),
  },
  {
    id: "sch-8",
    storeName: "Cabang Puri Indah",
    storeLocation: "Jakarta Barat",
    scheduleName: "Checklist Opening & Closing",
    auditorName: "Siti Rahmawati",
    timeRange: "08:30 - 11:00",
    startTime: "08:30",
    endTime: "11:00",
    date: getDynamicDate(7),
    recurrence: "Setiap Hari",
    status: "Selesai",
    notes: "Evaluasi kesiapan staf dan seragam kerja.",
    createdAt: getDynamicCreated(7),
  },
  {
    id: "sch-9",
    storeName: "Cabang Depok",
    storeLocation: "Jawa Barat",
    scheduleName: "Audit Planogram & Etalase",
    auditorName: "Ahmad Fauzi",
    timeRange: "14:00 - 16:30",
    startTime: "14:00",
    endTime: "16:30",
    date: getDynamicDate(7),
    recurrence: "Hari Tertentu",
    selectedDays: ["Kamis"],
    status: "Terjadwal",
    notes: "Pemeriksaan kesesuaian label harga rak gondola.",
    createdAt: getDynamicCreated(7),
  },
  {
    id: "sch-10",
    storeName: "Cabang Bekasi",
    storeLocation: "Jawa Barat",
    scheduleName: "Verifikasi Merchant & QRIS",
    auditorName: "Dewi Lestari",
    timeRange: "10:00 - 12:00",
    startTime: "10:00",
    endTime: "12:00",
    date: getDynamicDate(8),
    recurrence: "Hari Tertentu",
    selectedDays: ["Jumat"],
    status: "Selesai",
    notes: "Pemeriksaan validasi kode barcode statis meja kasir.",
    createdAt: getDynamicCreated(8),
  },
  {
    id: "sch-11",
    storeName: "Cabang Bogor",
    storeLocation: "Jawa Barat",
    scheduleName: "Audit APAR & Jalur Evakuasi K3",
    auditorName: "Budi Santoso",
    timeRange: "11:00 - 13:30",
    startTime: "11:00",
    endTime: "13:30",
    date: getDynamicDate(8),
    recurrence: "Hari Tertentu",
    selectedDays: ["Jumat", "Sabtu"],
    status: "Terjadwal",
    notes: "Inspeksi tekanan tabung pemadam api dan tangga darurat.",
    createdAt: getDynamicCreated(8),
  },
  {
    id: "sch-12",
    storeName: "Cabang BSD Serpong",
    storeLocation: "Tangerang",
    scheduleName: "Formulir Audit Merchant (Arsip)",
    auditorName: "Ahmad Fauzi",
    timeRange: "15:00 - 17:00",
    startTime: "15:00",
    endTime: "17:00",
    date: getDynamicDate(9),
    recurrence: "Hari Tertentu",
    selectedDays: ["Sabtu"],
    status: "Dibatalkan",
    notes: "Jadwal dialihkan karena toko sedang renovasi elektrikal.",
    createdAt: getDynamicCreated(9),
  },
];

export const ScheduleService = {
  getAll(): AuditSchedule[] {
    if (typeof window === "undefined") return defaultSchedules;
    try {
      const data = localStorage.getItem(SCHEDULE_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored records have past years (< current year) or different month, sync them to current month
          const now = new Date();
          const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          
          const updated = parsed.map((item) => {
            if (item.date && !item.date.startsWith(currentYearMonth)) {
              const dayPart = item.date.split("-")[2] || "01";
              return {
                ...item,
                date: `${currentYearMonth}-${dayPart}`,
                createdAt: item.createdAt?.startsWith(currentYearMonth)
                  ? item.createdAt
                  : `${currentYearMonth}-01`,
              };
            }
            return item;
          });
          return updated;
        }
      }
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(defaultSchedules));
      return defaultSchedules;
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

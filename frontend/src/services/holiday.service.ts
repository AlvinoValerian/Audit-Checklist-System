import { Holiday, HolidayStatus } from "@/types/holiday";

const HOLIDAY_STORAGE_KEY = "audit_pro_holidays_v2";

// Helper to calculate dynamic dates relative to current month & year
const getDynamicDate = (day: number) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const defaultHolidays: Holiday[] = [
  {
    id: "1",
    storeName: "Cabang Sudirman",
    storeLocation: "Jakarta Pusat",
    startDate: getDynamicDate(17),
    endDate: getDynamicDate(18),
    durationDays: 2,
    reason: "Renovasi Tahunan Toko",
    createdBy: "Admin Utama",
    creatorRole: "Admin",
    status: "Terjadwal",
  },
  {
    id: "2",
    storeName: "Cabang Thamrin",
    storeLocation: "Jakarta Pusat",
    startDate: getDynamicDate(25),
    endDate: getDynamicDate(25),
    durationDays: 1,
    reason: "Maintenance Kelistrikan & AC",
    createdBy: "Budi Santoso",
    creatorRole: "Admin",
    status: "Terjadwal",
  },
  {
    id: "3",
    storeName: "Cabang Kemang",
    storeLocation: "Jakarta Selatan",
    startDate: getDynamicDate(10),
    endDate: getDynamicDate(12),
    durationDays: 3,
    reason: "Pengecatan Ulang & Sanitasi",
    createdBy: "Admin Utama",
    creatorRole: "Admin",
    status: "Selesai",
  },
  {
    id: "4",
    storeName: "Cabang Senayan",
    storeLocation: "Jakarta Pusat",
    startDate: getDynamicDate(17),
    endDate: getDynamicDate(17),
    durationDays: 1,
    reason: "Hari Libur Khusus Toko",
    createdBy: "Siti Rahma",
    creatorRole: "Admin",
    status: "Terjadwal",
  },
  {
    id: "5",
    storeName: "Cabang PIK",
    storeLocation: "Jakarta Utara",
    startDate: getDynamicDate(1),
    endDate: getDynamicDate(2),
    durationDays: 2,
    reason: "Disinfeksi Berkala Fasilitas",
    createdBy: "Admin Utama",
    creatorRole: "Admin",
    status: "Dibatalkan",
  },
];

export const HolidayService = {
  getAll: (): Holiday[] => {
    if (typeof window === "undefined") return defaultHolidays;
    const stored = localStorage.getItem(HOLIDAY_STORAGE_KEY);
    if (!stored) {
      // Check legacy storage key
      const legacy = localStorage.getItem("audit_pro_holidays");
      if (legacy) {
        try {
          const parsedLegacy: Holiday[] = JSON.parse(legacy);
          const hasOld2024 = parsedLegacy.some((h) => h.startDate.startsWith("2024-08"));
          if (!hasOld2024) {
            localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(parsedLegacy));
            return parsedLegacy;
          }
        } catch {
          // ignore
        }
      }
      localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(defaultHolidays));
      return defaultHolidays;
    }
    return JSON.parse(stored);
  },

  create: (data: Omit<Holiday, "id">): Holiday => {
    const holidays = HolidayService.getAll();
    const newHoliday: Holiday = {
      ...data,
      id: Date.now().toString(),
    };
    holidays.unshift(newHoliday);
    localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(holidays));
    return newHoliday;
  },

  update: (id: string, data: Partial<Holiday>): Holiday | null => {
    const holidays = HolidayService.getAll();
    const index = holidays.findIndex((h) => h.id === id);
    if (index === -1) return null;

    holidays[index] = { ...holidays[index], ...data };
    localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(holidays));
    return holidays[index];
  },

  delete: (id: string): boolean => {
    const holidays = HolidayService.getAll();
    const filtered = holidays.filter((h) => h.id !== id);
    if (filtered.length === holidays.length) return false;

    localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  },

  getStats: (holidays: Holiday[]) => {
    const total = holidays.length;
    const active = holidays.filter((h) => h.status === "Terjadwal").length; // Terjadwal acts as active
    const cancelled = holidays.filter((h) => h.status === "Dibatalkan").length;
    
    return {
      total,
      active,
      cancelled,
    };
  }
};

import { Holiday, HolidayStatus } from "@/types/holiday";

const HOLIDAY_STORAGE_KEY = "audit_pro_holidays";

const defaultHolidays: Holiday[] = [
  {
    id: "1",
    storeName: "Cabang Sudirman",
    storeLocation: "Jakarta Pusat",
    startDate: "2024-08-17",
    endDate: "2024-08-18",
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
    startDate: "2024-08-25",
    endDate: "2024-08-25",
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
    startDate: "2024-08-10",
    endDate: "2024-08-12",
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
    startDate: "2024-08-17",
    endDate: "2024-08-17",
    durationDays: 1,
    reason: "Hari Kemerdekaan RI",
    createdBy: "Siti Rahma",
    creatorRole: "Admin",
    status: "Terjadwal",
  },
  {
    id: "5",
    storeName: "Cabang PIK",
    storeLocation: "Jakarta Utara",
    startDate: "2024-08-01",
    endDate: "2024-08-02",
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

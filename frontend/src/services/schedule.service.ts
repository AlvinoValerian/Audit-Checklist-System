import { AuditSchedule, ScheduleStats, ScheduleStatus } from "@/types/schedule";
import { AuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};
const BACKEND_URL = getBackendUrl();

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = AuthService.getToken();
  const user = AuthService.getCurrentUser();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const activeWs = AuthService.getActiveWorkspace();
  if (activeWs?.id) {
    headers["x-workspace-id"] = activeWs.id;
  } else if (user?.workspaceId) {
    headers["x-workspace-id"] = user.workspaceId;
  }
  return headers;
};

const SCHEDULE_STORAGE_KEY = "audit_pro_jadwal_audit_v6";

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

const DAY_MAP_TO_SHORT: Record<string, string> = {
  senin: "Sen",
  selasa: "Sel",
  rabu: "Rab",
  kamis: "Kam",
  jumat: "Jum",
  "jum'at": "Jum",
  sabtu: "Sab",
  minggu: "Min",
  sen: "Sen",
  sel: "Sel",
  rab: "Rab",
  kam: "Kam",
  jum: "Jum",
  sab: "Sab",
  min: "Min",
};

const normalizeDayToken = (day?: string): string => {
  const raw = String(day || "").trim();
  if (!raw) return "";
  return DAY_MAP_TO_SHORT[raw.toLowerCase()] || raw;
};

export const getWibDateParts = (date: Date = new Date()) => {
  const safeDate = isNaN(date.getTime()) ? new Date() : date;
  const wibDate = new Date(safeDate.getTime() + 7 * 60 * 60 * 1000);
  const y = wibDate.getUTCFullYear();
  const m = String(wibDate.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wibDate.getUTCDate()).padStart(2, "0");
  const hours = wibDate.getUTCHours();
  const minutes = wibDate.getUTCMinutes();
  const dayOfWeekShort = DAY_NAMES_SHORT[wibDate.getUTCDay()];
  return {
    dateStr: `${y}-${m}-${d}`,
    dayOfWeekShort,
    currentMinutes: hours * 60 + minutes,
    yearMonth: `${y}-${m}`,
    wibDate,
  };
};

// Helper to calculate dynamic dates relative to today's WIB date
const getRelativeDate = (offsetDays: number = 0) => {
  const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return getWibDateParts(target).dateStr;
};

const getRelativeCreated = (offsetDays: number = 0) => {
  const target = new Date(Date.now() + (offsetDays - 2) * 24 * 60 * 60 * 1000);
  return getWibDateParts(target).dateStr;
};

const getDayNameOffset = (offsetDays: number = 0) => {
  const target = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return getWibDateParts(target).dayOfWeekShort;
};

/**
 * Konversi string waktu format apapun (termasuk jika ada AM/PM) menjadi format 24 jam "HH:mm"
 */
export const to24HourString = (str?: string): string => {
  if (!str) return "09:00";
  const s = String(str).trim();
  const match = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!match) return s.substring(0, 5);
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = match[3] ? match[3].toUpperCase() : null;
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${m}`;
};

/**
 * Hitung durasi jam dan menit dari jam awal dan jam berakhir
 */
export const calculateDuration = (
  startStr?: string,
  endStr?: string,
  timeRange?: string
): string => {
  let s = startStr;
  let e = endStr;
  if ((!s || !e) && timeRange) {
    const parts = timeRange.replace(/WIB/gi, "").split("-");
    if (parts.length >= 2) {
      if (!s) s = parts[0].trim();
      if (!e) e = parts[1].trim();
    }
  }
  const cleanStart = to24HourString(s);
  const cleanEnd = to24HourString(e);
  const [sH, sM] = cleanStart.split(":").map((v) => parseInt(v, 10));
  const [eH, eM] = cleanEnd.split(":").map((v) => parseInt(v, 10));
  if (isNaN(sH) || isNaN(eH)) return "0 Jam";

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

/**
 * Resolves the realtime status of a schedule in WIB (UTC+7):
 * - If cancelled ("Dibatalkan") or soft-deleted (deletedAt), it returns "Dibatalkan".
 * - If completed by staff ("Selesai"), it returns "Selesai".
 * - If start date is in the future (> today), past endDate (< today), or on store holiday today, returns "Terjadwal" (or "Selesai" when past).
 * - If active today within startTime..endTime, returns "Sedang Berjalan"; before startTime returns "Terjadwal"; past endTime returns "Selesai".
 */
export const resolveScheduleStatus = (
  schedule: AuditSchedule,
  now: Date = new Date()
): ScheduleStatus => {
  if (schedule.status === "Dibatalkan" || Boolean(schedule.deletedAt)) {
    return "Dibatalkan";
  }

  // Cek apakah sudah dikerjakan oleh staff langsung dari database
  const isRecurring = schedule.recurrence === "Setiap Hari" || schedule.recurrence === "Hari Tertentu";
  if (isRecurring ? Boolean(schedule.isCompletedToday) : Boolean(schedule.isCompletedByStaff)) {
    return "Selesai";
  }

  const { dateStr: todayStr, dayOfWeekShort, currentMinutes } = getWibDateParts(now);
  const scheduleDateStr = schedule.date || todayStr;

  // Jika tanggal mulai jadwal belum tiba (> hari ini), jadwal masih Terjadwal
  if (scheduleDateStr > todayStr) {
    return "Terjadwal";
  }

  // Jika endDate sudah lewat (< hari ini) dan bukan penanda single-day endDate === date
  if (
    schedule.endDate &&
    (!isRecurring || schedule.endDate > scheduleDateStr) &&
    schedule.endDate < todayStr
  ) {
    return "Selesai";
  }

  // Jika tanggal jadwal lampau (< today) dan bukan pengulangan berulang, maka sudah selesai:
  if (scheduleDateStr < todayStr && !isRecurring) {
    return "Selesai";
  }

  // Jika toko atau jadwal sedang libur hari ini, tidak berstatus Sedang Berjalan
  if (schedule.isHolidayToday) {
    return "Terjadwal";
  }

  const normalizedDays = Array.isArray(schedule.selectedDays)
    ? schedule.selectedDays.map((d) => normalizeDayToken(d)).filter(Boolean)
    : [];

  // Cek apakah jadwal ini aktif/berlaku pada hari ini (today):
  const runsToday =
    schedule.recurrence === "Setiap Hari"
      ? true
      : schedule.recurrence === "Hari Tertentu"
      ? normalizedDays.length === 0 || normalizedDays.includes(dayOfWeekShort)
      : scheduleDateStr === todayStr;

  if (runsToday) {
    let startStr = schedule.startTime;
    let endStr = schedule.endTime;
    if ((!startStr || !endStr) && schedule.timeRange) {
      const parts = schedule.timeRange.replace(/WIB/gi, "").split("-");
      if (parts.length >= 2) {
        if (!startStr) startStr = parts[0].trim();
        if (!endStr) endStr = parts[1].trim();
      }
    }

    if (startStr && endStr) {
      const cleanStart = to24HourString(startStr);
      const cleanEnd = to24HourString(endStr);
      const sParts = cleanStart.split(":");
      const eParts = cleanEnd.split(":");
      if (sParts.length >= 2 && eParts.length >= 2) {
        const startH = parseInt(sParts[0], 10);
        const startM = parseInt(sParts[1], 10);
        const endH = parseInt(eParts[0], 10);
        const endM = parseInt(eParts[1], 10);

        if (!isNaN(startH) && !isNaN(endH)) {
          const startMinutes = startH * 60 + (isNaN(startM) ? 0 : startM);
          const endMinutes = endH * 60 + (isNaN(endM) ? 0 : endM);

          if (endMinutes >= startMinutes) {
            // Normal shift dalam hari yang sama (misal 09:00 - 12:00)
            if (currentMinutes < startMinutes) {
              return "Terjadwal";
            } else if (currentMinutes <= endMinutes) {
              return "Sedang Berjalan";
            } else {
              // Jam akhir sudah selesai / terlewati jam sekarang!
              return "Selesai";
            }
          } else {
            // Shift malam lintas hari (misal 22:00 - 02:00)
            if (currentMinutes >= startMinutes || currentMinutes <= endMinutes) {
              return "Sedang Berjalan";
            } else {
              return "Terjadwal";
            }
          }
        }
      }
    } else if (startStr) {
      const cleanStart = to24HourString(startStr);
      const sParts = cleanStart.split(":");
      if (sParts.length >= 2) {
        const startH = parseInt(sParts[0], 10);
        const startM = parseInt(sParts[1], 10);
        if (!isNaN(startH)) {
          const startMinutes = startH * 60 + (isNaN(startM) ? 0 : startM);
          if (currentMinutes < startMinutes) {
            return "Terjadwal";
          } else {
            return "Sedang Berjalan";
          }
        }
      }
    }
    return "Terjadwal";
  }

  // Jadwal berulang yang masih aktif namun tidak jatuh pada hari ini tetap Terjadwal
  return "Terjadwal";
};

/**
 * Helper: Cek apakah suatu jadwal sedang berjalan saat ini
 */
export const isScheduleInProgress = (
  schedule: AuditSchedule,
  now: Date = new Date()
): boolean => {
  return resolveScheduleStatus(schedule, now) === "Sedang Berjalan";
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

export const ScheduleService = {
  cachedSchedules: [] as AuditSchedule[],

  async fetchAll(workspaceId?: string): Promise<AuditSchedule[]> {
    try {
      const user = AuthService.getCurrentUser();
      const activeWs = AuthService.getActiveWorkspace();
      const targetWs = workspaceId !== undefined ? workspaceId : activeWs?.id;
      const isSuperAdmin = user?.role === "Super Admin";
      const saRawId = isSuperAdmin
        ? user?.rawId || (user?.id ? user.id.replace(/^sa-/, "") : undefined)
        : undefined;

      let queryParam = "";
      if (targetWs) {
        queryParam = `?workspaceId=${targetWs}`;
      } else if (isSuperAdmin && saRawId) {
        queryParam = `?superAdminId=${saRawId}`;
      } else if (user?.email) {
        queryParam = `?email=${encodeURIComponent(user.email)}`;
      }

      const headers = getAuthHeaders();
      if (targetWs) {
        headers["x-workspace-id"] = targetWs;
      }

      const res = await apiFetch(`${BACKEND_URL}/api/schedules${queryParam}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        const now = new Date();
        const mapped = json.data.map((item: AuditSchedule) => ({
          ...item,
          status: resolveScheduleStatus(item, now),
        }));
        this.cachedSchedules = mapped;
        if (typeof window !== "undefined") {
          localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(mapped));
        }
        return mapped;
      }
      return [];
    } catch (err) {
      console.warn("Backend API offline or unreachable, using cache:", err);
      return this.cachedSchedules || [];
    }
  },

  async getByIdAsync(id: string): Promise<AuditSchedule | undefined> {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/schedules/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn("Backend API offline:", err);
    }
    return this.getById(id);
  },

  async createAsync(data: Omit<AuditSchedule, "id">): Promise<AuditSchedule> {
    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/schedules`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error("Tidak dapat terhubung ke server backend untuk membuat jadwal.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal membuat jadwal di server (HTTP ${res.status})`);
    }

    const created = json.data;
    this.create(created);
    return created;
  },

  async createBatchAsync(items: Array<Omit<AuditSchedule, "id">>): Promise<AuditSchedule[]> {
    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/schedules`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ items }),
      });
    } catch {
      throw new Error("Tidak dapat terhubung ke server backend untuk membuat jadwal.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal membuat jadwal batch di server (HTTP ${res.status})`);
    }

    const createdList = Array.isArray(json.data) ? json.data : [json.data];
    this.createBatch(createdList);
    return createdList;
  },

  async updateAsync(id: string, data: Partial<AuditSchedule>): Promise<AuditSchedule> {
    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/schedules/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
    } catch {
      throw new Error("Tidak dapat terhubung ke server backend untuk memperbarui jadwal.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal memperbarui jadwal di server (HTTP ${res.status})`);
    }

    this.update(id, json.data);
    return json.data;
  },

  async deleteAsync(id: string, permanent: boolean = false): Promise<boolean> {
    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/schedules/${id}${permanent ? "?permanent=true" : ""}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch {
      throw new Error("Tidak dapat terhubung ke server backend untuk menghapus jadwal.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal menghapus jadwal di server (HTTP ${res.status})`);
    }

    this.delete(id);
    return true;
  },

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
            const expired = isSoftDeletedExpired(item.deletedAt ?? undefined, item.date, now);
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
        if (Array.isArray(parsed)) {
          list = parsed;
        } else {
          list = [];
        }
      } else {
        list = [];
      }

      const { yearMonth: currentYearMonth } = getWibDateParts(now);
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
            (d: string) => normalizeDayToken(d)
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

      // Bersihkan baris placeholder/test lama jika ada (misal 'Semua Toko' atau 'N Toko Terpilih')
      const cleanedList = updated.filter(
        (item) => item.storeName !== "Semua Toko" && !item.storeName.includes("Toko Terpilih")
      );

      if (cleanedList.length !== updated.length) {
        changed = true;
      }

      if (changed || !data) {
        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(cleanedList));
      }

      // Sembunyikan item yang sudah di-soft delete setelah 15 hari
      return cleanedList.filter((item) => {
        if (item.status === "Dibatalkan") {
          const expired = isSoftDeletedExpired(item.deletedAt ?? undefined, item.date, now);
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
      id: `sch-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: data.createdAt || getWibDateParts(new Date()).dateStr,
    };
    const updated = [newSchedule, ...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    }
    return newSchedule;
  },

  createBatch(items: Array<Omit<AuditSchedule, "id">>): AuditSchedule[] {
    const list = this.getAll();
    const now = Date.now();
    const wibTodayStr = getWibDateParts(new Date()).dateStr;
    const newSchedules: AuditSchedule[] = items.map((data, idx) => ({
      ...data,
      id: `sch-${now}-${idx}-${Math.floor(Math.random() * 10000)}`,
      createdAt: data.createdAt || wibTodayStr,
    }));
    const updated = [...newSchedules, ...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(updated));
    }
    return newSchedules;
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
    const active = list.filter((s) => s.status === "Terjadwal" || s.status === "Sedang Berjalan" || s.status === "Selesai").length;
    const inactive = list.filter((s) => s.status === "Dibatalkan").length;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
    const completed = list.filter((s) => s.status === "Selesai").length;
    const scheduled = list.filter((s) => s.status === "Terjadwal" || s.status === "Sedang Berjalan").length;
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

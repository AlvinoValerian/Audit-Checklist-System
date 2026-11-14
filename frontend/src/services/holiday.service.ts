import { Holiday, HolidayStatus } from "@/types/holiday";
import { AuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};

const BACKEND_URL = getBackendUrl();
const HOLIDAY_STORAGE_KEY = "audit_pro_holidays_live_v1";

const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = AuthService.getToken();
  const user = AuthService.getCurrentUser();
  const activeWs = AuthService.getActiveWorkspace();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (activeWs?.id) {
    headers["x-workspace-id"] = activeWs.id;
  } else if (user?.workspaceId) {
    headers["x-workspace-id"] = user.workspaceId;
  }

  return headers;
};

// Helper to get today's date formatted as YYYY-MM-DD
const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

// Helper to auto-update status to "Selesai" if endDate has passed
const applyAutoCompletedStatus = (holidays: Holiday[]): { updated: Holiday[]; hasChanges: boolean } => {
  const todayStr = getTodayStr();
  let hasChanges = false;

  const updated = (holidays || []).map((h) => {
    const end = h.endDate || h.startDate;
    // Auto-update to "Selesai" if current status is "Terjadwal" and deadline/endDate is strictly before today
    if (h.status === "Terjadwal" && end < todayStr) {
      hasChanges = true;
      return { ...h, status: "Selesai" as HolidayStatus };
    }
    return h;
  });

  return { updated, hasChanges };
};

export const HolidayService = {
  cachedHolidays: [] as Holiday[],

  /**
   * Mengambil data libur toko dari Backend PostgreSQL
   */
  async fetchAll(customWorkspaceId?: string): Promise<Holiday[]> {
    try {
      const activeWs = AuthService.getActiveWorkspace();
      const targetWsId = customWorkspaceId || activeWs?.id;

      const params = new URLSearchParams();
      if (targetWsId && targetWsId !== "all") {
        params.append("workspaceId", targetWsId);
      }

      const queryParam = params.toString() ? `?${params.toString()}` : "";
      const headers = getAuthHeaders();
      if (targetWsId) {
        headers["x-workspace-id"] = targetWsId;
      }

      const res = await apiFetch(`${BACKEND_URL}/api/holidays${queryParam}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal memuat data libur toko`);
      }

      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        const { updated } = applyAutoCompletedStatus(json.data);
        HolidayService.cachedHolidays = updated;
        if (typeof window !== "undefined") {
          localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(updated));
        }
        return updated;
      }
      return [];
    } catch (err) {
      console.warn("⚠️ Backend API offline or unreachable, using local cache:", err);
      return HolidayService.getAll();
    }
  },

  /**
   * Mengambil data tersimpan secara lokal (cache sinkronus)
   */
  getAll: (): Holiday[] => {
    if (typeof window === "undefined") {
      return [];
    }

    const stored = localStorage.getItem(HOLIDAY_STORAGE_KEY);
    let list: Holiday[] = [];
    if (stored) {
      try {
        list = JSON.parse(stored);
      } catch {
        list = [];
      }
    }

    const { updated, hasChanges } = applyAutoCompletedStatus(list);
    if (hasChanges) {
      localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(updated));
    }

    HolidayService.cachedHolidays = updated;
    return updated;
  },

  /**
   * Menyimpan 1 entitas libur toko ke Backend PostgreSQL
   */
  async createAsync(data: Omit<Holiday, "id">): Promise<Holiday> {
    const todayStr = getTodayStr();
    const end = data.endDate || data.startDate;
    const computedStatus: HolidayStatus =
      data.status === "Terjadwal" && end < todayStr ? "Selesai" : data.status;

    const payload = {
      ...data,
      status: computedStatus,
    };

    const res = await apiFetch(`${BACKEND_URL}/api/holidays`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `HTTP ${res.status}: Gagal menambahkan libur toko`);
    }

    const json = await res.json();
    const created: Holiday = json.data;

    // Perbarui cache lokal
    const current = HolidayService.getAll();
    current.unshift(created);
    if (typeof window !== "undefined") {
      localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(current));
    }

    return created;
  },

  /**
   * Menyimpan banyak jadwal libur toko sekaligus (batch / satu-satu per toko)
   */
  async createBatchAsync(items: Omit<Holiday, "id">[]): Promise<Holiday[]> {
    if (!items || items.length === 0) return [];

    const todayStr = getTodayStr();
    const payloadItems = items.map((data) => {
      const end = data.endDate || data.startDate;
      const computedStatus: HolidayStatus =
        data.status === "Terjadwal" && end < todayStr ? "Selesai" : data.status;
      return {
        ...data,
        status: computedStatus,
      };
    });

    const res = await apiFetch(`${BACKEND_URL}/api/holidays`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ holidays: payloadItems }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `HTTP ${res.status}: Gagal menyimpan jadwal libur toko`);
    }

    const json = await res.json();
    const createdList: Holiday[] = Array.isArray(json.data) ? json.data : [json.data];

    // Perbarui cache lokal
    const current = HolidayService.getAll();
    current.unshift(...createdList);
    if (typeof window !== "undefined") {
      localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(current));
    }

    return createdList;
  },

  /**
   * Memperbarui jadwal libur toko
   */
  async updateAsync(id: string, data: Partial<Holiday>): Promise<Holiday> {
    const res = await apiFetch(`${BACKEND_URL}/api/holidays/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `HTTP ${res.status}: Gagal memperbarui libur toko`);
    }

    const json = await res.json();
    const updated: Holiday = json.data;

    const current = HolidayService.getAll();
    const idx = current.findIndex((h) => h.id === id);
    if (idx !== -1) {
      current[idx] = updated;
      if (typeof window !== "undefined") {
        localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(current));
      }
    }

    return updated;
  },

  /**
   * Memulihkan libur toko yang dibatalkan
   */
  async restoreAsync(id: string): Promise<Holiday> {
    const res = await apiFetch(`${BACKEND_URL}/api/holidays/${id}/restore`, {
      method: "PATCH",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `HTTP ${res.status}: Gagal memulihkan libur toko`);
    }

    const json = await res.json();
    const restored: Holiday = json.data;

    const current = HolidayService.getAll();
    const idx = current.findIndex((h) => h.id === id);
    if (idx !== -1) {
      current[idx] = restored;
      if (typeof window !== "undefined") {
        localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(current));
      }
    }

    return restored;
  },

  /**
   * Membatalkan / Soft-Delete jadwal libur toko
   */
  async deleteAsync(id: string, permanent: boolean = false): Promise<boolean> {
    const res = await apiFetch(`${BACKEND_URL}/api/holidays/${id}${permanent ? "?permanent=true" : ""}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `HTTP ${res.status}: Gagal menghapus libur toko`);
    }

    const current = HolidayService.getAll();
    if (permanent) {
      const filtered = current.filter((h) => h.id !== id);
      if (typeof window !== "undefined") {
        localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(filtered));
      }
    } else {
      const idx = current.findIndex((h) => h.id === id);
      if (idx !== -1) {
        current[idx].status = "Dibatalkan";
        if (typeof window !== "undefined") {
          localStorage.setItem(HOLIDAY_STORAGE_KEY, JSON.stringify(current));
        }
      }
    }

    return true;
  },

  getStats: (holidays: Holiday[]) => {
    const total = holidays.length;
    const active = holidays.filter((h) => h.status === "Terjadwal").length;
    const cancelled = holidays.filter((h) => h.status === "Dibatalkan").length;

    return {
      total,
      active,
      cancelled,
    };
  },
};

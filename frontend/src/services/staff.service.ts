import { StaffUser, StaffStats, StaffStatus } from "@/types/staff";
import { AuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};

const BACKEND_URL = getBackendUrl();
const STAFF_STORAGE_KEY = "audit_pro_staff_live_v1";

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

export const StaffService = {
  cachedStaffs: [] as StaffUser[],

  /**
   * Mengambil data staf dari backend PostgreSQL
   */
  async fetchAll(customWorkspaceId?: string): Promise<StaffUser[]> {
    try {
      const activeWs = AuthService.getActiveWorkspace();
      const targetWsId = customWorkspaceId || activeWs?.id;

      const params = new URLSearchParams();
      if (targetWsId && targetWsId !== "all") {
        params.append("workspaceId", targetWsId);
      }

      const queryParam = params.toString() ? `?${params.toString()}` : "";
      const res = await apiFetch(`${BACKEND_URL}/api/staff${queryParam}`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal memuat data staf dari backend`);
      }

      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data)) {
        StaffService.cachedStaffs = json.data;
        if (typeof window !== "undefined") {
          localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(json.data));
        }
        return json.data;
      }
      return [];
    } catch (err) {
      console.warn("⚠️ Backend API offline or unreachable, using local cache:", err);
      return StaffService.getAll();
    }
  },

  /**
   * Mengambil data staf dari cache lokal (sinkronus)
   */
  getAll(customWorkspaceId?: string): StaffUser[] {
    let resultList = StaffService.cachedStaffs;

    if (!resultList || resultList.length === 0) {
      if (typeof window !== "undefined") {
        try {
          const data = localStorage.getItem(STAFF_STORAGE_KEY);
          if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              resultList = parsed.map((s: StaffUser) => ({
                ...s,
                status: (s.status === ("Dinonaktifkan" as any) ? "Nonaktif" : s.status) as StaffStatus,
              }));
              StaffService.cachedStaffs = resultList;
            }
          }
        } catch {
          resultList = [];
        }
      }
    }

    if (customWorkspaceId && customWorkspaceId !== "all" && Array.isArray(resultList)) {
      const cleanTarget = customWorkspaceId.replace(/\D/g, "");
      return resultList.filter((s) => !s.workspaceId || s.workspaceId.replace(/\D/g, "") === cleanTarget);
    }

    return resultList || [];
  },

  /**
   * Mengambil detail satu staf berdasarkan ID
   */
  async getByIdAsync(id: string): Promise<StaffUser | null> {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/staff/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn("⚠️ Fallback to local getById:", e);
    }
    return this.getById(id) || null;
  },

  getById(id: string): StaffUser | undefined {
    return this.getAll().find((s) => s.id === id);
  },

  /**
   * Menambahkan staf baru ke backend PostgreSQL
   */
  async createAsync(staff: Omit<StaffUser, "id">): Promise<StaffUser> {
    const activeWs = AuthService.getActiveWorkspace();
    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/staff`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...staff,
          workspaceId: staff.workspaceId || activeWs?.id,
        }),
      });
    } catch (err) {
      console.warn("⚠️ Backend error, falling back to local creation:", err);
      return this.create(staff);
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `HTTP ${res.status}: Gagal menambahkan staf`);
    }

    const json = await res.json();
    const createdStaff: StaffUser = json.data;

    // Update local cache
    const list = this.getAll();
    const updated = [createdStaff, ...list.filter((s) => s.id !== createdStaff.id)];
    StaffService.cachedStaffs = updated;
    if (typeof window !== "undefined") {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(updated));
    }

    return createdStaff;
  },

  create(staff: Omit<StaffUser, "id">): StaffUser {
    const list = this.getAll();
    const newStaff: StaffUser = {
      ...staff,
      id: `staff-${Date.now()}`,
    };
    const updated = [newStaff, ...list];
    StaffService.cachedStaffs = updated;
    if (typeof window !== "undefined") {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(updated));
    }
    return newStaff;
  },

  /**
   * Memperbarui data staf di backend PostgreSQL
   */
  async updateAsync(id: string, data: Partial<StaffUser>): Promise<StaffUser> {
    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/staff/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
    } catch (err) {
      console.warn("⚠️ Backend error, falling back to local update:", err);
      const fallback = this.update(id, data);
      if (!fallback) throw err;
      return fallback;
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.message || `HTTP ${res.status}: Gagal memperbarui staf`);
    }

    const json = await res.json();
    const updatedStaff: StaffUser = json.data;

    // Update cache
    const list = this.getAll();
    const idx = list.findIndex((s) => s.id === id);
    if (idx !== -1) {
      list[idx] = updatedStaff;
    } else {
      list.unshift(updatedStaff);
    }
    StaffService.cachedStaffs = [...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
    }

    return updatedStaff;
  },

  update(id: string, data: Partial<StaffUser>): StaffUser | null {
    const list = this.getAll();
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updatedStaff = { ...list[index], ...data };
    list[index] = updatedStaff;
    StaffService.cachedStaffs = [...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
    }
    return updatedStaff;
  },

  /**
   * Mengaktifkan kembali staf (restore dari soft-delete)
   */
  async restoreAsync(id: string): Promise<StaffUser> {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/staff/${id}/restore`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `HTTP ${res.status}: Gagal memulihkan staf`);
      }

      const json = await res.json();
      const restoredStaff: StaffUser = json.data;

      const list = this.getAll();
      const idx = list.findIndex((s) => s.id === id);
      if (idx !== -1) {
        list[idx] = restoredStaff;
      }
      StaffService.cachedStaffs = [...list];
      if (typeof window !== "undefined") {
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
      }

      return restoredStaff;
    } catch (err) {
      console.warn("⚠️ Backend error on restore, fallback to local:", err);
      const fallback = this.update(id, { status: "Aktif" });
      if (!fallback) throw err;
      return fallback;
    }
  },

  /**
   * Toggle status staf
   */
  async toggleStatusAsync(id: string): Promise<StaffUser> {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/staff/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `HTTP ${res.status}: Gagal mengubah status staf`);
      }

      const json = await res.json();
      const updatedStaff: StaffUser = json.data;

      const list = this.getAll();
      const idx = list.findIndex((s) => s.id === id);
      if (idx !== -1) {
        list[idx] = updatedStaff;
      }
      StaffService.cachedStaffs = [...list];
      if (typeof window !== "undefined") {
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
      }

      return updatedStaff;
    } catch (err) {
      console.warn("⚠️ Backend error on toggle, fallback to local:", err);
      const fallback = this.toggleStatus(id);
      if (!fallback) throw err;
      return fallback;
    }
  },

  toggleStatus(id: string): StaffUser | null {
    const staff = this.getById(id);
    if (!staff) return null;
    const newStatus: StaffStatus =
      staff.status === "Aktif" ? "Nonaktif" : "Aktif";
    return this.update(id, { status: newStatus });
  },

  /**
   * Menghapus (soft delete atau permanen) staf
   */
  async deleteAsync(id: string, permanent: boolean = false): Promise<boolean> {
    try {
      const queryParam = permanent ? "?permanent=true" : "";
      const res = await apiFetch(`${BACKEND_URL}/api/staff/${id}${queryParam}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || `HTTP ${res.status}: Gagal menonaktifkan staf`);
      }

      if (permanent) {
        const list = this.getAll().filter((s) => s.id !== id);
        StaffService.cachedStaffs = list;
        if (typeof window !== "undefined") {
          localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
        }
      } else {
        const list = this.getAll();
        const idx = list.findIndex((s) => s.id === id);
        if (idx !== -1) {
          list[idx] = { ...list[idx], status: "Nonaktif" };
        }
        StaffService.cachedStaffs = [...list];
        if (typeof window !== "undefined") {
          localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(list));
        }
      }

      return true;
    } catch (err) {
      console.warn("⚠️ Backend error on delete, fallback to local:", err);
      if (permanent) {
        return this.delete(id);
      } else {
        return Boolean(this.update(id, { status: "Nonaktif" }));
      }
    }
  },

  delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;
    StaffService.cachedStaffs = filtered;
    if (typeof window !== "undefined") {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  getStats(staffs?: StaffUser[]): StaffStats {
    const list = staffs || this.getAll();
    const total = list.length;
    const active = list.filter((s) => s.status === "Aktif").length;
    const inactive = list.filter((s) => s.status === "Nonaktif").length;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      total,
      active,
      inactive,
      activePercentage,
    };
  },
};

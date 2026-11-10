import { StoreItem, StoreStats, StoreStatus } from "@/types/toko";
import { AuthService } from "@/lib/auth";

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};
const BACKEND_URL = getBackendUrl();
const TOKO_STORAGE_KEY = "audit_pro_toko_data_v3";

/**
 * Helper untuk menyusun headers otentikasi user saat ini
 */
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

  const rawId = user?.rawId || (user?.id ? user.id.replace(/^sa-/, "") : undefined);
  if (rawId && !rawId.startsWith("adm-")) {
    headers["x-super-admin-id"] = rawId;
    headers["x-user-id"] = rawId;
  }
  if (user?.email) {
    headers["x-user-email"] = user.email;
  }
  if (activeWs?.id) {
    headers["x-workspace-id"] = activeWs.id;
  } else if (user?.workspaceId) {
    headers["x-workspace-id"] = user.workspaceId;
  }

  return headers;
};

const inFlightStoreFetches = new Map<string, Promise<StoreItem[]>>();
const lastStoreFetchTimes = new Map<string, number>();

export const TokoService = {
  cachedStores: [] as StoreItem[],

  invalidateCache() {
    lastStoreFetchTimes.clear();
    inFlightStoreFetches.clear();
  },

  /**
   * Mengambil data toko langsung dari backend PostgreSQL
   * Secara otomatis menyaring toko yang berelasi dengan Workspace aktif
   * Dilengkapi in-flight request deduplication & short-lived caching (5 detik)
   */
  async fetchAll(customWorkspaceId?: string, force = false): Promise<StoreItem[]> {
    const user = AuthService.getCurrentUser();
    const activeWs = AuthService.getActiveWorkspace();
    const targetWsId =
      customWorkspaceId ||
      activeWs?.id ||
      (user && user.workspaceId ? user.workspaceId : undefined);

    const cacheKey = targetWsId || "all";
    const now = Date.now();
    const lastFetch = lastStoreFetchTimes.get(cacheKey) || 0;

    if (!force && this.cachedStores.length > 0 && now - lastFetch < 5000) {
      return this.cachedStores;
    }

    if (inFlightStoreFetches.has(cacheKey)) {
      return inFlightStoreFetches.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const params = new URLSearchParams();
        if (targetWsId && targetWsId !== "all") {
          params.append("workspaceId", targetWsId);
        }

        const rawId = user?.rawId || (user?.id ? user.id.replace(/^sa-/, "") : undefined);
        if (rawId && !rawId.startsWith("adm-")) {
          params.append("superAdminId", rawId);
        } else if (user?.email) {
          params.append("email", user.email);
        }

        const queryString = params.toString() ? `?${params.toString()}` : "";
        const res = await fetch(`${BACKEND_URL}/api/stores${queryString}`, {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Gagal memuat toko dari server (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.data)) {
          this.cachedStores = json.data;
          lastStoreFetchTimes.set(cacheKey, Date.now());
          if (typeof window !== "undefined") {
            localStorage.setItem(TOKO_STORAGE_KEY, JSON.stringify(json.data));
          }
          return json.data;
        }

        return [];
      } catch (error) {
        console.warn("Backend API offline or unreachable, using local cache:", error);
        return this.getAll();
      } finally {
        inFlightStoreFetches.delete(cacheKey);
      }
    })();

    inFlightStoreFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  },

  getAll(): StoreItem[] {
    if (this.cachedStores.length > 0) return this.cachedStores;
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(TOKO_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cachedStores = parsed;
          return parsed;
        }
      }
      return [];
    } catch {
      return [];
    }
  },

  async getByIdAsync(id: string): Promise<StoreItem | undefined> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/stores/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn("Failed to fetch store by ID from API:", err);
    }
    return this.getById(id);
  },

  getById(id: string): StoreItem | undefined {
    return this.getAll().find((s) => s.id === id);
  },

  /**
   * Menambahkan toko baru langsung ke database PostgreSQL
   */
  async createAsync(data: Omit<StoreItem, "id">): Promise<StoreItem> {
    const activeWs = AuthService.getActiveWorkspace();
    const user = AuthService.getCurrentUser();
    const targetWsId =
      data.workspaceId ||
      activeWs?.id ||
      (user && user.workspaceId ? user.workspaceId : undefined);

    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/stores`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: data.name,
          city: data.city,
          address: data.address,
          timezone: data.timezone,
          geofenceRadius: data.geofenceRadius,
          latitude: data.latitude,
          longitude: data.longitude,
          description: data.description,
          status: data.status,
          workspaceId: targetWsId,
          workspace: data.workspace || activeWs?.name,
          storePicture: data.storePicture,
        }),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on POST /api/stores:", networkErr);
      throw new Error("Tidak dapat terhubung ke server backend (http://localhost:5000). Pastikan server backend sedang aktif.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal menambahkan toko ke database (HTTP ${res.status})`);
    }

    const createdStore: StoreItem = json.data;
    this.cachedStores = [createdStore, ...this.cachedStores];
    return createdStore;
  },

  /**
   * Memperbarui data toko di database PostgreSQL
   */
  async updateAsync(id: string, data: Partial<StoreItem>): Promise<StoreItem> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/stores/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: data.name,
          city: data.city,
          address: data.address,
          timezone: data.timezone,
          geofenceRadius: data.geofenceRadius,
          latitude: data.latitude,
          longitude: data.longitude,
          description: data.description,
          status: data.status,
          storePicture: data.storePicture,
        }),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on PUT /api/stores:", networkErr);
      throw new Error("Tidak dapat terhubung ke server backend (http://localhost:5000). Pastikan server backend sedang aktif.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal memperbarui data toko di database (HTTP ${res.status})`);
    }

    const updatedStore: StoreItem = json.data;
    this.cachedStores = this.cachedStores.map((s) => (s.id === id ? updatedStore : s));
    return updatedStore;
  },

  /**
   * Menghapus atau me-nonaktifkan toko dari database PostgreSQL
   */
  async deleteAsync(id: string, permanent: boolean = false): Promise<boolean> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/stores/${id}?permanent=${permanent ? "true" : "false"}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on DELETE /api/stores:", networkErr);
      throw new Error("Tidak dapat terhubung ke server backend (http://localhost:5000). Pastikan server backend sedang aktif.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal menghapus toko (HTTP ${res.status})`);
    }

    if (permanent) {
      this.cachedStores = this.cachedStores.filter((s) => s.id !== id);
    } else if (json.data) {
      this.cachedStores = this.cachedStores.map((s) => (s.id === id ? json.data : s));
    }
    return true;
  },

  async toggleStatusAsync(id: string): Promise<StoreItem | null> {
    const store = this.getById(id);
    const newStatus: StoreStatus = store?.status === "Aktif" ? "Nonaktif" : "Aktif";
    return this.updateAsync(id, { status: newStatus });
  },

  getStats(stores?: StoreItem[]): StoreStats {
    const list = stores || this.getAll();
    const total = list.length;
    const active = list.filter((s) => s.status === "Aktif").length;
    const inactive = list.filter((s) => s.status === "Nonaktif" || s.status === "Maintenance").length;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      total,
      active,
      inactive,
      activePercentage,
    };
  },
};

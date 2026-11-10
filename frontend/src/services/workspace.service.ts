import { Workspace, WorkspaceStatsData } from "@/types/workspace";
import { AuthService } from "@/lib/auth";

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};
const BACKEND_URL = getBackendUrl();

/**
 * Helper untuk menyusun headers otentikasi user saat ini
 */
const getAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = AuthService.getToken();
  const user = AuthService.getCurrentUser();

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
  return headers;
};

let inFlightWorkspaceFetch: Promise<Workspace[]> | null = null;
let lastWorkspaceFetchTime = 0;

export const WorkspaceService = {
  cachedWorkspaces: [] as Workspace[],

  /**
   * Mengambil data workspace yang HANYA berelasi dengan akun yang sedang login
   * Dilengkapi in-flight request deduplication & short-lived caching (5 detik)
   */
  async fetchAll(force = false): Promise<Workspace[]> {
    const now = Date.now();
    if (!force && this.cachedWorkspaces.length > 0 && now - lastWorkspaceFetchTime < 5000) {
      return this.cachedWorkspaces;
    }

    if (inFlightWorkspaceFetch) {
      return inFlightWorkspaceFetch;
    }

    inFlightWorkspaceFetch = (async () => {
      try {
        const user = AuthService.getCurrentUser();
        const rawId = user?.rawId || (user?.id ? user.id.replace(/^sa-/, "") : undefined);

        let queryParam = "";
        if (rawId && !rawId.startsWith("adm-")) {
          queryParam = `?superAdminId=${rawId}`;
        } else if (user?.email) {
          queryParam = `?email=${encodeURIComponent(user.email)}`;
        }

        const res = await fetch(`${BACKEND_URL}/api/workspaces${queryParam}`, {
          method: "GET",
          headers: getAuthHeaders(),
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Gagal mengambil data dari server (HTTP ${res.status})`);
        }

        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.data)) {
          this.cachedWorkspaces = json.data;
          lastWorkspaceFetchTime = Date.now();
          return json.data;
        }

        return [];
      } catch (error) {
        console.warn("Backend API offline or unreachable:", error);
        return this.cachedWorkspaces;
      } finally {
        inFlightWorkspaceFetch = null;
      }
    })();

    return inFlightWorkspaceFetch;
  },

  invalidateCache() {
    lastWorkspaceFetchTime = 0;
    inFlightWorkspaceFetch = null;
  },

  getAll(): Workspace[] {
    return this.cachedWorkspaces;
  },

  getById(id: string): Workspace | undefined {
    return this.cachedWorkspaces.find((w) => w.id === id);
  },

  /**
   * Menambahkan workspace baru yang secara otomatis ditautkan ke akun Super Admin yang sedang login
   */
  async createAsync(workspace: Omit<Workspace, "id" | "createdAt">): Promise<Workspace> {
    const user = AuthService.getCurrentUser();
    const rawId = user?.rawId || (user?.id ? user.id.replace(/^sa-/, "") : undefined);

    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/workspaces`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...workspace,
          superAdminId: rawId,
          email: user?.email,
        }),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on POST /api/workspaces:", networkErr);
      throw new Error("Tidak dapat terhubung ke server backend (http://localhost:5000). Pastikan backend sedang berjalan.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal membuat workspace di server (HTTP ${res.status})`);
    }

    this.invalidateCache();
    return json.data;
  },

  async updateAsync(id: string, data: Partial<Workspace>): Promise<Workspace> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/workspaces/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on PUT /api/workspaces:", networkErr);
      throw new Error("Tidak dapat terhubung ke server backend (http://localhost:5000). Pastikan backend sedang berjalan.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal memperbarui workspace di server (HTTP ${res.status})`);
    }

    this.invalidateCache();
    return json.data;
  },

  async deleteAsync(id: string): Promise<boolean> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_URL}/api/workspaces/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on DELETE /api/workspaces:", networkErr);
      throw new Error("Tidak dapat terhubung ke server backend (http://localhost:5000). Pastikan backend sedang berjalan.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal menghapus workspace di server (HTTP ${res.status})`);
    }

    this.invalidateCache();
    return true;
  },

  getStats(workspaces: Workspace[] = []): WorkspaceStatsData {
    return {
      totalWorkspaces: workspaces.length,
      activeWorkspaces: workspaces.filter((w) => w.status === "Aktif").length,
      inactiveWorkspaces: workspaces.filter((w) => w.status === "Nonaktif").length,
      totalStores: workspaces.reduce((acc, curr) => acc + (curr.storeCount || 0), 0),
    };
  },
};

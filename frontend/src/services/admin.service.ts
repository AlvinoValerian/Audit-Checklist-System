import { AdminUser, AdminStatsData } from "@/types/admin";
import { AuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

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

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

export interface AdminListMeta {
  isTeknis?: boolean;
  manualSuperAdminCount?: number;
  maxManualSuperAdmins?: number;
}

export const AdminService = {
  cachedAdmins: [] as AdminUser[],
  lastMeta: null as AdminListMeta | null,

  /**
   * Mengambil data admin dan super admin yang HANYA berelasi dengan akun yang sedang login
   */
  async fetchAll(): Promise<AdminUser[]> {
    try {
      const user = AuthService.getCurrentUser();
      const saRawId = user?.role === "Super Admin"
        ? user.rawId || user.id.replace(/^sa-/, "")
        : undefined;
      let queryParam = "";
      if (saRawId) {
        queryParam = `?superAdminId=${saRawId}`;
      } else if (user?.email) {
        queryParam = `?email=${encodeURIComponent(user.email)}`;
      }

      const res = await apiFetch(`${BACKEND_URL}/api/admins${queryParam}`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.message || `Gagal mengambil data admin dari server (HTTP ${res.status})`);
      }

      if (json.status === "success" && Array.isArray(json.data)) {
        this.cachedAdmins = json.data;
        if (json.meta && typeof json.meta === "object") {
          this.lastMeta = json.meta;
        }
        return json.data;
      }

      return [];
    } catch (error) {
      console.warn("AdminService.fetchAll error:", error);
      return this.cachedAdmins;
    }
  },

  getAll(): AdminUser[] {
    return this.cachedAdmins;
  },

  getById(id: string): AdminUser | undefined {
    return this.cachedAdmins.find((a) => a.id === id);
  },

  /**
   * Menambahkan akun admin baru langsung ke database PostgreSQL
   */
  async createAsync(adminData: {
    fullName: string;
    email: string;
    phone?: string;
    role?: "Admin" | "Super Admin" | "Staff";
    workspaceName?: string;
    workspaceId?: string;
    companyName?: string;
    status?: "Aktif" | "Nonaktif";
    password?: string;
  }): Promise<AdminUser> {
    const user = AuthService.getCurrentUser();
    const saId = user?.role === "Super Admin" ? (user.rawId || user.id.replace(/^sa-/, "")) : undefined;

    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/admins`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...adminData,
          superAdminId: saId,
        }),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on POST /api/admins:", networkErr);
      throw new Error("Tidak dapat terhubung ke server backend. Pastikan backend sedang aktif.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal membuat akun admin di server (HTTP ${res.status})`);
    }

    return json.data;
  },

  /**
   * Memperbarui data akun admin di database PostgreSQL
   */
  async updateAsync(
    id: string,
    updateData: Partial<AdminUser> & { password?: string; workspaceId?: string }
  ): Promise<AdminUser> {
    const user = AuthService.getCurrentUser();
    const saId = user?.role === "Super Admin" ? (user.rawId || user.id.replace(/^sa-/, "")) : undefined;

    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/admins/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...updateData,
          superAdminId: saId,
        }),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on PUT /api/admins:", networkErr);
      throw new Error("Tidak dapat terhubung ke server backend. Pastikan backend sedang aktif.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal memperbarui admin di server (HTTP ${res.status})`);
    }

    return json.data;
  },

  /**
   * Menghapus admin secara permanen dari database PostgreSQL
   */
  async deleteAsync(id: string): Promise<boolean> {
    let res: Response;
    try {
      res = await apiFetch(`${BACKEND_URL}/api/admins/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
    } catch (networkErr: unknown) {
      console.error("Network error on DELETE /api/admins:", networkErr);
      throw new Error("Tidak dapat terhubung ke server backend. Pastikan backend sedang aktif.");
    }

    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== "success") {
      throw new Error(json.message || `Gagal menghapus admin di server (HTTP ${res.status})`);
    }

    return true;
  },

  /**
   * Menghitung statistik berdasarkan data admin riil dari database
   */
  getStats(admins: AdminUser[] = []): AdminStatsData {
    return {
      totalAdmins: admins.length,
      activeAdmins: admins.filter((a) => a.status === "Aktif").length,
      inactiveAdmins: admins.filter((a) => a.status === "Nonaktif").length,
      totalAuditors: admins.filter((a) => a.role === "Staff").length,
    };
  },
};

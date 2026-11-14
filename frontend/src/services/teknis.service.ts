import { TeknisUser, TeknisStats } from "@/types/teknis";
import { AuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

const getApiBase = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "/api";
  return "http://127.0.0.1:5000/api";
};
const LOCAL_STORAGE_KEY = "audit_pro_teknis_users_cache";

export const defaultTeknisUsers: TeknisUser[] = [
  {
    id: "tek-1",
    rawId: "1",
    fullName: "Rian Hidayat, S.Kom",
    email: "rian.teknis@auditcorp.com",
    phone: "081234567890",
    role: "Divisi Teknis",
    specialization: "IT Support & System Administrator",
    status: "Aktif",
    workspaceId: null,
    workspaceName: "Pusat / Semua Workspace",
    createdAt: "12 Okt 2024",
  },
  {
    id: "tek-2",
    rawId: "2",
    fullName: "Fajar Pratama, M.T",
    email: "fajar.pratama@auditcorp.com",
    phone: "082345678901",
    role: "Divisi Teknis",
    specialization: "Network & Infrastructure Engineer",
    status: "Aktif",
    workspaceId: null,
    workspaceName: "Pusat / Semua Workspace",
    createdAt: "20 Okt 2024",
  },
  {
    id: "tek-3",
    rawId: "3",
    fullName: "Bima Kusuma",
    email: "bima.iot@auditcorp.com",
    phone: "083456789012",
    role: "Divisi Teknis",
    specialization: "Hardware & IoT Device Specialist",
    status: "Nonaktif",
    workspaceId: null,
    workspaceName: "Pusat / Semua Workspace",
    createdAt: "28 Okt 2024",
    deletedAt: "2026-11-01",
  },
];

export const TeknisService = {
  getCache(): TeknisUser[] {
    if (typeof window === "undefined") return defaultTeknisUsers;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Gagal membaca cache teknis:", e);
    }
    return defaultTeknisUsers;
  },

  setCache(users: TeknisUser[]): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.warn("Gagal menyimpan cache teknis:", e);
    }
  },

  async fetchAll(workspaceId?: string): Promise<TeknisUser[]> {
    try {
      const token = AuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const base = getApiBase();
      let url = `${base}/teknis`;
      if (workspaceId && workspaceId !== "all") {
        url += `?workspaceId=${encodeURIComponent(workspaceId)}`;
      }

      const res = await apiFetch(url, { headers, cache: "no-store" });

      if (res && res.ok) {
        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.data)) {
          this.setCache(json.data);
          return json.data;
        }
      }
    } catch (err) {
      console.warn("Gagal fetch teknis dari API, fallback ke cache:", err);
    }

    const cached = this.getCache();
    if (workspaceId && workspaceId !== "all") {
      return cached.filter(
        (u) => !u.workspaceId || u.workspaceId === workspaceId
      );
    }
    return cached;
  },

  async createAsync(
    data: Omit<TeknisUser, "id" | "rawId" | "createdAt"> & { password?: string }
  ): Promise<TeknisUser> {
    const token = AuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const base = getApiBase();
    const res = await apiFetch(`${base}/teknis`, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    });

    if (!res || !res.ok) {
      const errJson = await res?.json().catch(() => ({}));
      throw new Error(errJson?.message || "Gagal membuat user teknis.");
    }

    const json = await res.json();
    const newUser: TeknisUser = json.data;

    const current = this.getCache();
    const updated = [newUser, ...current.filter((u) => u.id !== newUser.id)];
    this.setCache(updated);

    return newUser;
  },

  async updateAsync(
    id: string,
    data: Partial<TeknisUser> & { password?: string }
  ): Promise<TeknisUser> {
    const token = AuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const base = getApiBase();
    const res = await apiFetch(`${base}/teknis/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    if (!res || !res.ok) {
      const errJson = await res?.json().catch(() => ({}));
      throw new Error(errJson?.message || "Gagal memperbarui user teknis.");
    }

    const json = await res.json();
    const updatedUser: TeknisUser = json.data;

    const current = this.getCache();
    const updated = current.map((u) => (u.id === id ? updatedUser : u));
    this.setCache(updated);

    return updatedUser;
  },

  async deleteAsync(id: string): Promise<TeknisUser> {
    const token = AuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const base = getApiBase();
    const res = await apiFetch(`${base}/teknis/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    });

    if (!res || !res.ok) {
      const errJson = await res?.json().catch(() => ({}));
      throw new Error(errJson?.message || "Gagal menonaktifkan user teknis.");
    }

    const json = await res.json();
    const deletedUser: TeknisUser = json.data;

    const current = this.getCache();
    const updated = current.map((u) => (u.id === id ? { ...u, status: "Nonaktif" as const, deletedAt: new Date().toISOString().split("T")[0] } : u));
    this.setCache(updated);

    return deletedUser;
  },

  async restoreAsync(id: string): Promise<TeknisUser> {
    const token = AuthService.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const base = getApiBase();
    const res = await apiFetch(`${base}/teknis/${encodeURIComponent(id)}/restore`, {
      method: "PATCH",
      headers,
    });

    if (!res || !res.ok) {
      const errJson = await res?.json().catch(() => ({}));
      throw new Error(errJson?.message || "Gagal mengaktifkan kembali user teknis.");
    }

    const json = await res.json();
    const restoredUser: TeknisUser = json.data;

    const current = this.getCache();
    const updated = current.map((u) => (u.id === id ? { ...u, status: "Aktif" as const, deletedAt: undefined } : u));
    this.setCache(updated);

    return restoredUser;
  },

  getStats(users: TeknisUser[]): TeknisStats {
    const total = users.length;
    const active = users.filter((u) => u.status === "Aktif").length;
    const inactive = users.filter((u) => u.status === "Nonaktif").length;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 100;

    return {
      total,
      active,
      inactive,
      activePercentage,
    };
  },
};

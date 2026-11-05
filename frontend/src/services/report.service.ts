import { AuditReportItem } from "@/types/report";
import { AuthService } from "@/lib/auth";

export interface ReportFilterParams {
  workspaceId?: string;
  storeName?: string;
  scheduleName?: string;
  month?: string;
  status?: string;
  search?: string;
}

export interface ReportMetaOptions {
  stores: string[];
  schedules: string[];
  months: string[];
}

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

  const rawId = user?.rawId || (user?.id ? user.id.replace(/^sa-/, "") : undefined);
  if (rawId && !rawId.startsWith("adm-")) {
    headers["x-super-admin-id"] = rawId;
    headers["x-user-id"] = rawId;
  }
  if (user?.email) {
    headers["x-user-email"] = user.email;
  }
  const activeWs = AuthService.getActiveWorkspace();
  if (activeWs?.id) {
    headers["x-workspace-id"] = activeWs.id;
  }
  return headers;
};

const REPORT_CACHE_KEY = "audit_pro_report_items_cache";

export const ReportService = {
  getAll(): AuditReportItem[] {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(REPORT_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn("Error reading report cache:", e);
      }
    }
    return [];
  },

  async fetchAll(params?: ReportFilterParams): Promise<AuditReportItem[]> {
    try {
      const query = new URLSearchParams();
      if (params?.workspaceId) query.set("workspaceId", params.workspaceId);
      if (params?.storeName && params.storeName !== "Semua Toko") query.set("storeName", params.storeName);
      if (params?.scheduleName && params.scheduleName !== "Semua Jadwal") query.set("scheduleName", params.scheduleName);
      if (params?.month && params.month !== "Semua Bulan" && params.month !== "Bulan Ini") query.set("month", params.month);
      if (params?.status && params.status !== "Semua Status") query.set("status", params.status);
      if (params?.search) query.set("search", params.search);

      const qs = query.toString() ? `?${query.toString()}` : "";
      const url = `${BACKEND_URL}/api/reports${qs}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      const json = await res.json();
      if (json && (json.status === "success" || json.success) && Array.isArray(json.data)) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(REPORT_CACHE_KEY, JSON.stringify(json.data));
          } catch (e) {}
        }
        return json.data;
      }
    } catch (err) {
      console.warn("ReportService.fetchAll failed, falling back to cache:", err);
    }
    return this.getAll();
  },

  async fetchById(id: string): Promise<AuditReportItem | null> {
    try {
      const url = `${BACKEND_URL}/api/reports/${encodeURIComponent(id)}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && (json.status === "success" || json.success) && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn("ReportService.fetchById failed:", err);
    }
    const local = this.getAll().find((r) => r.id === id);
    return local || null;
  },

  async fetchMeta(workspaceId?: string): Promise<ReportMetaOptions> {
    try {
      const query = new URLSearchParams();
      if (workspaceId) query.set("workspaceId", workspaceId);
      const qs = query.toString() ? `?${query.toString()}` : "";
      const url = `${BACKEND_URL}/api/reports/meta${qs}`;
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && (json.status === "success" || json.success) && json.data) {
          return {
            stores: json.data.stores || [],
            schedules: json.data.schedules || [],
            months: json.data.months || [],
          };
        }
      }
    } catch (err) {
      console.warn("ReportService.fetchMeta failed:", err);
    }
    return {
      stores: this.getStores(),
      schedules: this.getSchedules(),
      months: this.getMonths(),
    };
  },

  getStores(): string[] {
    const set = new Set<string>();
    this.getAll().forEach((r) => {
      if (r.storeName) set.add(r.storeName);
    });
    return Array.from(set);
  },

  getSchedules(): string[] {
    const set = new Set<string>();
    this.getAll().forEach((r) => {
      if (r.scheduleName) set.add(r.scheduleName);
    });
    return Array.from(set);
  },

  getMonths(): string[] {
    const set = new Set<string>();
    this.getAll().forEach((r) => {
      if (r.month) set.add(r.month);
    });
    return Array.from(set);
  },
};

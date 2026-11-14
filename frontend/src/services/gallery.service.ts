import { AuditGalleryLog } from "@/types/gallery";
import { AuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

export interface GalleryFilterParams {
  workspaceId?: string;
  storeName?: string;
  storeId?: string;
  status?: string;
  search?: string;
  category?: string;
  onlyIssues?: boolean;
  dateRange?: string;
  page?: number;
  limit?: number;
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

  const activeWs = AuthService.getActiveWorkspace();
  if (activeWs?.id) {
    headers["x-workspace-id"] = activeWs.id;
  } else if (user?.workspaceId) {
    headers["x-workspace-id"] = user.workspaceId;
  }
  return headers;
};

const GALLERY_CACHE_KEY = "audit_pro_gallery_logs_cache";
const inFlightGalleryFetches = new Map<string, Promise<AuditGalleryLog[]>>();

const encodeSvg = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// 100% Bulletproof SVG Fallbacks for broken image links
export const FALLBACK_SVGS = {
  aisle: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <linearGradient id="floorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f8fafc"/>
          <stop offset="100%" stop-color="#e2e8f0"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="#f1f5f9"/>
      <polygon points="0,300 400,300 320,160 80,160" fill="url(#floorGrad)"/>
      <line x1="200" y1="160" x2="200" y2="300" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="6,6"/>
      <polygon points="0,0 80,160 0,300" fill="#e2e8f0"/>
      <polygon points="400,0 320,160 400,300" fill="#e2e8f0"/>
      <rect x="90" y="80" width="220" height="85" fill="#334155" rx="4"/>
      <line x1="90" y1="110" x2="310" y2="110" stroke="#64748b" stroke-width="2"/>
      <line x1="90" y1="138" x2="310" y2="138" stroke="#64748b" stroke-width="2"/>
      <rect x="105" y="88" width="16" height="18" fill="#ef4444" rx="2"/>
      <rect x="127" y="88" width="16" height="18" fill="#f59e0b" rx="2"/>
      <rect x="149" y="88" width="16" height="18" fill="#10b981" rx="2"/>
      <rect x="171" y="88" width="16" height="18" fill="#3b82f6" rx="2"/>
      <rect x="193" y="88" width="16" height="18" fill="#8b5cf6" rx="2"/>
      <rect x="215" y="88" width="16" height="18" fill="#ec4899" rx="2"/>
      <rect x="237" y="88" width="16" height="18" fill="#f97316" rx="2"/>
      <rect x="259" y="88" width="16" height="18" fill="#06b6d4" rx="2"/>
      <rect x="281" y="88" width="16" height="18" fill="#14b8a6" rx="2"/>
      <text x="200" y="270" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#64748b" text-anchor="middle">DISPLAY RAK & LORONG</text>
    </svg>
  `),

  cashier: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="#f8fafc"/>
      <rect x="40" y="120" width="320" height="140" fill="url(#deskGrad)" rx="8"/>
      <rect x="55" y="130" width="290" height="25" fill="#0f172a" rx="4"/>
      <rect x="80" y="55" width="90" height="55" fill="#0f172a" rx="6"/>
      <rect x="85" y="60" width="80" height="45" fill="#0284c7" rx="3"/>
      <text x="125" y="86" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" text-anchor="middle">POS 02</text>
      <rect x="120" y="110" width="15" height="12" fill="#475569"/>
      <rect x="190" y="65" width="50" height="55" fill="#475569" rx="4"/>
      <circle cx="205" cy="75" r="3" fill="#22c55e"/>
      <circle cx="217" cy="75" r="3" fill="#cbd5e1"/>
      <rect x="195" y="85" width="40" height="25" fill="#1e293b" rx="2"/>
      <rect x="255" y="60" width="65" height="60" fill="#94a3b8" rx="4"/>
      <text x="200" y="282" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#475569" text-anchor="middle">AREA MEJA KASIR & POS</text>
    </svg>
  `),

  chiller: encodeSvg(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
      <defs>
        <linearGradient id="chillerBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#f0f9ff"/>
          <stop offset="100%" stop-color="#e0f2fe"/>
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="#f8fafc"/>
      <rect x="70" y="20" width="260" height="255" fill="#1e293b" rx="10"/>
      <rect x="80" y="30" width="240" height="235" fill="url(#chillerBg)" rx="6"/>
      <rect x="80" y="30" width="240" height="20" fill="#0284c7"/>
      <text x="200" y="44" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" fill="#ffffff" text-anchor="middle">BEVERAGES CHILLER</text>
      <line x1="80" y1="95" x2="320" y2="95" stroke="#94a3b8" stroke-width="3"/>
      <line x1="80" y1="150" x2="320" y2="150" stroke="#94a3b8" stroke-width="3"/>
      <line x1="80" y1="205" x2="320" y2="205" stroke="#94a3b8" stroke-width="3"/>
      <text x="200" y="285" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="#0369a1" text-anchor="middle">CHILLER MINUMAN DINGIN</text>
    </svg>
  `),
};

export const GalleryService = {
  getAll(): AuditGalleryLog[] {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(GALLERY_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        }
      } catch (e) {
        console.warn("Error reading gallery cache:", e);
      }
    }
    return [];
  },

  async fetchAll(params?: GalleryFilterParams): Promise<AuditGalleryLog[]> {
    const query = new URLSearchParams();
    if (params?.workspaceId) query.set("workspaceId", params.workspaceId);
    if (params?.storeName && params.storeName !== "Semua Toko") query.set("storeName", params.storeName);
    if (params?.storeId && params.storeId !== "Semua Toko") query.set("storeId", params.storeId);
    if (params?.status && params.status !== "Semua Status") query.set("status", params.status);
    if (params?.search) query.set("search", params.search);
    if (params?.category && params.category !== "Semua Kategori") query.set("category", params.category);
    if (params?.onlyIssues) query.set("onlyIssues", "true");
    if (params?.dateRange && params.dateRange !== "all") query.set("dateRange", params.dateRange);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : "";
    const cacheKey = qs || "all";

    if (inFlightGalleryFetches.has(cacheKey)) {
      return inFlightGalleryFetches.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      try {
        const url = `${BACKEND_URL}/api/gallery${qs}`;
        const res = await apiFetch(url, {
          headers: getAuthHeaders(),
        });

        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }

        const json = await res.json();
        if (json && (json.status === "success" || json.success) && Array.isArray(json.data)) {
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(json.data));
            } catch (e) {}
          }
          return json.data;
        }
      } catch (err) {
        console.warn("GalleryService.fetchAll failed, falling back to cache:", err);
      } finally {
        inFlightGalleryFetches.delete(cacheKey);
      }
      return this.getAll();
    })();

    inFlightGalleryFetches.set(cacheKey, fetchPromise);
    return fetchPromise;
  },

  async fetchStores(workspaceId?: string): Promise<string[]> {
    try {
      const query = new URLSearchParams();
      if (workspaceId) query.set("workspaceId", workspaceId);
      const qs = query.toString() ? `?${query.toString()}` : "";
      const url = `${BACKEND_URL}/api/gallery/stores${qs}`;
      const res = await apiFetch(url, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && (json.status === "success" || json.success) && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn("GalleryService.fetchStores failed:", err);
    }
    return this.getStoresList();
  },

  async fetchStats(workspaceId?: string) {
    try {
      const query = new URLSearchParams();
      if (workspaceId) query.set("workspaceId", workspaceId);
      const qs = query.toString() ? `?${query.toString()}` : "";
      const url = `${BACKEND_URL}/api/gallery/stats${qs}`;
      const res = await apiFetch(url, {
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const json = await res.json();
        if (json && (json.status === "success" || json.success) && json.data) {
          return json.data;
        }
      }
    } catch (err) {
      console.warn("GalleryService.fetchStats failed:", err);
    }
    return this.getStats(this.getAll());
  },

  getFallbackForCategory(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes("kasir") || cat.includes("pos")) {
      return FALLBACK_SVGS.cashier;
    }
    if (cat.includes("chiller") || cat.includes("minuman") || cat.includes("pendingin")) {
      return FALLBACK_SVGS.chiller;
    }
    return FALLBACK_SVGS.aisle;
  },

  getStoresList(): string[] {
    const logs = this.getAll();
    const stores = new Set<string>();
    logs.forEach((log) => {
      if (log.storeName) stores.add(log.storeName);
    });
    return Array.from(stores);
  },

  getStats(logs: AuditGalleryLog[]) {
    const totalLogs = logs.length;
    const issueLogs = logs.filter((l) => l.status === "Issue").length;
    const compliantLogs = logs.filter((l) => l.status === "Semua Sesuai").length;
    let totalPhotos = 0;
    let totalIssues = 0;
    logs.forEach((l) => {
      totalPhotos += (l.photos || []).length;
      totalIssues += l.issueCount || 0;
    });

    return {
      totalLogs,
      issueLogs,
      compliantLogs,
      totalPhotos,
      totalIssues,
    };
  },
};

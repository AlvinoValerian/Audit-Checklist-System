import { TemplateItem, TemplateStats, TemplateStatus } from "@/types/template";
import { AuthService } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};
const BACKEND_URL = getBackendUrl();
const TEMPLATE_STORAGE_KEY = "audit_pro_template_checklist_v1";

const normalizeWsId = (raw?: string | null): string => {
  if (!raw) return "";
  const cleaned = String(raw).trim().replace(/^ws-/, "");
  return cleaned && cleaned.toLowerCase() !== "all" ? cleaned : "";
};

const isMultiWorkspaceRole = (role?: string): boolean => {
  const r = String(role || "").trim().toLowerCase();
  return r === "super admin" || r === "divisi teknis" || r === "teknis";
};

const resolveScopedWorkspaceId = (customWorkspaceId?: string): string => {
  const user = AuthService.getCurrentUser();
  const activeWs = AuthService.getActiveWorkspace();

  // Untuk role non-multi-workspace (Admin / Staff), kunci ketat ke workspace milik akun login
  if (user && !isMultiWorkspaceRole(user.role)) {
    const ownWs = normalizeWsId(user.workspaceId);
    if (ownWs) return ownWs;
  }

  return (
    normalizeWsId(customWorkspaceId) ||
    normalizeWsId(activeWs?.id) ||
    normalizeWsId(user?.workspaceId)
  );
};

const getAuthHeaders = (customWorkspaceId?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = AuthService.getToken();
  const targetWsId = resolveScopedWorkspaceId(customWorkspaceId);

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (targetWsId) {
    headers["x-workspace-id"] = targetWsId;
  }

  return headers;
};

export const defaultTemplates: TemplateItem[] = [
  {
    id: "1",
    title: "Checklist Opening & Kesiapan Operasional Pagi",
    description: "Audit kebersihan area makan, kesiapan kasir, dan suhu chiller sebelum operasional buka",
    category: "Area Kasir & Entrance Depan",
    lastRevision: "19 Sep 2026",
    createdBy: "Sari Melati",
    creatorRole: "Head Auditor",
    status: "Aktif",
    itemsCount: 9,
    items: [
      { id: "chk-1", question: "Apakah mesin POS kasir dan printer struk menyala normal?", category: "Area Kasir & Entrance Depan", required: true, requirePhoto: false },
      { id: "chk-2", question: "Pastikan uang kembalian (modal kasir) sudah dihitung dan siap di laci", category: "Area Kasir & Entrance Depan", required: true, requirePhoto: false },
      { id: "chk-3", question: "Ambil foto area pintu masuk/entrance untuk memastikan banner promo terpasang rapi", category: "Area Kasir & Entrance Depan", required: true, requirePhoto: true },
      { id: "chk-4", question: "Apakah semua meja dan kursi telah dilap bersih bebas noda minyak/saus?", category: "Area Dining Room & Kebersihan Meja", required: true, requirePhoto: false },
      { id: "chk-5", question: "Pastikan lantai area dine-in sudah disapu dan dipel wangi", category: "Area Dining Room & Kebersihan Meja", required: true, requirePhoto: false },
      { id: "chk-6", question: "Ambil foto sudut pandang luas area meja makan sebelum pengunjung masuk", category: "Area Dining Room & Kebersihan Meja", required: true, requirePhoto: true },
      { id: "chk-7", question: "Cek suhu chiller penyimpanan mi dan pangsit (standar 2 - 6 derajat Celcius)", category: "Area Dapur & Chiller Bahan Baku", required: true, requirePhoto: false },
      { id: "chk-8", question: "Ambil foto termometer/indikator display suhu chiller sebagai bukti", category: "Area Dapur & Chiller Bahan Baku", required: true, requirePhoto: true },
      { id: "chk-9", question: "Pastikan minyak goreng pada penggorengan pangsit bersih dan siap digunakan", category: "Area Dapur & Chiller Bahan Baku", required: true, requirePhoto: false },
    ],
    createdAt: "19 Sep 2026",
  },
  {
    id: "2",
    title: "Checklist Quality Control & Kitchen Mid-Day",
    description: "Pengecekan higienitas dapur, stok bahan baku mi/dimsum, dan kebersihan exhaust hood saat jam sibuk",
    category: "Operasional Toko",
    lastRevision: "19 Sep 2026",
    createdBy: "Sari Melati",
    creatorRole: "Head Auditor",
    status: "Aktif",
    itemsCount: 0,
    items: [],
    createdAt: "19 Sep 2026",
  },
  {
    id: "3",
    title: "Checklist Kebersihan Toilet & Wastafel Dine-in",
    description: "Pemeriksaan ketersediaan sabun, kebersihan lantai toilet, dan fungsi kran air pengunjung",
    category: "Operasional Toko",
    lastRevision: "19 Sep 2026",
    createdBy: "Sari Melati",
    creatorRole: "Head Auditor",
    status: "Aktif",
    itemsCount: 0,
    items: [],
    createdAt: "19 Sep 2026",
  },
  {
    id: "4",
    title: "Checklist Closing & Rekonsiliasi Kasir Malam",
    description: "Pemeriksaan pemadaman alat listrik non-esensial, kunci pintu gudang, dan rekonsiliasi setoran kasir",
    category: "Operasional Toko",
    lastRevision: "19 Sep 2026",
    createdBy: "Sari Melati",
    creatorRole: "Head Auditor",
    status: "Aktif",
    itemsCount: 0,
    items: [],
    createdAt: "19 Sep 2026",
  },
];

export const TemplateService = {
  cachedTemplatesByWs: {} as Record<string, TemplateItem[]>,

  getWorkspaceKey(wsId?: string): string {
    return resolveScopedWorkspaceId(wsId);
  },

  getScopedCacheKey(wsId?: string): string {
    const wsKey = this.getWorkspaceKey(wsId);
    if (!wsKey) return "";
    const user = AuthService.getCurrentUser();
    const userKey = user?.id || user?.email || "anon";
    return `${userKey}__${wsKey}`;
  },

  clearCache(): void {
    this.cachedTemplatesByWs = {};
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(TEMPLATE_STORAGE_KEY)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  },

  /**
   * Mengambil data template langsung dari backend PostgreSQL khusus workspace aktif saja
   */
  async fetchAll(customWorkspaceId?: string): Promise<TemplateItem[]> {
    const targetWsId = resolveScopedWorkspaceId(customWorkspaceId);
    const scopedKey = this.getScopedCacheKey(targetWsId);

    // Jika tidak ada workspace valid, jangan pernah meminta data global atau fallback ke workspace lain
    if (!targetWsId || !scopedKey) {
      return [];
    }

    try {
      const params = new URLSearchParams();
      params.append("workspaceId", targetWsId);

      const headers = getAuthHeaders(targetWsId);
      const res = await apiFetch(`${BACKEND_URL}/api/templates?${params.toString()}`, {
        method: "GET",
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          this.cachedTemplatesByWs[scopedKey] = [];
          return [];
        }
        throw new Error(`Gagal fetch template (Status ${res.status})`);
      }

      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        // Filter defensif: pastikan hanya template milik targetWsId yang masuk
        const strictlyScoped: TemplateItem[] = body.data.filter((t: TemplateItem) => {
          const itemWs = normalizeWsId(t.workspaceId);
          return !itemWs || itemWs === targetWsId;
        });

        this.cachedTemplatesByWs[scopedKey] = strictlyScoped;
        const storageKey = `${TEMPLATE_STORAGE_KEY}_${scopedKey}`;
        if (typeof window !== "undefined") {
          localStorage.setItem(storageKey, JSON.stringify(strictlyScoped));
        }
        return strictlyScoped;
      }

      this.cachedTemplatesByWs[scopedKey] = [];
      return [];
    } catch (err) {
      console.warn("⚠️ [TemplateService.fetchAll]: Gagal memuat dari backend:", err);
      return this.getAll(targetWsId);
    }
  },

  getAll(customWorkspaceId?: string): TemplateItem[] {
    const targetWsId = resolveScopedWorkspaceId(customWorkspaceId);
    const scopedKey = this.getScopedCacheKey(targetWsId);

    if (!targetWsId || !scopedKey) {
      return [];
    }

    // 1. Cek memory cache khusus akun + workspace ini
    if (this.cachedTemplatesByWs[scopedKey]) {
      return this.cachedTemplatesByWs[scopedKey];
    }

    if (typeof window === "undefined") {
      return [];
    }

    // 2. Cek localStorage khusus akun + workspace ini (tanpa fallback dummy workspace lain)
    const storageKey = `${TEMPLATE_STORAGE_KEY}_${scopedKey}`;
    try {
      const data = localStorage.getItem(storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const list: TemplateItem[] = parsed
            .filter((t: TemplateItem) => {
              const itemWs = normalizeWsId(t.workspaceId);
              return !itemWs || itemWs === targetWsId;
            })
            .map((t: TemplateItem) => ({
              ...t,
              status: (t.status as string) === "Dinonaktifkan" ? "Nonaktif" : t.status,
            }));
          this.cachedTemplatesByWs[scopedKey] = list;
          return list;
        }
      }
      this.cachedTemplatesByWs[scopedKey] = [];
      return [];
    } catch {
      return [];
    }
  },

  async getByIdAsync(id: string): Promise<TemplateItem | undefined> {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/templates/${id}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          return body.data;
        }
      }
    } catch {
      // fallback
    }
    return this.getById(id);
  },

  getById(id: string): TemplateItem | undefined {
    return this.getAll().find((t) => t.id === id);
  },

  async createAsync(data: Omit<TemplateItem, "id"> & { workspaceId?: string }): Promise<TemplateItem> {
    try {
      const targetWs = resolveScopedWorkspaceId(data.workspaceId);
      const headers = getAuthHeaders(targetWs);

      const res = await apiFetch(`${BACKEND_URL}/api/templates`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...data,
          ...(targetWs ? { workspaceId: targetWs } : {}),
        }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          const newTemplate = body.data;
          const scopedKey = this.getScopedCacheKey(targetWs);
          if (scopedKey) {
            const currentList = this.cachedTemplatesByWs[scopedKey] || this.getAll(targetWs);
            const updatedList = [newTemplate, ...currentList.filter((t) => t.id !== newTemplate.id)];
            this.cachedTemplatesByWs[scopedKey] = updatedList;
            const storageKey = `${TEMPLATE_STORAGE_KEY}_${scopedKey}`;
            if (typeof window !== "undefined") {
              localStorage.setItem(storageKey, JSON.stringify(updatedList));
            }
          }
          return newTemplate;
        }
      }
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Gagal menyimpan template ke server (Status ${res.status})`);
    } catch (err) {
      console.error("❌ [TemplateService.createAsync] Error:", err);
      throw err;
    }
  },

  create(data: Omit<TemplateItem, "id">): TemplateItem {
    // Background async backend sync
    if (typeof window !== "undefined") {
      apiFetch(`${BACKEND_URL}/api/templates`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).catch((e) => console.warn("Background template create error:", e));
    }

    const scopedKey = this.getScopedCacheKey();
    const list = this.getAll();
    const totalCategoryTasks = data.categories
      ? data.categories.reduce((acc, cat) => acc + cat.tasks.length, 0)
      : 0;

    const newTemplate: TemplateItem = {
      ...data,
      id: `tpl-${Date.now()}`,
      lastRevision:
        data.lastRevision ||
        new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      createdAt:
        data.createdAt ||
        new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      itemsCount: data.categories
        ? totalCategoryTasks
        : data.items
        ? data.items.length
        : data.itemsCount || 5,
    };
    const updated = [newTemplate, ...list];
    if (scopedKey) {
      this.cachedTemplatesByWs[scopedKey] = updated;
      if (typeof window !== "undefined") {
        localStorage.setItem(`${TEMPLATE_STORAGE_KEY}_${scopedKey}`, JSON.stringify(updated));
      }
    }
    return newTemplate;
  },

  async updateAsync(id: string, data: Partial<TemplateItem>): Promise<TemplateItem | null> {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/templates/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(data.workspaceId),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          const updatedTemplate: TemplateItem = body.data;
          const scopedKey = this.getScopedCacheKey(updatedTemplate.workspaceId || data.workspaceId);
          if (scopedKey) {
            const currentList = this.getAll(updatedTemplate.workspaceId || data.workspaceId);
            const exists = currentList.some((t: TemplateItem) => t.id === id);
            const updatedList = exists
              ? currentList.map((t: TemplateItem) => (t.id === id ? updatedTemplate : t))
              : [updatedTemplate, ...currentList];
            this.cachedTemplatesByWs[scopedKey] = updatedList;
            if (typeof window !== "undefined") {
              localStorage.setItem(`${TEMPLATE_STORAGE_KEY}_${scopedKey}`, JSON.stringify(updatedList));
            }
          }
          return updatedTemplate;
        }
      }
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Gagal memperbarui template di server (Status ${res.status})`);
    } catch (err) {
      console.error("❌ [TemplateService.updateAsync] Error:", err);
      throw err;
    }
  },

  update(id: string, data: Partial<TemplateItem>): TemplateItem | null {
    // Background async backend sync
    if (typeof window !== "undefined") {
      apiFetch(`${BACKEND_URL}/api/templates/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(data.workspaceId),
        body: JSON.stringify(data),
      }).catch((e) => console.warn("Background template update error:", e));
    }

    const scopedKey = this.getScopedCacheKey(data.workspaceId);
    const list = this.getAll(data.workspaceId);
    const index = list.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const updatedTemplate = {
      ...list[index],
      ...data,
      lastRevision:
        data.lastRevision ||
        new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    };

    if (data.status === "Nonaktif" && !updatedTemplate.archivedDate) {
      updatedTemplate.archivedDate = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } else if (data.status === "Aktif") {
      updatedTemplate.archivedDate = undefined;
    }

    list[index] = updatedTemplate;
    if (scopedKey) {
      this.cachedTemplatesByWs[scopedKey] = list;
      if (typeof window !== "undefined") {
        localStorage.setItem(`${TEMPLATE_STORAGE_KEY}_${scopedKey}`, JSON.stringify(list));
      }
    }
    return updatedTemplate;
  },

  async toggleStatusAsync(id: string, status?: TemplateStatus): Promise<TemplateItem | null> {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/templates/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          const updated: TemplateItem = body.data;
          const scopedKey = this.getScopedCacheKey(updated.workspaceId);
          if (scopedKey) {
            const currentList = this.getAll(updated.workspaceId);
            const updatedList = currentList.map((t: TemplateItem) => (t.id === id ? updated : t));
            this.cachedTemplatesByWs[scopedKey] = updatedList;
            if (typeof window !== "undefined") {
              localStorage.setItem(`${TEMPLATE_STORAGE_KEY}_${scopedKey}`, JSON.stringify(updatedList));
            }
          }
          return updated;
        }
      }
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Gagal mengubah status template (Status ${res.status})`);
    } catch (err) {
      console.error("❌ [TemplateService.toggleStatusAsync] Error:", err);
      throw err;
    }
  },

  async deleteAsync(id: string, permanent = false): Promise<boolean> {
    try {
      const res = await apiFetch(`${BACKEND_URL}/api/templates/${id}${permanent ? "?permanent=true" : ""}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const scopedKey = this.getScopedCacheKey();
        if (scopedKey) {
          const filtered = this.getAll().filter((t) => t.id !== id);
          this.cachedTemplatesByWs[scopedKey] = filtered;
          if (typeof window !== "undefined") {
            localStorage.setItem(`${TEMPLATE_STORAGE_KEY}_${scopedKey}`, JSON.stringify(filtered));
          }
        }
        return true;
      }
    } catch (err) {
      console.warn("⚠️ [TemplateService.deleteAsync] Gagal ke backend:", err);
    }
    return this.delete(id);
  },

  delete(id: string): boolean {
    if (typeof window !== "undefined") {
      apiFetch(`${BACKEND_URL}/api/templates/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      }).catch((e) => console.warn("Background template delete error:", e));
    }

    const scopedKey = this.getScopedCacheKey();
    const list = this.getAll();
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length === list.length) return false;
    if (scopedKey) {
      this.cachedTemplatesByWs[scopedKey] = filtered;
      if (typeof window !== "undefined") {
        localStorage.setItem(`${TEMPLATE_STORAGE_KEY}_${scopedKey}`, JSON.stringify(filtered));
      }
    }
    return true;
  },

  getStats(templates?: TemplateItem[]): TemplateStats {
    const list = templates || this.getAll();
    const total = list.length;
    const active = list.filter((t) => t.status === "Aktif").length;
    const inactive = list.filter((t) => t.status === "Nonaktif").length;
    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;

    return {
      total,
      active,
      inactive,
      activePercentage,
    };
  },
};

import { TemplateItem, TemplateStats, TemplateStatus } from "@/types/template";
import { AuthService } from "@/lib/auth";

const getBackendUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") return "";
  return "http://127.0.0.1:5000";
};
const BACKEND_URL = getBackendUrl();
const TEMPLATE_STORAGE_KEY = "audit_pro_template_checklist_v1";

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
    const activeWs = AuthService.getActiveWorkspace();
    const user = AuthService.getCurrentUser();
    const raw = wsId || activeWs?.id || user?.workspaceId || "1";
    return String(raw).replace(/^ws-/, "");
  },

  /**
   * Mengambil data template langsung dari backend PostgreSQL khusus workspace tertentu
   */
  async fetchAll(customWorkspaceId?: string): Promise<TemplateItem[]> {
    const wsKey = this.getWorkspaceKey(customWorkspaceId);
    try {
      const activeWs = AuthService.getActiveWorkspace();
      const targetWsId = customWorkspaceId || activeWs?.id;

      const params = new URLSearchParams();
      if (targetWsId && targetWsId !== "all") {
        params.append("workspaceId", targetWsId);
      }

      const headers = getAuthHeaders();
      if (targetWsId) {
        headers["x-workspace-id"] = targetWsId;
      }

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${BACKEND_URL}/api/templates${queryString}`, {
        method: "GET",
        headers,
      });

      if (!res.ok) {
        throw new Error(`Gagal fetch template (Status ${res.status})`);
      }

      const body = await res.json();
      if (body.success && Array.isArray(body.data)) {
        this.cachedTemplatesByWs[wsKey] = body.data;
        const cacheKey = `${TEMPLATE_STORAGE_KEY}_${wsKey}`;
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, JSON.stringify(body.data));
        }
        return body.data;
      }
      this.cachedTemplatesByWs[wsKey] = [];
      return [];
    } catch (err) {
      console.warn("⚠️ [TemplateService.fetchAll]: Menggunakan cache lokal:", err);
      return this.getAll(customWorkspaceId);
    }
  },

  getAll(customWorkspaceId?: string): TemplateItem[] {
    const wsKey = this.getWorkspaceKey(customWorkspaceId);
    const cacheKey = `${TEMPLATE_STORAGE_KEY}_${wsKey}`;

    // 1. Cek memory cache khusus workspace ini
    if (this.cachedTemplatesByWs[wsKey]) {
      return this.cachedTemplatesByWs[wsKey];
    }

    if (typeof window === "undefined") {
      return wsKey === "1" ? defaultTemplates : [];
    }

    // 2. Cek localStorage khusus workspace ini
    try {
      const data = localStorage.getItem(cacheKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          const list = parsed.map((t: TemplateItem) => ({
            ...t,
            status: (t.status as string) === "Dinonaktifkan" ? "Nonaktif" : t.status,
          }));
          this.cachedTemplatesByWs[wsKey] = list;
          return list;
        }
      }
      // Hanya Workspace 1 (Mie Gacoan) yang memiliki defaultTemplates jika storage kosong
      if (wsKey === "1") {
        localStorage.setItem(cacheKey, JSON.stringify(defaultTemplates));
        this.cachedTemplatesByWs[wsKey] = defaultTemplates;
        return defaultTemplates;
      }
      this.cachedTemplatesByWs[wsKey] = [];
      return [];
    } catch {
      return wsKey === "1" ? defaultTemplates : [];
    }
  },

  async getByIdAsync(id: string): Promise<TemplateItem | undefined> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/templates/${id}`, {
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
      const activeWs = AuthService.getActiveWorkspace();
      const targetWs = data.workspaceId || activeWs?.id;
      const headers = getAuthHeaders();
      if (targetWs) {
        headers["x-workspace-id"] = targetWs;
      }

      const res = await fetch(`${BACKEND_URL}/api/templates`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          const newTemplate = body.data;
          const wsKey = this.getWorkspaceKey(targetWs);
          const currentList = this.cachedTemplatesByWs[wsKey] || this.getAll(targetWs);
          const updatedList = [newTemplate, ...currentList.filter((t) => t.id !== newTemplate.id)];
          this.cachedTemplatesByWs[wsKey] = updatedList;
          const cacheKey = `${TEMPLATE_STORAGE_KEY}_${wsKey}`;
          if (typeof window !== "undefined") {
            localStorage.setItem(cacheKey, JSON.stringify(updatedList));
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
      fetch(`${BACKEND_URL}/api/templates`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).catch((e) => console.warn("Background template create error:", e));
    }

    const wsKey = this.getWorkspaceKey();
    const cacheKey = `${TEMPLATE_STORAGE_KEY}_${wsKey}`;
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
    this.cachedTemplatesByWs[wsKey] = updated;
    if (typeof window !== "undefined") {
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    }
    return newTemplate;
  },

  async updateAsync(id: string, data: Partial<TemplateItem>): Promise<TemplateItem | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/templates/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          const updatedTemplate: TemplateItem = body.data;
          const wsKey = this.getWorkspaceKey();
          const cacheKey = `${TEMPLATE_STORAGE_KEY}_${wsKey}`;
          const currentList = this.getAll();
          const exists = currentList.some((t: TemplateItem) => t.id === id);
          const updatedList = exists
            ? currentList.map((t: TemplateItem) => (t.id === id ? updatedTemplate : t))
            : [updatedTemplate, ...currentList];
          this.cachedTemplatesByWs[wsKey] = updatedList;
          if (typeof window !== "undefined") {
            localStorage.setItem(cacheKey, JSON.stringify(updatedList));
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
      fetch(`${BACKEND_URL}/api/templates/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }).catch((e) => console.warn("Background template update error:", e));
    }

    const wsKey = this.getWorkspaceKey();
    const cacheKey = `${TEMPLATE_STORAGE_KEY}_${wsKey}`;
    const list = this.getAll();
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
    this.cachedTemplatesByWs[wsKey] = list;
    if (typeof window !== "undefined") {
      localStorage.setItem(cacheKey, JSON.stringify(list));
    }
    return updatedTemplate;
  },

  async toggleStatusAsync(id: string, status?: TemplateStatus): Promise<TemplateItem | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/templates/${id}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          const updated: TemplateItem = body.data;
          const wsKey = this.getWorkspaceKey();
          const cacheKey = `${TEMPLATE_STORAGE_KEY}_${wsKey}`;
          const currentList = this.getAll();
          const updatedList = currentList.map((t: TemplateItem) => (t.id === id ? updated : t));
          this.cachedTemplatesByWs[wsKey] = updatedList;
          if (typeof window !== "undefined") {
            localStorage.setItem(cacheKey, JSON.stringify(updatedList));
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
      const res = await fetch(`${BACKEND_URL}/api/templates/${id}${permanent ? "?permanent=true" : ""}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const wsKey = this.getWorkspaceKey();
        const cacheKey = `${TEMPLATE_STORAGE_KEY}_${wsKey}`;
        const filtered = this.getAll().filter((t) => t.id !== id);
        this.cachedTemplatesByWs[wsKey] = filtered;
        if (typeof window !== "undefined") {
          localStorage.setItem(cacheKey, JSON.stringify(filtered));
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
      fetch(`${BACKEND_URL}/api/templates/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      }).catch((e) => console.warn("Background template delete error:", e));
    }

    const wsKey = this.getWorkspaceKey();
    const cacheKey = `${TEMPLATE_STORAGE_KEY}_${wsKey}`;
    const list = this.getAll();
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length === list.length) return false;
    this.cachedTemplatesByWs[wsKey] = filtered;
    if (typeof window !== "undefined") {
      localStorage.setItem(cacheKey, JSON.stringify(filtered));
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

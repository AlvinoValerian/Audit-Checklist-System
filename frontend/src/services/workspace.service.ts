import { Workspace, WorkspaceStatsData } from "@/types/workspace";

const STORAGE_KEY = "audit_pro_workspaces_data";

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: "ws-1",
    name: "Workspace A",
    companyName: "PT Sumber Retail Sejahtera",
    companyDescription:
      "Klaster gerai ritel & supermarket regional Jabodetabek. Fokus pada audit SOP kasir, stok fresh goods, dan kepatuhan standar kebersihan toko harian.",
    headquartersAddress:
      "Gedung Wisma Niaga Lt. 8, Jl. TB Simatupang No. 18, Jakarta Selatan 12560",
    storeCount: 10,
    description:
      "Klaster gerai ritel & supermarket regional Jabodetabek. Fokus pada audit SOP kasir, stok fresh goods, dan kepatuhan standar kebersihan toko harian.",
    status: "Aktif",
    createdAt: "12 Okt 2023",
    adminEmail: "admin.retail@auditpro.com",
    picName: "Hendra Gunawan",
    picPhone: "+62 812-8899-1023",
    stores: [
      "Toko A-01: Cabang Pondok Indah",
      "Toko A-02: Cabang Kelapa Gading",
      "Toko A-03: Cabang Bintaro Sektor 7",
      "Toko A-04: Cabang Grand Indonesia",
      "Toko A-05: Cabang Senayan City",
      "Toko A-06: Cabang Central Park",
      "Toko A-07: Cabang Mall Kelapa Gading 3",
      "Toko A-08: Cabang Puri Indah",
      "Toko A-09: Cabang Kemang Village",
      "Toko A-10: Cabang Kota Kasablanka",
    ],
  },
  {
    id: "ws-2",
    name: "Workspace B",
    companyName: "PT Express Mart Indonesia",
    companyDescription:
      "Jaringan minimarket ekspres Jawa Timur. Verifikasi kepatuhan transaksi kasir, logistik harian, & shift malam.",
    headquartersAddress:
      "Jl. Basuki Rahmat No. 12, Surabaya, Jawa Timur 60271",
    storeCount: 8,
    description:
      "Jaringan minimarket ekspres Jawa Timur. Verifikasi kepatuhan transaksi kasir, logistik harian, & shift malam.",
    status: "Aktif",
    createdAt: "15 Nov 2023",
    adminEmail: "admin.jatim@auditpro.com",
    picName: "Budi Pratama",
    picPhone: "+62 813-7711-4455",
    stores: [
      "Toko B-01: Cabang Tunjungan Plaza",
      "Toko B-02: Cabang Rungkut Industri",
      "Toko B-03: Cabang Darmo Permai",
      "Toko B-04: Cabang Galaxy Mall",
      "Toko B-05: Cabang Pakuwon Mall",
      "Toko B-06: Cabang Manyar Kertoarjo",
      "Toko B-07: Cabang Kertajaya Indah",
      "Toko B-08: Cabang Ciputra World",
    ],
  },
  {
    id: "ws-3",
    name: "Workspace C",
    companyName: "PT Logistik Distribusi Utama",
    companyDescription:
      "Hub logistik & gudang distribusi area Barat. Status nonaktif sementara untuk tinjauan inventaris & K3.",
    headquartersAddress:
      "Jl. Soekarno Hatta No. 88, Bandung, Jawa Barat 40222",
    storeCount: 5,
    description:
      "Hub logistik & gudang distribusi area Barat. Status nonaktif sementara untuk tinjauan inventaris & K3.",
    status: "Nonaktif",
    createdAt: "01 Jan 2024",
    adminEmail: "admin.logistik@auditpro.com",
    picName: "Siti Rahmawati",
    picPhone: "+62 856-9933-2211",
    stores: [
      "Hub C-01: Gudang Cimahi Sentral",
      "Hub C-02: Distribusi Pasteur Express",
      "Hub C-03: Depo Ujung Berung",
      "Hub C-04: Hub Transit Padalarang",
      "Hub C-05: Gudang Kopo Sayati",
    ],
  },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const WorkspaceService = {
  async fetchAll(): Promise<Workspace[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces`);
      if (!res.ok) throw new Error("Gagal mengambil data dari API");
      const json = await res.json();
      if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json.data));
        }
        return json.data;
      }
      return this.getAll();
    } catch {
      return this.getAll();
    }
  },

  async createAsync(workspace: Omit<Workspace, "id" | "createdAt">): Promise<Workspace> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workspace),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          const list = this.getAll();
          const updated = [json.data, ...list];
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          }
          return json.data;
        }
      }
    } catch {
      // fallback to local create
    }
    return this.create(workspace);
  },

  async updateAsync(id: string, data: Partial<Workspace>): Promise<Workspace | null> {
    try {
      const res = await fetch(`${BACKEND_URL}/api/workspaces/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          return json.data;
        }
      }
    } catch {
      // fallback to local update
    }
    return this.update(id, data);
  },

  getAll(): Workspace[] {
    if (typeof window === "undefined") return INITIAL_WORKSPACES;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const merged = parsed.map((item) => {
            const initial = INITIAL_WORKSPACES.find((init) => init.id === item.id);
            if (initial) {
              return {
                ...initial,
                ...item,
                companyName:
                  item.companyName === "PT Mitra Retail Nusantara"
                    ? initial.companyName
                    : item.companyName || initial.companyName,
                companyDescription:
                  item.companyDescription || initial.companyDescription,
                headquartersAddress:
                  item.headquartersAddress || initial.headquartersAddress,
                adminEmail: item.adminEmail || initial.adminEmail,
                picName: item.picName || initial.picName,
                picPhone: item.picPhone || initial.picPhone,
                stores:
                  item.stores && item.stores.length >= (initial.stores?.length || 0)
                    ? item.stores
                    : initial.stores,
              };
            }
            return item;
          });
          return merged;
        }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_WORKSPACES));
      return INITIAL_WORKSPACES;
    } catch {
      return INITIAL_WORKSPACES;
    }
  },

  getById(id: string): Workspace | undefined {
    const list = this.getAll();
    return list.find((w) => w.id === id);
  },

  create(workspace: Omit<Workspace, "id" | "createdAt">): Workspace {
    const list = this.getAll();
    const newWs: Workspace = {
      ...workspace,
      id: `ws-${Date.now()}`,
      createdAt: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
    const updated = [newWs, ...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    return newWs;
  },

  update(id: string, data: Partial<Workspace>): Workspace | null {
    const list = this.getAll();
    const index = list.findIndex((w) => w.id === id);
    if (index === -1) return null;

    const updatedWs = {
      ...list[index],
      ...data,
      updatedAt: new Date().toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };

    list[index] = updatedWs;
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
    return updatedWs;
  },

  softDelete(id: string): Workspace | null {
    return this.update(id, { status: "Nonaktif" });
  },

  restore(id: string): Workspace | null {
    return this.update(id, { status: "Aktif" });
  },

  delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((w) => w.id !== id);
    if (filtered.length === list.length) return false;

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  getStats(workspaces?: Workspace[]): WorkspaceStatsData {
    const list = workspaces || this.getAll();
    return {
      totalWorkspaces: list.length,
      activeWorkspaces: list.filter((w) => w.status === "Aktif").length,
      inactiveWorkspaces: list.filter((w) => w.status === "Nonaktif").length,
      totalStores: list.reduce((acc, curr) => acc + curr.storeCount, 0),
    };
  },
};

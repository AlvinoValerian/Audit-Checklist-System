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
    ],
  },
];

export const WorkspaceService = {
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
                  item.stores && item.stores.length > 0
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

import { StoreItem, StoreStats, StoreStatus } from "@/types/toko";

const TOKO_STORAGE_KEY = "audit_pro_toko_data_v2";

export const defaultStores: StoreItem[] = [
  {
    id: "toko-1",
    name: "Toko A",
    city: "Jakarta Pusat",
    address: "Jl. M.H. Thamrin No. 28, Kebon Sirih, Menteng, Jakarta Pusat, DKI Jakarta 10350",
    timezone: "WIB (UTC+7)",
    timezoneLabel: "WIB (UTC+7) - Asia/Jakarta",
    geofenceRadius: 100,
    latitude: -6.183418,
    longitude: 106.823456,
    operationalHours: "Setiap hari • 10:00 - 22:00 WIB",
    description: "Gerai utama di lantai ground floor, akses lobi barat. Operasional setiap hari 10:00 - 22:00 WIB.",
    findingsCount: 2,
    status: "Aktif",
    managerName: "Budi Santoso",
    phone: "0812-3456-7890",
    workspace: "Workspace A",
    createdAt: "12 Okt 2023",
  },
  {
    id: "toko-2",
    name: "Toko B",
    city: "Kota Bandung",
    address: "Jl. Ir. H. Juanda No. 126, Dago, Coblong, Kota Bandung, Jawa Barat 40132",
    timezone: "WIB (UTC+7)",
    timezoneLabel: "WIB (UTC+7) - Asia/Jakarta",
    geofenceRadius: 100,
    latitude: -6.886421,
    longitude: 107.615289,
    operationalHours: "Setiap hari • 09:00 - 21:00 WIB",
    description: "Cabang strategis kawasan Dago, memiliki fasilitas parkir luas dan drive-thru.",
    findingsCount: 0,
    status: "Aktif",
    managerName: "Siti Rahmawati",
    phone: "0812-3456-7891",
    workspace: "Workspace A",
    createdAt: "15 Okt 2023",
  },
  {
    id: "toko-3",
    name: "Toko C",
    city: "Kota Surabaya",
    address: "Jl. Tunjungan No. 65, Genteng, Tegalsari, Kota Surabaya, Jawa Timur 60275",
    timezone: "WIB (UTC+7)",
    timezoneLabel: "WIB (UTC+7) - Asia/Jakarta",
    geofenceRadius: 120,
    latitude: -7.257472,
    longitude: 112.737834,
    operationalHours: "Setiap hari • 10:00 - 22:00 WIB",
    description: "Berada di koridor utama pertokoan historis Tunjungan, dekat dengan pusat perbelanjaan.",
    findingsCount: 5,
    status: "Aktif",
    managerName: "Ahmad Fauzi",
    phone: "0812-3456-7892",
    workspace: "Workspace A",
    createdAt: "20 Okt 2023",
  },
  {
    id: "toko-4",
    name: "Toko D",
    city: "Kota Yogyakarta",
    address: "Jl. Malioboro No. 52, Sosromenduran, Gedong Tengen, Kota Yogyakarta, DIY 55271",
    timezone: "WIB (UTC+7)",
    timezoneLabel: "WIB (UTC+7) - Asia/Jakarta",
    geofenceRadius: 100,
    latitude: -7.792589,
    longitude: 110.365982,
    operationalHours: "Setiap hari • 08:00 - 22:00 WIB",
    description: "Outlet sentral kawasan wisata Malioboro, dilengkapi display produk lokal unggulan.",
    findingsCount: 1,
    status: "Aktif",
    managerName: "Dewi Lestari",
    phone: "0812-3456-7893",
    workspace: "Workspace A",
    createdAt: "01 Nov 2023",
  },
  {
    id: "toko-5",
    name: "Toko E",
    city: "Kota Semarang",
    address: "Jl. Pemuda No. 118, Sekayu, Semarang Tengah, Kota Semarang, Jawa Tengah 50132",
    timezone: "WIB (UTC+7)",
    timezoneLabel: "WIB (UTC+7) - Asia/Jakarta",
    geofenceRadius: 100,
    latitude: -6.981829,
    longitude: 110.414981,
    operationalHours: "Setiap hari • 09:00 - 21:00 WIB",
    description: "Lokasi persimpangan CBD kota Semarang, terintegrasi jalur transportasi publik.",
    findingsCount: 0,
    status: "Aktif",
    managerName: "Eko Prasetyo",
    phone: "0812-3456-7894",
    workspace: "Workspace A",
    createdAt: "10 Nov 2023",
  },
  {
    id: "toko-6",
    name: "Toko F",
    city: "Kota Denpasar",
    address: "Jl. Teuku Umar No. 88, Dauh Puri Kauh, Denpasar Barat, Kota Denpasar, Bali 80113",
    timezone: "WITA (UTC+8)",
    timezoneLabel: "WITA (UTC+8) - Asia/Makassar",
    geofenceRadius: 100,
    latitude: -8.675412,
    longitude: 115.207834,
    operationalHours: "Setiap hari • 09:00 - 22:00 WITA",
    description: "Pusat aktivitas bisnis Denpasar Barat, melayani area komersial dan turis domestik.",
    findingsCount: 3,
    status: "Aktif",
    managerName: "Wayan Sudarta",
    phone: "0812-3456-7895",
    workspace: "Workspace A",
    createdAt: "18 Nov 2023",
  },
  {
    id: "toko-7",
    name: "Toko G",
    city: "Kota Makassar",
    address: "Jl. Pantai Losari No. 14, Ujung Pandang, Kota Makassar, Sulawesi Selatan 90111",
    timezone: "WITA (UTC+8)",
    timezoneLabel: "WITA (UTC+8) - Asia/Makassar",
    geofenceRadius: 100,
    latitude: -5.143219,
    longitude: 119.405781,
    operationalHours: "Setiap hari • 10:00 - 23:00 WITA",
    description: "View pesisir pantai Losari, jam operasional panjang melayani pengunjung malam.",
    findingsCount: 0,
    status: "Aktif",
    managerName: "Fajar Nugraha",
    phone: "0812-3456-7896",
    workspace: "Workspace A",
    createdAt: "01 Des 2023",
  },
  {
    id: "toko-8",
    name: "Toko H",
    city: "Balikpapan Kota",
    address: "Jl. Jenderal Sudirman No. 45, Klandasan Ilir, Balikpapan Kota, Kalimantan Timur 76113",
    timezone: "WITA (UTC+8)",
    timezoneLabel: "WITA (UTC+8) - Asia/Makassar",
    geofenceRadius: 100,
    latitude: -1.268712,
    longitude: 116.831201,
    operationalHours: "Setiap hari • 09:00 - 21:00 WITA",
    description: "Kawasan pusat niaga utama Balikpapan dekat dengan pelabuhan dan perkantoran.",
    findingsCount: 2,
    status: "Aktif",
    managerName: "Hendra Setiawan",
    phone: "0812-3456-7897",
    workspace: "Workspace A",
    createdAt: "12 Des 2023",
  },
  {
    id: "toko-9",
    name: "Toko I",
    city: "Kota Medan",
    address: "Jl. Ahmad Yani No. 102, Kesawan, Medan Barat, Kota Medan, Sumatera Utara 20111",
    timezone: "WIB (UTC+7)",
    timezoneLabel: "WIB (UTC+7) - Asia/Jakarta",
    geofenceRadius: 100,
    latitude: 3.590219,
    longitude: 98.679124,
    operationalHours: "Setiap hari • 09:00 - 22:00 WIB",
    description: "Gedung peninggalan bernuansa kolonial modern di kawasan cagar budaya Kesawan.",
    findingsCount: 0,
    status: "Aktif",
    managerName: "Gita Permata",
    phone: "0812-3456-7898",
    workspace: "Workspace A",
    createdAt: "05 Jan 2024",
  },
  {
    id: "toko-10",
    name: "Toko J",
    city: "Kota Manado",
    address: "Jl. Sam Ratulangi No. 70, Wenang Utara, Kota Manado, Sulawesi Utara 95111",
    timezone: "WITA (UTC+8)",
    timezoneLabel: "WITA (UTC+8) - Asia/Makassar",
    geofenceRadius: 100,
    latitude: 1.487129,
    longitude: 124.842109,
    operationalHours: "Setiap hari • 09:00 - 21:00 WITA",
    description: "Jantung komersial kota Manado dengan fasilitas penunjang audit lengkap.",
    findingsCount: 0,
    status: "Aktif",
    managerName: "Indah Kusuma",
    phone: "0812-3456-7899",
    workspace: "Workspace A",
    createdAt: "15 Jan 2024",
  },
];

export const TokoService = {
  getAll(): StoreItem[] {
    if (typeof window === "undefined") return defaultStores;
    try {
      const data = localStorage.getItem(TOKO_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      localStorage.setItem(TOKO_STORAGE_KEY, JSON.stringify(defaultStores));
      return defaultStores;
    } catch {
      return defaultStores;
    }
  },

  getById(id: string): StoreItem | undefined {
    return this.getAll().find((s) => s.id === id);
  },

  create(data: Omit<StoreItem, "id">): StoreItem {
    const list = this.getAll();
    const newStore: StoreItem = {
      ...data,
      id: `toko-${Date.now()}`,
      createdAt: data.createdAt || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    };
    const updated = [newStore, ...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKO_STORAGE_KEY, JSON.stringify(updated));
    }
    return newStore;
  },

  update(id: string, data: Partial<StoreItem>): StoreItem | null {
    const list = this.getAll();
    const index = list.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updatedStore = { ...list[index], ...data };
    list[index] = updatedStore;
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKO_STORAGE_KEY, JSON.stringify(list));
    }
    return updatedStore;
  },

  delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKO_STORAGE_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  toggleStatus(id: string): StoreItem | null {
    const store = this.getById(id);
    if (!store) return null;
    const newStatus: StoreStatus = store.status === "Aktif" ? "Nonaktif" : "Aktif";
    return this.update(id, { status: newStatus });
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

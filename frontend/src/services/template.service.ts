import { TemplateItem, TemplateStats, TemplateStatus } from "@/types/template";

const TEMPLATE_STORAGE_KEY = "audit_pro_template_checklist_v1";

export const defaultTemplates: TemplateItem[] = [
  {
    id: "tpl-1",
    title: "Checklist Operasional Harian Toko Retail",
    description: "Pemeriksaan kesiapan operasional harian gerai toko meliputi kesiapan kasir, display, dan kebersihan toko sebelum jam buka.",
    category: "Operasional Harian",
    lastRevision: "24 Okt 2024",
    createdBy: "Hendra Wijaya",
    creatorRole: "Admin Utama",
    status: "Aktif",
    itemsCount: 15,
    items: [
      { id: "chk-1", question: "Apakah area pintu masuk dan etalase kaca bersih dari debu dan noda?", category: "Kebersihan", required: true },
      { id: "chk-2", question: "Apakah seluruh mesin kasir POS dan printer struk berfungsi normal?", category: "Kasir & Perangkat", required: true },
      { id: "chk-3", question: "Apakah pendingin ruangan (AC) dan penerangan utama berfungsi normal?", category: "Fasilitas", required: true },
      { id: "chk-4", question: "Apakah uang modal kasir telah dihitung dan diverifikasi sesuai ketentuan?", category: "Kasir & Perangkat", required: true },
      { id: "chk-5", question: "Apakah banner promosi terpasang rapi dan masa berlaku valid?", category: "Visual Merchandising", required: false },
    ],
    createdAt: "10 Jan 2024",
  },
  {
    id: "tpl-2",
    title: "Audit Kerapihan & Standar Display Planogram",
    description: "Evaluasi kesesuaian penataan rak gondola, eye level display, label harga, dan kesesuaian layout planogram retail.",
    category: "Visual Merchandising",
    lastRevision: "18 Okt 2024",
    createdBy: "Siti Rahmawati",
    creatorRole: "Super Admin",
    status: "Aktif",
    itemsCount: 18,
    items: [
      { id: "chk-6", question: "Apakah seluruh produk di rak display tertata rapi sesuai panduan planogram?", category: "Display", required: true },
      { id: "chk-7", question: "Apakah label harga (price tag) tersedia dan sesuai dengan harga sistem?", category: "Labeling", required: true },
      { id: "chk-8", question: "Apakah produk fast moving tidak mengalami kekosongan pada rak depan?", category: "Display", required: true },
    ],
    createdAt: "15 Jan 2024",
  },
  {
    id: "tpl-3",
    title: "Checklist Kebersihan & K3 Fasilitas Toko",
    description: "Standar inspeksi kesehatan, kebersihan toilet, area gudang, dan pemenuhan keselamatan kerja (K3).",
    category: "K3 & Kebersihan",
    lastRevision: "12 Okt 2024",
    createdBy: "Budi Santoso",
    creatorRole: "Admin Utama",
    status: "Aktif",
    itemsCount: 12,
    items: [
      { id: "chk-9", question: "Apakah jalur evakuasi dan pintu darurat bebas dari halangan barang?", category: "K3", required: true },
      { id: "chk-10", question: "Apakah kotak P3K terisi lengkap dengan obat-obatan yang masih berlaku?", category: "K3", required: true },
      { id: "chk-11", question: "Apakah tempat sampah terpilah dan dikosongkan secara berkala?", category: "Kebersihan", required: true },
    ],
    createdAt: "01 Feb 2024",
  },
  {
    id: "tpl-4",
    title: "Inspeksi Perangkat POS, Kasir & Mesin EDC",
    description: "Pemeriksaan teknis integritas perangkat keras mesin kasir, scanner barcode, uninterruptible power supply (UPS), dan mesin EDC bank.",
    category: "IT & Peralatan",
    lastRevision: "05 Okt 2024",
    createdBy: "Ahmad Fauzi",
    creatorRole: "Super Admin",
    status: "Aktif",
    itemsCount: 10,
    items: [
      { id: "chk-12", question: "Apakah kabel power dan data mesin kasir terpasang rapi dan aman?", category: "Hardware", required: true },
      { id: "chk-13", question: "Apakah printer thermal mencetak struk dengan jelas tanpa garis putus?", category: "Hardware", required: true },
      { id: "chk-14", question: "Apakah seluruh mesin EDC terkoneksi dengan sinyal stabil?", category: "Jaringan", required: true },
    ],
    createdAt: "10 Feb 2024",
  },
  {
    id: "tpl-5",
    title: "Audit Stok & Inventori Gudang",
    description: "Pemeriksaan berkala kesesuaian fisik stok gudang dengan database ERP serta pencegahan produk kedaluwarsa (FEFO).",
    category: "Inventori",
    lastRevision: "15 Sep 2024",
    archivedDate: "15 Sep 2024",
    createdBy: "Hendra Wijaya",
    creatorRole: "Admin Utama",
    status: "Nonaktif",
    itemsCount: 14,
    items: [
      { id: "chk-15", question: "Apakah susunan karton barang gudang tidak melebihi batas tumpukan maksimal?", category: "Gudang", required: true },
      { id: "chk-16", question: "Apakah kartu stok fisik terisi mutasi terbaru?", category: "Administrasi", required: true },
    ],
    createdAt: "20 Feb 2024",
  },
  {
    id: "tpl-6",
    title: "Audit Keselamatan Kerja & Tabung APAR",
    description: "Inspeksi berkala kondisi fisik, segel tekanan, dan tanggal kadaluarsa tabung pemadam api ringan di seluruh area toko.",
    category: "K3 & Fasilitas",
    lastRevision: "28 Sep 2024",
    createdBy: "Siti Rahmawati",
    creatorRole: "Super Admin",
    status: "Aktif",
    itemsCount: 8,
    items: [
      { id: "chk-17", question: "Apakah jarum indikator tekanan APAR berada pada zona hijau?", category: "K3", required: true },
      { id: "chk-18", question: "Apakah petunjuk penggunaan APAR terlihat jelas dan tidak tertutup benda?", category: "K3", required: true },
    ],
    createdAt: "01 Mar 2024",
  },
  {
    id: "tpl-7",
    title: "Checklist Pembukaan & Penutupan Toko (Opening/Closing)",
    description: "Prosedur operasional standar pembukaan rolling door, alarm toko, penguncian brankas, dan pemadaman utilitas saat closing.",
    category: "Operasional Harian",
    lastRevision: "20 Sep 2024",
    createdBy: "Budi Santoso",
    creatorRole: "Admin Utama",
    status: "Aktif",
    itemsCount: 16,
    items: [
      { id: "chk-19", question: "Apakah alarm keamanan dan sensor toko dinonaktifkan dengan kode otoritas yang benar?", category: "Keamanan", required: true },
      { id: "chk-20", question: "Apakah seluruh uang tunai hasil penjualan telah dimasukkan ke brankas utama?", category: "Keuangan", required: true },
    ],
    createdAt: "12 Mar 2024",
  },
  {
    id: "tpl-8",
    title: "Pemeriksaan Standar Layanan Kasir & Grooming Staff",
    description: "Evaluasi keramahan pelayanan, salam pembuka/penutup kasir, kesesuaian seragam, name tag, dan kerapihan staf garda terdepan.",
    category: "Standar Layanan",
    lastRevision: "10 Sep 2024",
    createdBy: "Ahmad Fauzi",
    creatorRole: "Super Admin",
    status: "Aktif",
    itemsCount: 11,
    items: [
      { id: "chk-21", question: "Apakah kasir mengucapkan 5S (Senyum, Salam, Sapa, Sopan, Santun) kepada pelanggan?", category: "Layanan", required: true },
      { id: "chk-22", question: "Apakah staf mengenakan seragam resmi yang rapi, bersih, dan memakai name tag?", category: "Grooming", required: true },
    ],
    createdAt: "22 Mar 2024",
  },
  {
    id: "tpl-9",
    title: "Audit Fasilitas Pendingin & Cold Storage Showcase",
    description: "Monitoring suhu showcase minuman, chiller susu olahan, dan freezer daging beku guna menjaga kesegaran produk.",
    category: "Fasilitas Toko",
    lastRevision: "01 Sep 2024",
    createdBy: "Hendra Wijaya",
    creatorRole: "Admin Utama",
    status: "Aktif",
    itemsCount: 9,
    items: [
      { id: "chk-23", question: "Apakah temperatur chiller showcase berada pada rentang 2°C hingga 6°C?", category: "Pendingin", required: true },
      { id: "chk-24", question: "Apakah freezer daging beku berada pada temperatur minimal -18°C?", category: "Pendingin", required: true },
    ],
    createdAt: "05 Apr 2024",
  },
  {
    id: "tpl-10",
    title: "Checklist Verifikasi Promo, Price Tag & Labeling",
    description: "Pemeriksaan konsistensi diskon promosi berkala, pemasangan wobbler, tent card, dan pembaruan label harga elektronik/kertas.",
    category: "Visual Merchandising",
    lastRevision: "25 Agu 2024",
    createdBy: "Siti Rahmawati",
    creatorRole: "Super Admin",
    status: "Aktif",
    itemsCount: 13,
    items: [
      { id: "chk-25", question: "Apakah seluruh materi promosi katalog aktif telah terpasang di gondola terkait?", category: "Promosi", required: true },
      { id: "chk-26", question: "Apakah tidak ada materi promosi yang telah kedaluwarsa masih terpasang?", category: "Promosi", required: true },
    ],
    createdAt: "18 Apr 2024",
  },
  {
    id: "tpl-11",
    title: "Audit Keamanan CCTV & Pintu Darurat",
    description: "Inspeksi sudut pandang kamera CCTV, rekaman DVR 30 hari terakhir, pencahayaan area rawan, serta akses tangga darurat.",
    category: "Keamanan",
    lastRevision: "15 Agu 2024",
    createdBy: "Budi Santoso",
    creatorRole: "Admin Utama",
    status: "Aktif",
    itemsCount: 8,
    items: [
      { id: "chk-27", question: "Apakah seluruh kamera CCTV aktif dan menghasilkan rekaman visual yang jelas?", category: "Keamanan", required: true },
      { id: "chk-28", question: "Apakah kapasitas hard disk DVR mencukupi rekaman minimal 30 hari ke belakang?", category: "Keamanan", required: true },
    ],
    createdAt: "02 Mei 2024",
  },
  {
    id: "tpl-12",
    title: "Formulir Audit Merchant Partner & Qris Terminal (Arsip)",
    description: "Verifikasi mesin EDC pihak ketiga dan barcode statis QRIS pembayaran non-tunai di meja kasir.",
    category: "Pembayaran & Finansial",
    lastRevision: "01 Agu 2024",
    archivedDate: "01 Agu 2024",
    createdBy: "Ahmad Fauzi",
    creatorRole: "Super Admin",
    status: "Nonaktif",
    itemsCount: 6,
    items: [
      { id: "chk-29", question: "Apakah stiker QRIS terverifikasi resmi tanpa tanda-tanda penempelan stiker palsu?", category: "Keamanan Pembayaran", required: true },
    ],
    createdAt: "15 Mei 2024",
  },
];

export const TemplateService = {
  getAll(): TemplateItem[] {
    if (typeof window === "undefined") return defaultTemplates;
    try {
      const data = localStorage.getItem(TEMPLATE_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: TemplateItem) => ({
            ...t,
            status: (t.status === "Dinonaktifkan" as any) ? "Nonaktif" : t.status,
          }));
        }
      }
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(defaultTemplates));
      return defaultTemplates;
    } catch {
      return defaultTemplates;
    }
  },

  getById(id: string): TemplateItem | undefined {
    return this.getAll().find((t) => t.id === id);
  },

  create(data: Omit<TemplateItem, "id">): TemplateItem {
    const list = this.getAll();
    const totalCategoryTasks = data.categories
      ? data.categories.reduce((acc, cat) => acc + cat.tasks.length, 0)
      : 0;

    const newTemplate: TemplateItem = {
      ...data,
      id: `tpl-${Date.now()}`,
      lastRevision: data.lastRevision || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      createdAt: data.createdAt || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
      itemsCount: data.categories
        ? totalCategoryTasks
        : data.items
        ? data.items.length
        : data.itemsCount || 5,
    };
    const updated = [newTemplate, ...list];
    if (typeof window !== "undefined") {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(updated));
    }
    return newTemplate;
  },

  update(id: string, data: Partial<TemplateItem>): TemplateItem | null {
    const list = this.getAll();
    const index = list.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const updatedTemplate = {
      ...list[index],
      ...data,
      lastRevision: data.lastRevision || new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
    };

    if (data.status === "Nonaktif" && !updatedTemplate.archivedDate) {
      updatedTemplate.archivedDate = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } else if (data.status === "Aktif") {
      updatedTemplate.archivedDate = undefined;
    }

    list[index] = updatedTemplate;
    if (typeof window !== "undefined") {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(list));
    }
    return updatedTemplate;
  },

  delete(id: string): boolean {
    const list = this.getAll();
    const filtered = list.filter((t) => t.id !== id);
    if (filtered.length === list.length) return false;
    if (typeof window !== "undefined") {
      localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(filtered));
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

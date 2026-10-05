import { AuditGalleryLog, AuditPhoto } from "@/types/gallery";

const encodeSvg = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

// 100% Bulletproof SVG Fallbacks
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

// High-resolution retail images
const STORE_IMAGES = {
  aisle1: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=700&auto=format&fit=crop",
  aisle2: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?q=80&w=700&auto=format&fit=crop",
  aisle3: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=700&auto=format&fit=crop",
  shelves1: "https://images.unsplash.com/photo-1534723452862-4c874018d66d?q=80&w=700&auto=format&fit=crop",
  chiller1: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?q=80&w=700&auto=format&fit=crop",
  cashierIssue: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=700&auto=format&fit=crop",
  cashierClean: "https://images.unsplash.com/photo-1584473457406-6240486418e9?q=80&w=700&auto=format&fit=crop",
  aisleIssue: "https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?q=80&w=700&auto=format&fit=crop",
};

export const defaultAuditLogs: AuditGalleryLog[] = [
  {
    id: "log-sudirman-01",
    storeId: "toko-sudirman",
    storeName: "Cabang Sudirman",
    storeLocation: "Jakarta Pusat",
    scheduleTitle: "Checklist Operasional Harian & Kasir (POS Standard)",
    date: "18 Agu 2024",
    dateTimeFull: "18 Agu 2024, 10:30 WIB",
    dateRaw: "2024-08-18",
    workspace: "Workspace A",
    auditor: {
      name: "Budi Santoso",
      role: "Auditor Lapangan",
    },
    validationStatus: "Perlu Tindak Lanjut",
    status: "Issue",
    issueCount: 1,
    photos: [
      {
        id: "sudirman-p1",
        url: STORE_IMAGES.aisle1,
        caption: "Lorong Snack & Makanan Ringan",
        category: "Display & Merchandising",
        checklistQuestion: "Apakah penataan rak display snack rapi sesuai planogram?",
        hasIssue: false,
        description: "Penataan display snack gondola 1 telah sesuai dengan planogram standar pusat. Kebersihan ambalan rak terjaga.",
        timestamp: "18 Agu 2024, 09:15 WIB",
        auditorName: "Budi Santoso",
      },
      {
        id: "sudirman-p2",
        url: STORE_IMAGES.cashierIssue,
        caption: "Meja Kasir 02",
        category: "Area Kasir & POS",
        checklistQuestion: "Apakah area meja kasir bersih dan bebas dari tumpukan barang tidak terpakai?",
        hasIssue: true,
        issueDescription: "Ketidaksesuaian Jadwal & Waktu Foto (EXIF Mismatch): Foto diambil pada tanggal 18 Agu 2024 pukul 14:15 WIB, di luar rentang jendela toleransi jadwal audit yang ditentukan (09:00 - 12:00 WIB). Selain itu, terdapat penumpukan nota transaksi manual di atas meja kasir tanpa validasi supervisor.",
        issueSeverity: "Tinggi",
        timestamp: "18 Agu 2024, 10:30 WIB",
        auditorName: "Budi Santoso",
      },
      {
        id: "sudirman-p3",
        url: STORE_IMAGES.aisle2,
        caption: "Lorong Bumbu Dapur & Minyak",
        category: "Display & Merchandising",
        checklistQuestion: "Apakah harga display terpasang dan menghadap ke depan?",
        hasIssue: false,
        description: "Seluruh label harga elektronik (ESL) aktif dan sinkron dengan harga POS kasir.",
        timestamp: "18 Agu 2024, 09:30 WIB",
        auditorName: "Budi Santoso",
      },
      {
        id: "sudirman-p4",
        url: STORE_IMAGES.aisle3,
        caption: "Lorong Perlengkapan Rumah",
        category: "Display & Merchandising",
        checklistQuestion: "Apakah lorong bebas hambatan untuk troli belanja?",
        hasIssue: false,
        // Foto ini tanpa deskripsi kustom untuk menguji kondisi opsional
        timestamp: "18 Agu 2024, 09:40 WIB",
        auditorName: "Budi Santoso",
      },
      {
        id: "sudirman-p5",
        url: STORE_IMAGES.chiller1,
        caption: "Chiller Minuman Dingin",
        category: "Peralatan & Chiller",
        checklistQuestion: "Apakah suhu chiller minuman sesuai SOP (< 4°C)?",
        hasIssue: false,
        description: "Suhu digital chiller terukur stabil pada 3.2°C, kondensasi normal dan pintu tertutup rapat.",
        timestamp: "18 Agu 2024, 09:50 WIB",
        auditorName: "Budi Santoso",
      },
      {
        id: "sudirman-p6",
        url: STORE_IMAGES.shelves1,
        caption: "Lorong Susu & Sereal",
        category: "Display & Merchandising",
        checklistQuestion: "Apakah produk fast-moving terisi penuh?",
        hasIssue: false,
        timestamp: "18 Agu 2024, 10:02 WIB",
        auditorName: "Budi Santoso",
      },
    ],
  },
  {
    id: "log-thamrin-01",
    storeId: "toko-thamrin",
    storeName: "Cabang Thamrin",
    storeLocation: "Jakarta Pusat",
    scheduleTitle: "Audit Display & Promosi Mingguan",
    date: "19 Agu 2024",
    dateTimeFull: "19 Agu 2024, 14:00 WIB",
    dateRaw: "2024-08-19",
    workspace: "Workspace A",
    auditor: {
      name: "Dewi Lestari",
      role: "Lead QA & Compliance",
    },
    validationStatus: "Terverifikasi Sesuai",
    status: "Semua Sesuai",
    issueCount: 0,
    photos: [
      {
        id: "thamrin-p1",
        url: STORE_IMAGES.aisle3,
        caption: "Display Promo Gondola Depan",
        category: "Display & Merchandising",
        checklistQuestion: "Apakah POP banner promo mingguan terpasang sesuai panduan?",
        hasIssue: false,
        description: "Materi promosi 'Diskon Akhir Pekan' terpasang presisi pada gondola entrance utama.",
        timestamp: "19 Agu 2024, 13:10 WIB",
        auditorName: "Dewi Lestari",
      },
      {
        id: "thamrin-p2",
        url: STORE_IMAGES.aisle2,
        caption: "Lorong Snack & Biskuit",
        category: "Display & Merchandising",
        checklistQuestion: "Apakah penataan rak display rapi dan tidak ada expired date terlewat?",
        hasIssue: false,
        description: "Rotasi produk sistem FEFO berjalan baik, tidak ada item kedaluwarsa.",
        timestamp: "19 Agu 2024, 13:25 WIB",
        auditorName: "Dewi Lestari",
      },
      {
        id: "thamrin-p3",
        url: STORE_IMAGES.cashierClean,
        caption: "Area Front Line Kasir",
        category: "Area Kasir & POS",
        checklistQuestion: "Apakah petugas kasir mengenakan seragam & atribut lengkap?",
        hasIssue: false,
        description: "Kasir bertugas menggunakan seragam rapi, name tag tersemat, dan melayani dengan ramah.",
        timestamp: "19 Agu 2024, 13:40 WIB",
        auditorName: "Dewi Lestari",
      },
      {
        id: "thamrin-p4",
        url: STORE_IMAGES.chiller1,
        caption: "Display Showcase Minuman Segar",
        category: "Peralatan & Chiller",
        checklistQuestion: "Apakah facing botol minuman rapi menghadap depan?",
        hasIssue: false,
        timestamp: "19 Agu 2024, 13:55 WIB",
        auditorName: "Dewi Lestari",
      },
    ],
  },
  {
    id: "log-kemang-01",
    storeId: "toko-kemang",
    storeName: "Cabang Kemang",
    storeLocation: "Jakarta Selatan",
    scheduleTitle: "Audit Sanitasi & Kebersihan Toko",
    date: "20 Agu 2024",
    dateTimeFull: "20 Agu 2024, 15:15 WIB",
    dateRaw: "2024-08-20",
    workspace: "Workspace A",
    auditor: {
      name: "Rian Hendrawan",
      role: "Auditor Wilayah Jakarta Selatan",
    },
    validationStatus: "Perlu Tindak Lanjut",
    status: "Issue",
    issueCount: 2,
    photos: [
      {
        id: "kemang-p1",
        url: STORE_IMAGES.cashierIssue,
        caption: "Area Meja Kasir 01 & 02",
        category: "Area Kasir & POS",
        checklistQuestion: "Apakah area lantai kasir bersih dari noda dan sampah kemasan?",
        hasIssue: true,
        issueDescription: "Ditemukan ceceran cairan minuman dan potongan struk belanja berserakan di kolong meja kasir 1. Tidak dibersihkan saat operasional jam sibuk.",
        issueSeverity: "Tinggi",
        timestamp: "20 Agu 2024, 14:15 WIB",
        auditorName: "Rian Hendrawan",
      },
      {
        id: "kemang-p2",
        url: STORE_IMAGES.aisleIssue,
        caption: "Lorong 3 Produk Pembersih",
        category: "Kebersihan & Sanitasi",
        checklistQuestion: "Apakah tidak ada kemasan produk yang bocor atau rusak di rak?",
        hasIssue: true,
        issueDescription: "Terdapat botol cairan pembersih lantai bocor yang membasahi dasar ambalan rak. Berpotensi licin dan merusak kemasan produk di bawahnya.",
        issueSeverity: "Sedang",
        timestamp: "20 Agu 2024, 14:32 WIB",
        auditorName: "Rian Hendrawan",
      },
      {
        id: "kemang-p3",
        url: STORE_IMAGES.aisle1,
        caption: "Area Rak Sembako",
        category: "Display & Merchandising",
        checklistQuestion: "Apakah lantai lorong bebas dari debu tebal?",
        hasIssue: false,
        description: "Lantai lorong sembako bersih mengkilap, jadwal pembersihan shift pagi terlaksana.",
        timestamp: "20 Agu 2024, 14:48 WIB",
        auditorName: "Rian Hendrawan",
      },
      {
        id: "kemang-p4",
        url: STORE_IMAGES.chiller1,
        caption: "Chiller Dairy & Yoghurt",
        category: "Peralatan & Chiller",
        checklistQuestion: "Apakah pembuangan kondensasi chiller tidak menggenang di lantai?",
        hasIssue: false,
        timestamp: "20 Agu 2024, 15:05 WIB",
        auditorName: "Rian Hendrawan",
      },
    ],
  },
  {
    id: "log-senayan-01",
    storeId: "toko-senayan",
    storeName: "Cabang Senayan",
    storeLocation: "Jakarta Pusat",
    scheduleTitle: "Audit Stok & Keamanan Toko",
    date: "21 Agu 2024",
    dateTimeFull: "21 Agu 2024, 17:00 WIB",
    dateRaw: "2024-08-21",
    workspace: "Workspace A",
    auditor: {
      name: "Siti Nurhaliza",
      role: "Senior Safety & Security Auditor",
    },
    validationStatus: "Terverifikasi Sesuai",
    status: "Semua Sesuai",
    issueCount: 0,
    photos: [
      {
        id: "senayan-p1",
        url: STORE_IMAGES.aisle3,
        caption: "Lorong Display Barang Bernilai Tinggi",
        category: "Display & Merchandising",
        checklistQuestion: "Apakah alarm tag / spider tag terpasang pada item bernilai tinggi?",
        hasIssue: false,
        description: "Seluruh produk kategori premium (susu kaleng, parfum, kosmetik) telah terpasang spider tag aktif.",
        timestamp: "21 Agu 2024, 16:10 WIB",
        auditorName: "Siti Nurhaliza",
      },
      {
        id: "senayan-p2",
        url: STORE_IMAGES.chiller1,
        caption: "Chiller Minuman Ringan",
        category: "Peralatan & Chiller",
        checklistQuestion: "Apakah display chiller rapi dan stock terisi?",
        hasIssue: false,
        timestamp: "21 Agu 2024, 16:25 WIB",
        auditorName: "Siti Nurhaliza",
      },
      {
        id: "senayan-p3",
        url: STORE_IMAGES.cashierClean,
        caption: "Area Kasir & Antrean",
        category: "Area Kasir & POS",
        checklistQuestion: "Apakah kamera CCTV area kasir berfungsi jernih tanpa blindspot?",
        hasIssue: false,
        description: "Hasil feed CCTV channel kasir 1-4 sangat jernih dan mencakup area laci kasir serta antrean.",
        timestamp: "21 Agu 2024, 16:40 WIB",
        auditorName: "Siti Nurhaliza",
      },
      {
        id: "senayan-p4",
        url: STORE_IMAGES.aisle2,
        caption: "Pintu Darurat & APAR Depan",
        category: "Display & Merchandising",
        checklistQuestion: "Apakah akses APAR dan jalur evakuasi tidak tertutup barang?",
        hasIssue: false,
        timestamp: "21 Agu 2024, 16:55 WIB",
        auditorName: "Siti Nurhaliza",
      },
    ],
  },
];

export const GalleryService = {
  getAll(): AuditGalleryLog[] {
    return defaultAuditLogs;
  },

  getFallbackForCategory(category: string): string {
    const cat = category.toLowerCase();
    if (cat.includes("kasir") || cat.includes("pos")) {
      return FALLBACK_SVGS.cashier;
    }
    if (cat.includes("chiller") || cat.includes("minuman")) {
      return FALLBACK_SVGS.chiller;
    }
    return FALLBACK_SVGS.aisle;
  },

  getStoresList(): string[] {
    const stores = new Set<string>();
    defaultAuditLogs.forEach((log) => stores.add(log.storeName));
    return Array.from(stores);
  },

  getStats(logs: AuditGalleryLog[]) {
    const totalLogs = logs.length;
    const issueLogs = logs.filter((l) => l.status === "Issue").length;
    const compliantLogs = logs.filter((l) => l.status === "Semua Sesuai").length;
    let totalPhotos = 0;
    let totalIssues = 0;
    logs.forEach((l) => {
      totalPhotos += l.photos.length;
      totalIssues += l.issueCount;
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

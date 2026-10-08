import { ChatMessage } from "@/types/ai";
import { ReportService } from "./report.service";

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];

export const QUICK_PROMPT_SUGGESTIONS = [
  "Berapa rata-rata skor kepatuhan toko di Jakarta Pusat minggu ini dan apa temuan yang paling sering muncul?",
  "Buatkan draft instruksi korektif untuk Store Manager",
  "Toko mana saja yang memiliki temuan kritis minggu ini?",
  "Bagaimana performa audit Cabang Sudirman?",
  "Analisis kepatuhan APAR & fasilitas keselamatan K3",
  "Ringkas laporan audit kasir dan perangkat POS",
];

export class AIService {
  static getInitialMessages(): ChatMessage[] {
    return [...INITIAL_CHAT_MESSAGES];
  }

  static async generateResponse(userPrompt: string): Promise<ChatMessage> {
    const q = userPrompt.toLowerCase().trim();
    const reports = ReportService.getAll();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes()
    ).padStart(2, "0")}`;

    // 1. Draft Instruksi Korektif
    if (
      q.includes("draft") ||
      q.includes("instruksi korektif") ||
      q.includes("tindakan") ||
      q.includes("capa") ||
      q.includes("memo")
    ) {
      return {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        senderName: "Audit Pro Assistant",
        timestamp: timeStr,
        isDraft: true,
        content: `Tentu, berikut adalah **Draft Memo Instruksi Korektif Resmi (CAPA)** yang telah diformulasikan berdasarkan temuan audit toko:

---

**MEMORANDUM INTERNAL AUDIT OPERASIONAL**
**Nomor**: MEMO/AUD-OPS/XI/2024/048
**Kepada**: Seluruh Store Manager & Area Supervisor Wilayah Jakarta Pusat
**Dari**: Head Auditor / Admin Utama
**Perihal**: Instruksi Tindak Lanjut Perbaikan Temuan Kepatuhan Lapangan
**Toleransi Penyelesaian**: Maksimal 1x24 Jam Kerja

Berdasarkan hasil rekapitulasi audit kepatuhan lapangan periode 1–7 November 2024, seluruh Store Manager diwajibkan melakukan tindakan korektif segera untuk butir-butir temuan berikut:

1. **Kalibrasi Mesin & Grinder Kopi (Prioritas Tinggi)**
   • *Tindakan*: Wajib mengisi checklist kalibrasi harian pada buku logbook pembukaan sebelum pukul 07:00 WIB. Supervisor wajib melakukan cross-check setting grind size dan yield espresso harian.
   • *PIC*: Head Barista & Supervisor Shift Pagi.

2. **Pelabelan FIFO Produk Susu & Sirup (Prioritas Sedang - Food Safety)**
   • *Tindakan*: Pasang kembali stiker label tanggal buka (*open date*) dan tanggal kadaluarsa (*expiry date*) yang tahan air dan terbaca jelas. Segera lakukan retur atau *spoilage recording* untuk bahan baku dengan sisa masa pakai < 2 hari.
   • *PIC*: Inventory Staff & Kasir.

3. **Temperatur Chiller Display (Prioritas Kritis)**
   • *Tindakan*: Lakukan sweeping pembersihan kisi kondensor debu dan catat termometer digital secara berkala setiap 4 jam (rentang wajib 2°C – 6°C). Hubungi vendor maintenance darurat jika suhu pendingin konsisten melampaui +7°C.
   • *PIC*: Store Manager & Teknisi Toko.

*Verifikasi ulang kepatuhan (*surprise follow-up audit*) akan dilaksanakan mulai tanggal 11 November 2024. Toko yang masih ditemukan pelanggaran serupa akan diberikan surat teguran tertulis (SP 1).*`,
        suggestions: [
          "Salin isi draft instruksi korektif ini",
          "Toko mana saja yang memiliki temuan kritis minggu ini?",
          "Bagaimana performa audit Cabang Sudirman?",
        ],
      };
    }

    // 2. Pertanyaan Jakarta Pusat / Skor Kepatuhan
    if (
      q.includes("jakarta pusat") ||
      (q.includes("skor") && q.includes("rata-rata")) ||
      (q.includes("kepatuhan") && q.includes("minggu"))
    ) {
      return {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        senderName: "Audit Pro Assistant",
        timestamp: timeStr,
        content: `Halo Admin Utama! Berdasarkan konsolidasi data dari **14 laporan audit toko di wilayah Jakarta Pusat** selama periode 1–7 November 2024, rata-rata skor kepatuhan toko mencapai **86.4%** (naik +1.8% dibanding minggu lalu dan berada di atas target standar 85%).

Berikut 3 temuan yang paling sering muncul di lapangan:

• **Kalibrasi Mesin & Grinder (8 toko)**: Formulir kalibrasi belum terisi lengkap di logbook pembukaan shift pagi.
• **Pelabelan FIFO (6 toko)**: Label tanggal kadaluarsa pada susu segar dan sirup terlepas atau tidak terbaca dengan jelas.
• **Suhu Chiller Display (5 toko)**: Suhu pendingin tercatat berada di atas toleransi aman (melebihi +7°C).

Apakah Anda ingin dibuatkan draft instruksi korektif atau ringkasan tindakan untuk Store Manager wilayah tersebut?`,
        suggestions: [
          "Buatkan draft instruksi korektif",
          "Toko mana dengan skor terendah di Jakarta Pusat?",
          "Cek status kepatuhan APAR dan jalur darurat",
        ],
      };
    }

    // 3. Toko dengan temuan kritis / skor terendah
    if (
      q.includes("terendah") ||
      q.includes("paling rendah") ||
      q.includes("kritis") ||
      q.includes("masalah terbanyak")
    ) {
      return {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        senderName: "Audit Pro Assistant",
        timestamp: timeStr,
        content: `Berikut adalah peringkat toko dengan catatan temuan audit paling banyak dan skor kepatuhan terendah pada periode aktif:

1. **Cabang Kemang (Jakarta Selatan)**
   • Skor: **78%** | Temuan: **2 butir**
   • Kategori Masalah: Tag harga promo kasir tidak sinkron dan banner promosi entrance kadaluarsa.
   • Status: *Perlu Perbaikan Segera*.

2. **Cabang Dago (Bandung)**
   • Skor: **82%** | Temuan: **2 butir**
   • Kategori Masalah: Suhu showcase chiller 8.2°C dan sertifikasi tabung APAR jatuh tempo November 2024.
   • Status: *Peringatan K3 & Food Safety*.

3. **Cabang Grand Indonesia (Jakarta Pusat)**
   • Skor: **84%** | Temuan: **1 butir**
   • Kategori Masalah: Kabel terminal EDC kasir 2 semrawut dan struk transaksi manual berserakan.
   • Status: *Tindak Lanjut Ringan*.

Rekomendasi: Prioritaskan audit investigatif untuk Cabang Kemang dan Cabang Dago dalam 48 jam ke depan.`,
        suggestions: [
          "Buatkan draft instruksi korektif untuk Cabang Kemang",
          "Cek detail laporan audit Cabang Sudirman",
          "Berapa rata-rata skor kepatuhan toko secara nasional?",
        ],
      };
    }

    // 4. Toko Tertentu (Sudirman, Surabaya, Kemang, dsb.)
    if (q.includes("sudirman")) {
      const sudirmanReport = reports.find((r) => r.storeName.includes("Sudirman"));
      return {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        senderName: "Audit Pro Assistant",
        timestamp: timeStr,
        content: `Berikut ringkasan hasil audit untuk **Cabang Sudirman (Jakarta Pusat)**:

• **Nama Jadwal**: Checklist Operasional Harian & Kasir (POS Standard)
• **Waktu Audit**: 18 Agustus 2024, 11:15 WIB (Valid Geofence 100m)
• **Auditor Pelaksana**: Budi Santoso (Auditor Lapangan)
• **Tingkat Kepatuhan**: **90% (Kategori: Baik)** - 9 Butir Sesuai, 1 Temuan Masalah
• **Rincian Temuan**:
  - *Temuan*: Area meja kasir 2 terdapat penumpukan struk transaksi manual dan kabel terminal mesin EDC semrawut.
  - *Foto Bukti*: Telah terverifikasi dengan timestamp 14:15 WIB.
• **Status Pengesahan**: Telah divalidasi tanda tangan digital resmi dan selfie geolokasi petugas.

Apakah Anda ingin mengunduh laporan PDF Cabang Sudirman atau membuka halaman detail evaluasi?`,
        suggestions: [
          "Buka halaman laporan Cabang Sudirman",
          "Buatkan instruksi perbaikan kasir untuk Cabang Sudirman",
          "Bandingkan dengan Cabang Surabaya Tunjungan",
        ],
      };
    }

    if (q.includes("surabaya") || q.includes("tunjungan")) {
      return {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        senderName: "Audit Pro Assistant",
        timestamp: timeStr,
        content: `Hasil audit operasional untuk **Cabang Surabaya Tunjungan (Kota Surabaya)**:

• **Jadwal Audit**: Checklist Fasilitas & Keamanan Toko
• **Waktu Pelaksanaan**: 15 Juli 2024, 11:20 WIB
• **Auditor**: Ahmad Fauzi
• **Skor Kepatuhan**: **80%** (1 Butir Sesuai, 2 Temuan Masalah)
• **Catatan Temuan**:
  1. Jalur evakuasi pintu belakang sempat terhalang tumpukan kardus barang masuk.
  2. Tabung APAR area gudang belum diperiksa pressure gauge bulanan.

Toko telah menjadwalkan audit verifikasi ulang (*re-audit*) pada minggu berikutnya.`,
        suggestions: [
          "Cek status kepatuhan APAR dan jalur darurat",
          "Berapa rata-rata skor kepatuhan toko di Jakarta Pusat minggu ini?",
        ],
      };
    }

    // 5. APAR, Keselamatan & K3
    if (q.includes("apar") || q.includes("k3") || q.includes("evakuasi") || q.includes("darurat")) {
      return {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        senderName: "Audit Pro Assistant",
        timestamp: timeStr,
        content: `Berikut hasil analisis kepatuhan **K3, Fasilitas Keselamatan & APAR Toko**:

• **Alat Pemadam Api Ringan (APAR)**:
  - Dari 18 toko yang diaudit, **17 toko (94.4%)** tabung APAR berada dalam kondisi prima dengan jarum pressure gauge di zona hijau dan lokasi mudah dijangkau.
  - Terdapat **1 toko** (Cabang Dago Bandung) dengan masa berlaku tabung perlu diisi ulang (*refill*) per November 2024.

• **Pintu & Jalur Evakuasi Darurat**:
  - **17 dari 18 toko (94.4%)** jalur evakuasi bersih dari hambatan kardus dan mekanisme pintu *push-bar* berfungsi baik tanpa gembok internal saat jam buka.
  - Catatan temuan minor di Cabang Surabaya Tunjungan telah diselesaikan dalam 1x24 jam.

• **Instalasi Listrik & Panel MCB**:
  - 100% panel box sirkuit tertutup rapi dan dilengkapi label diagram pembebanan.`,
        suggestions: [
          "Buatkan draft memo pengingat servis APAR berkala",
          "Berapa rata-rata skor kepatuhan toko di Jakarta Pusat minggu ini?",
        ],
      };
    }

    // 6. Kasir / POS
    if (q.includes("kasir") || q.includes("pos") || q.includes("edc") || q.includes("struk")) {
      return {
        id: `ai-${Date.now()}`,
        sender: "assistant",
        senderName: "Audit Pro Assistant",
        timestamp: timeStr,
        content: `Ringkasan evaluasi operasional **Area Kasir & Perangkat POS**:

• **Kerapian Meja Kasir**: 82% toko memenuhi standar 5S/Kerapian. Pelanggaran terbanyak berupa tumpukan nota manual dan kabel EDC yang tidak dimasukkan ke dalam organizer jalur kabel.
• **Perangkat Hardware (EDC, Barcode Scanner, Printer Thermal)**: 98% berfungsi normal. Kecepatan transaksi rata-rata di bawah 45 detik per struk.
• **Ketersediaan Modal Kasir**: Seluruh toko terpantau memiliki cadangan uang pecahan kecil (Rp2.000, Rp5.000, Rp10.000) minimal Rp500.000 di laci kasir saat pembukaan shift.`,
        suggestions: [
          "Tampilkan toko dengan masalah kerapian meja kasir",
          "Buatkan draft instruksi korektif untuk PIC Kasir",
        ],
      };
    }

    // 7. General Fallback
    return {
      id: `ai-${Date.now()}`,
      sender: "assistant",
      senderName: "Audit Pro Assistant",
      timestamp: timeStr,
      content: `Saya telah menganalisis pertanyaan Anda terkait *"${userPrompt}"*.

Berdasarkan basis data audit retail terbaru:
• Total Toko Terdaftar: **18 Toko Aktif** (Jakarta, Surabaya, Bandung, Bali, Medan).
• Rata-rata Kepatuhan Nasional: **88.2%** (Kategori: Baik).
• Tingkat Penyelesaian Checklist Harian: **96.5%**.

Anda dapat menanyakan hal-hal spesifik seperti:
1. *Rata-rata kepatuhan wilayah tertentu (contoh: Jakarta Pusat, Surabaya).*
2. *Daftar temuan kritis atau toko dengan skor terendah.*
3. *Pembuatan draft instruksi korektif (CAPA memo) untuk Store Manager.*
4. *Hasil evaluasi audit spesifik toko (contoh: Cabang Sudirman).*`,
      suggestions: [
        "Berapa rata-rata skor kepatuhan toko di Jakarta Pusat minggu ini dan apa temuan yang paling sering muncul?",
        "Buatkan draft instruksi korektif untuk Store Manager",
        "Toko mana saja yang memiliki temuan kritis minggu ini?",
      ],
    };
  }
}

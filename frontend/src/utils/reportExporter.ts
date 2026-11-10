import { AuditReportItem } from "@/types/report";
import { toast } from "sonner";

/**
 * Lazy loaders untuk library export berat (jsPDF & JSZip)
 * Menghindari beban SSR dan memastikan dependensi browser hanya dimuat saat tombol diklik di sisi client.
 */
async function getJsPDF() {
  const mod = await import("jspdf/dist/jspdf.umd.min.js");
  return mod.jsPDF || (mod as any).default?.jsPDF || (mod as any).default;
}

async function getJSZip() {
  const mod = await import("jszip");
  return (mod as any).default || mod;
}

/**
 * Helper untuk membersihkan teks sel agar aman dimasukkan ke dalam format CSV
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Helper untuk memformat string menjadi nama file yang bersih
 * Mengubah spasi menjadi underscore (_) dan mempertahankan karakter tanda minus (-)
 * Contoh: "Mie Gacoan - Malang Ciliwung" -> "Mie_Gacoan_-_Malang_Ciliwung"
 */
function sanitizeFileNamePart(val: string): string {
  if (!val) return "";
  return val
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");
}

/**
 * Helper untuk dekripsi atau parsing gambar agar siap ditampilkan pada dokumen cetak PDF
 */
async function resolveImageSrc(src?: string): Promise<string> {
  if (!src) return "";
  if (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/")) {
    return src;
  }
  if (src.startsWith("ENC:v1:")) {
    try {
      const { decryptImageData } = await import("@/lib/image-crypto");
      const dec = await decryptImageData(src);
      if (dec && dec !== src) return dec;
    } catch (e) {
      console.warn("Failed to decrypt ENC:v1 image:", e);
    }
  }
  if (src.startsWith("enc:v1:")) {
    try {
      const { CryptoService } = await import("@/lib/crypto");
      const dec = await CryptoService.decryptImage(src);
      if (dec && dec !== src) return dec;
    } catch (e) {
      console.warn("Failed to decrypt enc:v1 image:", e);
    }
  }
  return src;
}

/**
 * Shared CSS styles untuk dokumen cetak A4 berkualitas industri
 * Menggunakan @page margin: 0 untuk meniadakan localhost:3000/laporan bawaan browser
 */
const SHARED_PRINT_STYLES = `
  @page {
    size: A4 portrait;
    margin: 0 !important;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    color: #0f172a;
    background: #ffffff;
    margin: 0 !important;
    padding: 12mm 14mm 14mm 14mm !important;
    font-size: 11px;
    line-height: 1.45;
  }
  .report-sheet {
    width: 100%;
    margin: 0 auto;
    background: #ffffff;
  }
  .page-break-before {
    page-break-before: always !important;
    break-before: page !important;
  }
  .single-report-wrapper {
    margin-bottom: 24px;
  }
  .single-report-wrapper:last-child {
    margin-bottom: 0;
  }

  /* 1. Header Corporate */
  .doc-header {
    border: 1px solid #1e293b;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 12px;
    background: #ffffff;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .header-main {
    background: #0f2937;
    color: #ffffff;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .brand-row {
    display: flex;
    align-items: center;
  }
  .brand-title {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.6px;
    color: #ffffff;
    text-transform: uppercase;
  }
  .brand-subtitle {
    font-size: 9.5px;
    color: #94a3b8;
    margin-top: 2px;
    font-weight: 500;
  }
  .doc-classification {
    text-align: right;
  }
  .confidential-pill {
    display: inline-block;
    background: #be123c;
    color: #ffffff;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.8px;
    padding: 3px 8px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .system-seal {
    font-size: 9px;
    color: #cbd5e1;
    font-weight: 600;
    margin-top: 4px;
    letter-spacing: 0.4px;
  }
  .doc-control-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: #f8fafc;
    border-top: 1px solid #cbd5e1;
  }
  .doc-control-item {
    padding: 7px 12px;
    border-right: 1px solid #e2e8f0;
  }
  .doc-control-item:last-child {
    border-right: none;
  }
  .doc-control-label {
    font-size: 8px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  .doc-control-val {
    font-size: 10.5px;
    font-weight: 700;
    color: #0f172a;
  }

  /* Status Chips */
  .status-chip {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 9.5px;
    font-weight: 800;
    letter-spacing: 0.3px;
  }
  .chip-compliant { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
  .chip-issues { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
  .chip-noncompliant { background: #ffe4e6; color: #be123c; border: 1px solid #fda4af; }

  /* 2. Executive Metrics KPI Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 12px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .metric-card {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: #ffffff;
    padding: 9px 11px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .metric-card.score-card {
    background: linear-gradient(to bottom, #ffffff, #f8fafc);
    border-color: #94a3b8;
  }
  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .metric-label {
    font-size: 8.5px;
    font-weight: 800;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .grade-badge {
    font-size: 9px;
    font-weight: 800;
    padding: 1.5px 6px;
    border-radius: 4px;
  }
  .grade-a { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
  .grade-b { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
  .grade-c { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .grade-d, .grade-f { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

  .metric-value-row {
    display: flex;
    align-items: baseline;
    gap: 2px;
    margin: 2px 0;
  }
  .score-number {
    font-size: 26px;
    font-weight: 900;
    color: #0f172a;
    line-height: 1;
    font-feature-settings: "tnum";
  }
  .score-unit {
    font-size: 13px;
    font-weight: 800;
    color: #64748b;
  }
  .progress-bar-bg {
    height: 6px;
    background: #e2e8f0;
    border-radius: 9999px;
    overflow: hidden;
    margin: 4px 0 6px 0;
  }
  .progress-bar-fill {
    height: 100%;
    border-radius: 9999px;
  }
  .metric-footer {
    font-size: 8.5px;
    color: #64748b;
    line-height: 1.3;
  }

  .metric-main-text {
    font-size: 12px;
    font-weight: 800;
    margin: 4px 0 2px 0;
  }
  .metric-sub-text {
    font-size: 9px;
    color: #64748b;
    margin-bottom: 6px;
    line-height: 1.35;
  }
  .metric-tag-pill {
    font-size: 8.5px;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    align-self: flex-start;
    margin-top: auto;
  }

  .stats-row {
    display: flex;
    justify-content: space-between;
    gap: 4px;
    margin: 4px 0 6px 0;
  }
  .stat-box {
    flex: 1;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 4px 2px;
    text-align: center;
  }
  .stat-number {
    display: block;
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
  }
  .stat-desc {
    font-size: 7.5px;
    color: #64748b;
    font-weight: 600;
  }
  .stat-pass { background: #f0fdf4; border-color: #bbf7d0; }
  .stat-pass .stat-number { color: #15803d; }
  .stat-fail { background: #fef2f2; border-color: #fecaca; }
  .stat-fail .stat-number { color: #b91c1c; }

  .risk-low { color: #166534; }
  .risk-medium { color: #b45309; }
  .risk-high, .risk-critical { color: #be123c; }

  /* 3. Panel Sections */
  .panel-section {
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 12px;
    background: #ffffff;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .panel-header {
    background: #f1f5f9;
    border-bottom: 1px solid #cbd5e1;
    padding: 6px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .panel-title {
    font-size: 9.5px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  /* Info Table */
  .info-table {
    width: 100%;
    border-collapse: collapse;
  }
  .info-table td {
    padding: 6px 12px;
    font-size: 10px;
    border-bottom: 1px solid #e2e8f0;
  }
  .info-table tr:last-child td {
    border-bottom: none;
  }
  .info-label-cell {
    background: #f8fafc;
    color: #64748b;
    font-weight: 700;
    border-right: 1px solid #e2e8f0;
    text-transform: uppercase;
    font-size: 8.5px !important;
    letter-spacing: 0.3px;
  }
  .info-value-cell {
    color: #0f172a;
    border-right: 1px solid #e2e8f0;
  }
  .info-value-cell:last-child {
    border-right: none;
  }
  .badge-valid-gps {
    display: inline-block;
    background: #ecfdf5;
    color: #047857;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 9px;
    border: 1px solid #a7f3d0;
  }

  /* Summary Box */
  .summary-box {
    padding: 10px 14px;
    background: #ffffff;
    border-left: 4px solid #0f2937;
    font-size: 10.5px;
    color: #334155;
    line-height: 1.5;
  }
  .summary-box p {
    margin: 0;
  }

  /* Findings Table */
  .findings-table {
    width: 100%;
    border-collapse: collapse;
    page-break-inside: auto;
  }
  .findings-table thead {
    display: table-header-group;
  }
  .findings-table tfoot {
    display: table-footer-group;
  }
  .findings-table th {
    background: #1e293b;
    color: #ffffff;
    font-size: 8.5px;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    padding: 8px 10px;
    border: 1px solid #1e293b;
    text-align: left;
  }
  .findings-table td {
    padding: 7px 10px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .row-normal {
    background: #ffffff;
  }
  .row-normal:nth-child(even) {
    background: #f8fafc;
  }
  .row-issue {
    background: #fff1f2;
    border-left: 3px solid #e11d48;
  }
  .pill-photo-req {
    display: inline-block;
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
    font-size: 7.5px;
    font-weight: 800;
    padding: 1px 4px;
    border-radius: 3px;
    text-transform: uppercase;
  }
  .pill-has-photo {
    display: inline-block;
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #bfdbfe;
    font-size: 7.5px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 3px;
  }

  /* Kolom Prioritas & Status: Murni Font Tanpa Bubble */
  .priority-high-text {
    font-weight: 700;
    color: #b91c1c;
    font-size: 10px;
  }
  .priority-low-text {
    font-weight: 600;
    color: #475569;
    font-size: 10px;
  }
  .status-text-pass {
    font-weight: 700;
    color: #15803d;
    font-size: 10px;
    white-space: nowrap;
  }
  .status-text-fail {
    font-weight: 800;
    color: #be123c;
    font-size: 10px;
    white-space: nowrap;
  }

  .issue-desc {
    color: #9f1239;
    line-height: 1.4;
  }
  .capa-rec {
    margin-top: 4px;
    padding-top: 4px;
    border-top: 1px dashed #fca5a5;
    color: #1e3a8a;
    font-size: 9.5px;
    line-height: 1.35;
  }
  .pass-desc {
    color: #065f46;
    line-height: 1.35;
  }

  /* Photo Evidence Gallery */
  .photo-evidence-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    padding: 12px;
    background: #f8fafc;
  }
  .photo-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    overflow: hidden;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .photo-wrapper {
    position: relative;
    height: 125px;
    background: #0f172a;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .photo-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .photo-tag {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
    color: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  .photo-ref-badge {
    position: absolute;
    bottom: 6px;
    right: 6px;
    background: rgba(15, 23, 42, 0.85);
    color: #38bdf8;
    border: 1px solid rgba(56, 189, 248, 0.4);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 7.5px;
    font-weight: 800;
    letter-spacing: 0.4px;
  }
  .tag-defect { background: #e11d48; }
  .tag-pass { background: #10b981; }
  .tag-auditor { background: #2563eb; }
  .photo-meta {
    padding: 7px 9px;
    border-top: 1px solid #e2e8f0;
  }
  .photo-title {
    font-size: 9.5px;
    font-weight: 800;
    color: #0f172a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .photo-sub {
    font-size: 8px;
    color: #64748b;
    margin-top: 2px;
  }
  .photo-caption-text {
    font-size: 8px;
    color: #475569;
    font-style: italic;
    margin-top: 3px;
    line-height: 1.3;
  }

  /* Sign-off Sheet (Data Riil Database) */
  .signoff-section {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .signoff-container {
    padding: 12px;
    background: #ffffff;
  }
  .sig-real-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .sig-real-grid.has-selfie {
    grid-template-columns: 1fr 2fr;
  }
  .auditor-selfie-card {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 8px;
    background: #f8fafc;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .auditor-selfie-img {
    width: 80px;
    height: 80px;
    border-radius: 6px;
    object-fit: cover;
    border: 1px solid #cbd5e1;
    margin-bottom: 6px;
  }
  .sig-card-real {
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 10px 14px;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .sig-role-title {
    font-size: 8.5px;
    font-weight: 800;
    color: #475569;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .sig-img-container-real {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 4px 0 8px 0;
    background: #ffffff;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    padding: 4px;
  }
  .sig-img-container-real img {
    max-height: 56px;
    max-width: 160px;
    object-fit: contain;
  }
  .sig-placeholder-real {
    font-size: 9px;
    color: #94a3b8;
    font-style: italic;
    padding: 0 4px;
  }
  .sig-name-real {
    font-size: 11px;
    font-weight: 800;
    color: #0f172a;
    border-top: 1px solid #cbd5e1;
    padding-top: 5px;
  }
  .sig-meta-real {
    font-size: 8.5px;
    color: #64748b;
    margin-top: 2px;
  }
  .sig-status-real {
    display: inline-block;
    margin-top: 6px;
    font-size: 8px;
    font-weight: 700;
    padding: 1.5px 7px;
    border-radius: 4px;
    background: #dcfce7;
    color: #166534;
    align-self: flex-start;
  }
  .declaration-statement {
    margin-top: 10px;
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    font-size: 8.5px;
    color: #475569;
    line-height: 1.45;
    font-style: italic;
  }

  .legal-notice {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 8px 12px;
    font-size: 8px;
    color: #64748b;
    line-height: 1.45;
    text-align: justify;
  }

  @media print {
    body {
      background: #ffffff;
    }
    .no-print {
      display: none !important;
    }
    .page-break-auto {
      page-break-inside: auto;
    }
  }
`;

/**
 * 1. GENERATOR KONTEN CSV STANDAR KORPORAT RESMI PERUSAHAAN (ENTERPRISE STANDARD)
 * Mengikuti standar audit enterprise:
 * - Blok metadata eksekutif (Judul, Workspace, Timestamp penarikan data, Status Kerahasiaan, Agregat KPI).
 * - Kolom baku penamaan formal UPPERCASE standar database korporat.
 * - Skor kepatuhan dan jumlah metrik berupa data numerik murni tanpa simbol % (agar formula Excel =AVERAGE(), =SUM() berfungsi langsung).
 * - Jika status "Tidak Mengerjakan", staf pelaksana dan jabatan dikosongi (-).
 * - Baris ringkasan agregat / total di baris paling bawah.
 * - Encoding UTF-8 BOM (\uFEFF) agar dibuka sempurna di Microsoft Excel (Windows/Mac) & Google Sheets.
 */
export function generateCorporateCsvContent(
  reports: AuditReportItem[],
  workspaceName = "Workspace"
): string {
  if (!reports || reports.length === 0) return "";

  const totalReports = reports.length;
  const compliantCount = reports.filter((r) => r.status === "Sesuai").length;
  const issuesCount = reports.filter((r) => r.status === "Masalah").length;
  const tidakMengerjakanCount = reports.filter((r) => r.status === "Tidak Mengerjakan").length;

  const totalScore = reports.reduce((acc, curr) => acc + (curr.complianceScore || 0), 0);
  const avgScore = totalReports > 0 ? Number((totalScore / totalReports).toFixed(1)) : 0;

  const totalIssues = reports.reduce((acc, curr) => acc + (curr.issueCount || 0), 0);

  let avgGrade = "GRADE A";
  if (avgScore < 60) avgGrade = "GRADE D";
  else if (avgScore < 75) avgGrade = "GRADE C";
  else if (avgScore < 90) avgGrade = "GRADE B";

  const now = new Date();
  const exportTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")} WIB`;

  // 1. Blok Metadata Header Standar Perusahaan
  const metaRows: string[][] = [
    ["LAPORAN REKAPITULASI AUDIT & KEPATUHAN OPERASIONAL GERAI (EXECUTIVE COMPLIANCE REPORT)"],
    ["Unit Bisnis / Workspace", workspaceName],
    ["Tanggal Penarikan Data (Export Timestamp)", exportTimestamp],
    ["Klasifikasi Kerahasiaan Dokumen", "STRICTLY CONFIDENTIAL - INTERNAL USE ONLY"],
    ["Total Gerai dalam Sampel", String(totalReports)],
    ["Rata-rata Skor Kepatuhan", String(avgScore)],
    ["Predikat Mutu Rata-rata", avgGrade],
    ["Total Gerai Memenuhi Standar SOP", String(compliantCount)],
    ["Total Gerai Ditemukan Ketidaksesuaian (Issues)", String(issuesCount)],
    ["Total Gerai Tidak Patuh (Tidak Mengerjakan)", String(tidakMengerjakanCount)],
    ["Total Temuan Defect Terakumulasi", String(totalIssues)],
    ["Integritas Data", "100% Data Resmi Database Sistem Audit Checklist (Tanpa Data Sintetis)"],
    [], // Baris pemisah kosong sebelum tabel
  ];

  // 2. Definisi Kolom Baku Standar Korporat
  const headers = [
    "NO",
    "KODE_LAPORAN",
    "NAMA_GERAI",
    "KOTA_WILAYAH",
    "WORKSPACE",
    "JUDUL_PENUGASAN",
    "PERIODE_BULAN",
    "TANGGAL_PELAKSANAAN",
    "WAKTU_SUBMIT",
    "AUDITOR_PELAKSANA",
    "JABATAN_AUDITOR",
    "STATUS_AUDIT",
    "PREDIKAT_MUTU",
    "SKOR_KEPATUHAN_PERSEN",
    "TOTAL_PARAMETER_DIUJI",
    "BUTIR_SESUAI",
    "TEMUAN_DEFECT",
    "TINGKAT_RISIKO",
    "CATATAN_TEMUAN_AUDITOR",
    "STATUS_VERIFIKASI_DIGITAL",
  ];

  // 3. Transformasi Baris Data
  let sumTotalItems = 0;
  let sumCompliantItems = 0;

  const dataRows: string[][] = reports.map((r, idx) => {
    const isNonComp = r.status === "Tidak Mengerjakan";
    const findings = Array.isArray(r.findings) ? r.findings : [];
    const totalItems = isNonComp ? 0 : (findings.length > 0 ? findings.length : (r.issueCount || 0));
    const issues = isNonComp ? 0 : (findings.length > 0 ? findings.filter((f) => f.hasIssue).length : (r.issueCount || 0));
    const compItems = isNonComp ? 0 : Math.max(0, totalItems - issues);

    sumTotalItems += totalItems;
    sumCompliantItems += compItems;

    // Mutu
    let grade = "GRADE A";
    if (isNonComp) grade = "GRADE F";
    else if (r.complianceScore < 60) grade = "GRADE D";
    else if (r.complianceScore < 75) grade = "GRADE C";
    else if (r.complianceScore < 90) grade = "GRADE B";

    // Risiko
    let risk = "Risiko Rendah";
    if (isNonComp) risk = "Risiko Kritis";
    else if (issues > 0) {
      const hasHigh = findings.some((f) => f.hasIssue && (f.priority === "High" || f.isPhotoRequired));
      risk = hasHigh ? "Risiko Tinggi" : "Risiko Sedang";
    }

    const docNumber = `AUD/RPT/${(r.submitDate || "2026").replace(/[^0-9]/g, "").slice(-4) || "2026"}/${(r.id || "001").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;

    return [
      String(idx + 1),
      docNumber,
      r.storeName || "-",
      r.storeLocation || "-",
      r.workspaceName || workspaceName,
      r.scheduleName || "-",
      r.month || "-",
      r.submitDate || "-",
      r.submitTime || "-",
      isNonComp ? "-" : (r.auditorName && r.auditorName !== "-" ? r.auditorName : "-"),
      isNonComp ? "-" : (r.auditorRole && r.auditorRole !== "-" ? r.auditorRole : "-"),
      r.status === "Sesuai" ? "Sesuai SOP" : r.status === "Masalah" ? "Ada Masalah" : "Tidak Mengerjakan",
      grade,
      String(r.complianceScore ?? 0), // Nilai angka murni tanpa % untuk formula Excel
      String(totalItems),
      String(compItems),
      String(issues),
      risk,
      r.summaryNote || (isNonComp ? "Melewati batas toleransi submit laporan" : "Memenuhi seluruh aspek kepatuhan SOP"),
      isNonComp ? "TIDAK MENYERAHKAN LAPORAN" : "TERVERIFIKASI SISTEM (GPS & TTD)",
    ];
  });

  // 4. Baris Agregat / Total di Bagian Bawah
  const summaryRow: string[] = [
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "TOTAL / RATA-RATA",
    "-",
    `${compliantCount} Sesuai | ${issuesCount} Masalah | ${tidakMengerjakanCount} Tidak Patuh`,
    avgGrade,
    String(avgScore),
    String(sumTotalItems),
    String(sumCompliantItems),
    String(totalIssues),
    "-",
    `Kompilasi rekapitulasi resmi ${totalReports} laporan gerai`,
    "100% DATA RESMI DATABASE",
  ];

  const metaString = metaRows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const headersString = headers.map(escapeCsvCell).join(",");
  const dataString = dataRows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
  const summaryString = summaryRow.map(escapeCsvCell).join(",");

  return (
    "\uFEFF" + // UTF-8 BOM untuk Microsoft Excel & Google Sheets
    metaString +
    "\r\n" +
    headersString +
    "\r\n" +
    dataString +
    "\r\n" +
    summaryString
  );
}

/**
 * 2. EKSPOR SEMUA LAPORAN KE FILE SPREADSHEET CSV STANDAR KORPORAT (.csv)
 */
export function exportReportsToCsv(
  reports: AuditReportItem[],
  workspaceName = "Workspace"
): void {
  if (!reports || reports.length === 0) {
    toast.error("Tidak ada data laporan audit untuk diekspor.");
    return;
  }

  const csvContent = generateCorporateCsvContent(reports, workspaceName);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const cleanWs = sanitizeFileNamePart(workspaceName || "Audit");
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const fileName = `Rekap_Laporan_Audit_Corporate_${cleanWs}_${dateStr}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Berhasil mengunduh rekapitulasi standar korporat (${fileName})`);
}

/**
 * Helper untuk merender satu laporan audit secara lengkap ke dalam format HTML
 */
function renderSingleReportHtml(
  report: AuditReportItem,
  resolvedData: {
    resolvedSignature: string;
    resolvedAuditorPhoto: string;
    resolvedFindings: Array<any>;
  },
  reportIndex = 0
): string {
  const { resolvedSignature, resolvedAuditorPhoto, resolvedFindings } = resolvedData;
  const isNonCompliant = report.status === "Tidak Mengerjakan";

  // Jika Tidak Mengerjakan, staf pelaksana, foto diri, dan tanda tangan dikosongi (-)
  const displayAuditorName = isNonCompliant ? "-" : (report.auditorName && report.auditorName !== "-" ? report.auditorName : "-");
  const displayAuditorRole = isNonCompliant ? "-" : (report.auditorRole && report.auditorRole !== "-" ? report.auditorRole : "-");

  const totalItems = isNonCompliant ? 0 : (resolvedFindings.length > 0 ? resolvedFindings.length : (report.issueCount || 0));
  const issues = resolvedFindings.filter((f) => f.hasIssue);
  const issueCount = isNonCompliant ? 0 : (resolvedFindings.length > 0 ? issues.length : (report.issueCount || 0));
  const compliantCount = isNonCompliant ? 0 : Math.max(0, totalItems - issueCount);
  const issueRate = totalItems > 0 ? Math.round((issueCount / totalItems) * 100) : 0;

  // Grade & Compliance Determination
  let gradeLabel = "GRADE A";
  let gradeClass = "grade-a";
  let scoreBarColor = "#10b981"; // Emerald
  let complianceNote = "Memenuhi 100% parameter evaluasi SOP.";

  if (isNonCompliant) {
    gradeLabel = "GRADE F";
    gradeClass = "grade-f";
    scoreBarColor = "#e11d48"; // Rose
    complianceNote = "Jadwal ditutup otomatis karena melewati batas toleransi keterlambatan.";
  } else if (report.complianceScore < 60) {
    gradeLabel = "GRADE D";
    gradeClass = "grade-d";
    scoreBarColor = "#e11d48";
    complianceNote = "Ditemukan banyak ketidaksesuaian butir checklist di lapangan.";
  } else if (report.complianceScore < 75) {
    gradeLabel = "GRADE C";
    gradeClass = "grade-c";
    scoreBarColor = "#f59e0b"; // Amber
    complianceNote = "Terdapat beberapa butir checklist yang memerlukan perhatian.";
  } else if (report.complianceScore < 90) {
    gradeLabel = "GRADE B";
    gradeClass = "grade-b";
    scoreBarColor = "#3b82f6"; // Blue
    complianceNote = "Kepatuhan operasional berjalan baik dengan sedikit temuan minor.";
  }

  // Status Chip Style
  let statusBadgeClass = "chip-compliant";
  let statusLabel = "MEMENUHI SOP";
  let statusDescription = "Seluruh butir evaluasi terverifikasi sesuai standar";
  let statusTag = "Sesuai Standar Mutu";

  if (isNonCompliant) {
    statusBadgeClass = "chip-noncompliant";
    statusLabel = "TIDAK MENGERJAKAN";
    statusDescription = "Melewati batas toleransi waktu tanpa submit laporan";
    statusTag = "Tidak Patuh";
  } else if (report.status === "Masalah" || issueCount > 0) {
    statusBadgeClass = "chip-issues";
    statusLabel = `TEMUAN MASALAH (${issueCount})`;
    statusDescription = `${issueCount} butir evaluasi memerlukan perbaikan`;
    statusTag = "Perlu Perhatian";
  }

  // Risk Profile
  let riskTitle = "RISIKO RENDAH";
  let riskClass = "risk-low";
  let riskDescription = "Tidak ada indikasi pelanggaran kritis pada operasional gerai.";

  if (isNonCompliant) {
    riskTitle = "RISIKO KRITIS";
    riskClass = "risk-critical";
    riskDescription = "Pelanggaran kepatuhan jadwal kerja, staf tidak menyerahkan laporan.";
  } else if (issueCount > 0) {
    const hasHighRisk = resolvedFindings.some((f) => f.hasIssue && (f.priority === "High" || f.isPhotoRequired));
    if (hasHighRisk) {
      riskTitle = "RISIKO TINGGI";
      riskClass = "risk-high";
      riskDescription = "Ditemukan temuan pada butir yang berprioritas tinggi.";
    } else {
      riskTitle = "RISIKO SEDANG";
      riskClass = "risk-medium";
      riskDescription = "Ditemukan beberapa ketidaksesuaian butir checklist di lapangan.";
    }
  }

  const docNumber = `AUD/RPT/${(report.submitDate || "2026").replace(/[^0-9]/g, "").slice(-4) || "2026"}/${(report.id || "001").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;

  // Findings Table Rows (Kolom Prioritas & Status Murni Font Tanpa Bubble)
  const findingsRows = resolvedFindings.length > 0
    ? resolvedFindings.map((f, idx) => {
        const itemNumber = idx + 1;
        const isHigh = f.priority === "High" || f.isPhotoRequired || f.severity === "Tinggi";
        return `
          <tr class="${f.hasIssue ? 'row-issue' : 'row-normal'}">
            <td style="text-align: center; font-weight: 700; color: #64748b; font-size: 10px;">${itemNumber}</td>
            <td style="font-weight: 600; color: #0f172a;">
              <div style="font-size: 11px; line-height: 1.35;">${f.itemTitle || `Pemeriksaan Butir ${itemNumber}`}</div>
              <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-top: 3px;">
                ${f.isPhotoRequired ? '<span class="pill-photo-req">Wajib Foto</span>' : ''}
                ${f.resolvedPhotoUrl ? `<span class="pill-has-photo">📷 Foto Butir #${itemNumber} Terlampir</span>` : ''}
              </div>
            </td>
            <td style="font-size: 10.5px; color: #475569; font-weight: 500;">
              ${f.category || 'Operasional Toko'}
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <span class="${isHigh ? 'priority-high-text' : 'priority-low-text'}">
                ${isHigh ? 'Tinggi' : 'Normal'}
              </span>
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <span class="${f.hasIssue ? 'status-text-fail' : 'status-text-pass'}">
                ${f.hasIssue ? '✕ Temuan' : '✓ Sesuai'}
              </span>
            </td>
            <td style="font-size: 10.5px; color: #334155;">
              ${
                f.hasIssue
                  ? `<div class="issue-desc"><strong>Catatan Temuan:</strong> ${f.issueNote || f.auditorNote || 'Ditemukan ketidaksesuaian butir checklist saat inspeksi lapangan.'}</div>
                     ${f.recommendation ? `<div class="capa-rec"><strong>Rekomendasi Tindakan:</strong> ${f.recommendation}</div>` : ''}`
                  : `<div class="pass-desc">${f.auditorNote || f.issueNote || 'Kondisi memenuhi standar operasional prima.'}</div>`
              }
            </td>
          </tr>
        `;
      }).join("")
    : `
        <tr>
          <td colspan="6" style="padding: 24px; text-align: center; color: #64748b; font-size: 11px; font-style: italic;">
            ${isNonCompliant ? 'Checklist tidak dikerjakan oleh staf karena melewati batas toleransi penugasan.' : 'Tidak ada butir checklist yang tercatat.'}
          </td>
        </tr>
      `;

  // Filter bukti foto dan beri nomor urut jelas
  const findingsWithPhotos = resolvedFindings
    .map((f, idx) => ({ ...f, itemNumber: idx + 1 }))
    .filter((f) => Boolean(f.resolvedPhotoUrl));

  const totalPhotoCount = (resolvedAuditorPhoto ? 1 : 0) + findingsWithPhotos.length;
  const hasPhotos = totalPhotoCount > 0;

  let photoIndexCounter = 0;

  const photosSection = hasPhotos
    ? `
      <div class="panel-section page-break-auto">
        <div class="panel-header">
          <div class="panel-title">4. LAMPIRAN BUKTI FOTO LAPANGAN (${totalPhotoCount} FOTO TERLAMPIR)</div>
        </div>
        <div class="photo-evidence-grid">
          ${
            resolvedAuditorPhoto
              ? (() => {
                  photoIndexCounter++;
                  return `
                    <div class="photo-card">
                      <div class="photo-wrapper">
                        <img src="${resolvedAuditorPhoto}" alt="Foto Kehadiran Auditor" />
                        <div class="photo-tag tag-auditor">FOTO #${photoIndexCounter}</div>
                        <div class="photo-ref-badge">VERIFIKASI KEHADIRAN</div>
                      </div>
                      <div class="photo-meta">
                        <div class="photo-title">Foto Kehadiran: ${displayAuditorName}</div>
                        <div class="photo-sub">${displayAuditorRole} • Gerai ${report.storeName}</div>
                        <div class="photo-caption-text">Submit: ${report.submitDate} • ${report.submitTime}</div>
                      </div>
                    </div>
                  `;
                })()
              : ""
          }
          ${findingsWithPhotos
            .map((p) => {
              photoIndexCounter++;
              return `
                <div class="photo-card">
                  <div class="photo-wrapper">
                    <img src="${p.resolvedPhotoUrl}" alt="Bukti Foto Butir #${p.itemNumber}" />
                    <div class="photo-tag ${p.hasIssue ? 'tag-defect' : 'tag-pass'}">
                      FOTO #${photoIndexCounter}
                    </div>
                    <div class="photo-ref-badge">REFERENSI BUTIR #${p.itemNumber}</div>
                  </div>
                  <div class="photo-meta">
                    <div class="photo-title">Foto Butir #${p.itemNumber}: ${p.itemTitle}</div>
                    <div class="photo-sub">Kategori: ${p.category} • Status: ${p.hasIssue ? 'Temuan' : 'Sesuai'}</div>
                    <div class="photo-caption-text">${p.photoCaption || `Dokumentasi bukti inspeksi butir ke-${p.itemNumber}`}</div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    `
    : "";

  return `
    <div class="single-report-wrapper ${reportIndex > 0 ? 'page-break-before' : ''}">
      <!-- 1. Header Corporate (Tanpa Icon di sebelah AUDIT & COMPLIANCE MANAGEMENT SYSTEM) -->
      <div class="doc-header">
        <div class="header-main">
          <div class="brand-row">
            <div>
              <div class="brand-title">AUDIT & COMPLIANCE MANAGEMENT SYSTEM</div>
              <div class="brand-subtitle">Standar Operasional Prosedur (SOP) & Jaminan Mutu Gerai Resmi</div>
            </div>
          </div>
          <div class="doc-classification">
            <span class="confidential-pill">STRICTLY CONFIDENTIAL</span>
            <div class="system-seal">DOKUMEN RESMI INTERNAL</div>
          </div>
        </div>

        <div class="doc-control-grid">
          <div class="doc-control-item">
            <div class="doc-control-label">NOMOR DOKUMEN</div>
            <div class="doc-control-val font-mono">${docNumber}</div>
          </div>
          <div class="doc-control-item">
            <div class="doc-control-label">TANGGAL & WAKTU SUBMIT</div>
            <div class="doc-control-val">${report.submitDate} • ${report.submitTime}</div>
          </div>
          <div class="doc-control-item">
            <div class="doc-control-label">UNIT BISNIS / WORKSPACE</div>
            <div class="doc-control-val">${report.workspaceName || 'Retail Operations'}</div>
          </div>
          <div class="doc-control-item">
            <div class="doc-control-label">STATUS KEPATUHAN</div>
            <div class="doc-control-val">
              <span class="status-chip ${statusBadgeClass}">${statusLabel}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. Executive Metrics KPI Grid -->
      <div class="metrics-grid">
        <!-- Card 1: Skor Kepatuhan -->
        <div class="metric-card score-card">
          <div class="metric-header">
            <span class="metric-label">SKOR KEPATUHAN</span>
            <span class="grade-badge ${gradeClass}">${gradeLabel}</span>
          </div>
          <div class="metric-value-row">
            <span class="score-number">${report.complianceScore}</span>
            <span class="score-unit">%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${report.complianceScore}%; background: ${scoreBarColor};"></div>
          </div>
          <div class="metric-footer">${complianceNote}</div>
        </div>

        <!-- Card 2: Status Audit & Toleransi -->
        <div class="metric-card">
          <span class="metric-label">STATUS HASIL AUDIT</span>
          <div class="metric-main-text" style="color: ${scoreBarColor};">${statusLabel}</div>
          <div class="metric-sub-text">${statusDescription}</div>
          <div class="metric-tag-pill ${statusBadgeClass}">${statusTag}</div>
        </div>

        <!-- Card 3: Statistik Butir Checklist -->
        <div class="metric-card">
          <span class="metric-label">STATISTIK BUTIR EVALUASI</span>
          <div class="stats-row">
            <div class="stat-box">
              <span class="stat-number">${totalItems}</span>
              <span class="stat-desc">Diperiksa</span>
            </div>
            <div class="stat-box stat-pass">
              <span class="stat-number">${compliantCount}</span>
              <span class="stat-desc">Sesuai SOP</span>
            </div>
            <div class="stat-box stat-fail">
              <span class="stat-number">${issueCount}</span>
              <span class="stat-desc">Temuan</span>
            </div>
          </div>
          <div class="metric-footer">${issueRate}% Deviasi Ketidaksesuaian</div>
        </div>

        <!-- Card 4: Tingkat Risiko -->
        <div class="metric-card">
          <span class="metric-label">PROFIL RISIKO OPERASIONAL</span>
          <div class="metric-main-text ${riskClass}">${riskTitle}</div>
          <div class="metric-sub-text">${riskDescription}</div>
          <div class="metric-footer">Berdasarkan hasil temuan checklist lapangan</div>
        </div>
      </div>

      <!-- 3. Informasi Objek Gerai & Verifikasi -->
      <div class="panel-section">
        <div class="panel-header">
          <div class="panel-title">1. INFORMASI OBJEK GERAI & VERIFIKASI PELAKSANA LAPANGAN</div>
        </div>
        <table class="info-table">
          <tbody>
            <tr>
              <td class="info-label-cell" style="width: 18%;">Nama Gerai / Toko</td>
              <td class="info-value-cell" style="width: 32%;"><strong>${report.storeName}</strong></td>
              <td class="info-label-cell" style="width: 18%;">Auditor Pelaksana</td>
              <td class="info-value-cell" style="width: 32%;"><strong>${displayAuditorName}</strong></td>
            </tr>
            <tr>
              <td class="info-label-cell">Lokasi & Kota</td>
              <td class="info-value-cell">${report.storeLocation || '-'}</td>
              <td class="info-label-cell">Peran / Posisi</td>
              <td class="info-value-cell">${displayAuditorRole}</td>
            </tr>
            <tr>
              <td class="info-label-cell">Jadwal Audit</td>
              <td class="info-value-cell">${report.scheduleName}</td>
              <td class="info-label-cell">Waktu Selesai</td>
              <td class="info-value-cell">${report.submitDate} pukul ${report.submitTime}</td>
            </tr>
            <tr>
              <td class="info-label-cell">Periode Pelaporan</td>
              <td class="info-value-cell">${report.month}</td>
              <td class="info-label-cell">Validasi Kehadiran</td>
              <td class="info-value-cell">
                ${
                  isNonCompliant
                    ? '<span style="color: #be123c; font-weight: 700; font-size: 9px;">✕ Tidak Hadir / Lewat Batas Toleransi</span>'
                    : '<span class="badge-valid-gps">✓ Terotentikasi GPS & Waktu Nyata</span>'
                }
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 4. Ringkasan Evaluasi & Catatan Manajerial -->
      <div class="panel-section">
        <div class="panel-header">
          <div class="panel-title">2. RINGKASAN EVALUASI & CATATAN AUDIT</div>
        </div>
        <div class="summary-box">
          <p>
            ${
              report.summaryNote
                ? report.summaryNote
                : isNonCompliant
                ? "Pemeriksaan lapangan tidak terlaksana karena staf tidak melakukan submit checklist dalam rentang toleransi keterlambatan yang ditentukan. Jadwal ditutup otomatis dengan status Tidak Mengerjakan."
                : issueCount > 0
                ? `Terdapat ${issueCount} butir checklist yang memerlukan perhatian dan perbaikan operasional di gerai.`
                : "Seluruh aspek evaluasi operasional gerai telah diperiksa dan terverifikasi memenuhi Standar Operasional Prosedur (SOP) prima."
            }
          </p>
        </div>
      </div>

      <!-- 5. Matriks Evaluasi Butir Checklist -->
      <div class="panel-section">
        <div class="panel-header">
          <div class="panel-title">3. MATRIKS EVALUASI BUTIR CHECKLIST LAPANGAN</div>
        </div>
        <table class="findings-table">
          <thead>
            <tr>
              <th style="width: 32px; text-align: center;">NO</th>
              <th style="width: 32%;">PARAMETER BUTIR EVALUASI SOP</th>
              <th style="width: 16%;">KATEGORI</th>
              <th style="width: 11%; text-align: center;">PRIORITAS</th>
              <th style="width: 13%; text-align: center;">STATUS</th>
              <th style="width: 28%;">CATATAN LAPANGAN & KETERANGAN AUDITOR</th>
            </tr>
          </thead>
          <tbody>
            ${findingsRows}
          </tbody>
        </table>
      </div>

      <!-- 6. Lampiran Foto Bukti Lapangan (jika ada) -->
      ${photosSection}

      <!-- 7. Lembar Pengesahan Resmi (100% Data Riil Database) -->
      <div class="panel-section signoff-section">
        <div class="panel-header">
          <div class="panel-title">5. LEMBAR PENGESAHAN PETUGAS AUDIT LAPANGAN</div>
        </div>
        <div class="signoff-container">
          ${
            isNonCompliant
              ? `
                <div style="padding: 16px; text-align: center; color: #9f1239; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px;">
                  <div style="font-weight: 800; font-size: 11px; margin-bottom: 4px;">TIDAK ADA DOKUMENTASI PENGESAHAN & TANDA TANGAN</div>
                  <div style="font-size: 9.5px; color: #be123c;">
                    Jadwal audit ini ditutup secara otomatis oleh sistem karena melewati batas toleransi pengerjaan. Tidak ada penugasan staf pelaksana tunggal, dokumentasi foto kehadiran, maupun tanda tangan digital yang tercatat di database.
                  </div>
                </div>
              `
              : `
                <div class="sig-real-grid ${resolvedAuditorPhoto ? 'has-selfie' : ''}">
                  ${
                    resolvedAuditorPhoto
                      ? `
                        <div class="auditor-selfie-card">
                          <div style="font-size: 8px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">FOTO DIRI PETUGAS</div>
                          <img src="${resolvedAuditorPhoto}" class="auditor-selfie-img" alt="Foto Petugas" />
                          <div style="font-size: 9.5px; font-weight: 700; color: #0f172a;">${displayAuditorName}</div>
                          <div style="font-size: 8px; color: #64748b;">${displayAuditorRole}</div>
                        </div>
                      `
                      : ""
                  }
                  <div class="sig-card-real">
                    <div>
                      <div class="sig-role-title">TANDA TANGAN DIGITAL AUDITOR LAPANGAN (DATA RESMI DATABASE):</div>
                      <div class="sig-img-container-real">
                        ${
                          resolvedSignature
                            ? `<img src="${resolvedSignature}" alt="Tanda Tangan Auditor" />`
                            : `<div class="sig-placeholder-real">Tanda Tangan Digital Belum Tersedia di Database</div>`
                        }
                      </div>
                    </div>
                    <div>
                      <div class="sig-name-real">${displayAuditorName}</div>
                      <div class="sig-meta-real">${displayAuditorRole} • Tanggal Submit: ${report.submitDate} pukul ${report.submitTime}</div>
                      ${resolvedSignature ? '<div class="sig-status-real">✓ Tervalidasi Digital dari Database</div>' : ''}
                    </div>
                    <div class="declaration-statement">
                      "Saya menyatakan bahwa seluruh butir evaluasi, respon pemeriksaan, dan bukti foto pada laporan ini diambil langsung di lokasi gerai ${report.storeName} sesuai dengan fakta operasional lapangan."
                    </div>
                  </div>
                </div>
              `
          }
        </div>

        <div class="legal-notice">
          <strong>Catatan Integritas Data:</strong> Seluruh data pada laporan ini bersumber langsung dari database sistem audit tanpa manipulasi data buatan. Tanggal, jam submit, catatan temuan, bukti foto, serta tanda tangan digital tervalidasi secara elektronik melalui Audit Checklist System.
        </div>
      </div>
    </div>
  `;
}

/**
 * Helper untuk merender Cover Halaman Rekapitulasi Eksekutif Utama (Master Summary)
 * Ditampilkan di halaman pertama saat kompilasi lebih dari 1 laporan audit diekspor.
 */
function renderMasterSummaryPageHtml(
  reports: AuditReportItem[],
  workspaceName: string
): string {
  const total = reports.length;
  const avgScore = total > 0 ? Math.round(reports.reduce((acc, r) => acc + (r.complianceScore || 0), 0) / total) : 0;
  const totalIssues = reports.reduce((acc, r) => acc + (r.issueCount || 0), 0);
  const sesuaiCount = reports.filter((r) => r.status === "Sesuai").length;
  const masalahCount = reports.filter((r) => r.status === "Masalah").length;
  const tidakMengerjakanCount = reports.filter((r) => r.status === "Tidak Mengerjakan").length;

  let avgGradeLabel = "GRADE A";
  let avgGradeClass = "grade-a";
  let avgScoreColor = "#10b981";

  if (avgScore < 60) {
    avgGradeLabel = "GRADE D";
    avgGradeClass = "grade-d";
    avgScoreColor = "#e11d48";
  } else if (avgScore < 75) {
    avgGradeLabel = "GRADE C";
    avgGradeClass = "grade-c";
    avgScoreColor = "#f59e0b";
  } else if (avgScore < 90) {
    avgGradeLabel = "GRADE B";
    avgGradeClass = "grade-b";
    avgScoreColor = "#3b82f6";
  }

  const now = new Date();
  const dateStr = `${now.getDate()} ${now.toLocaleDateString("id-ID", { month: "long" })} ${now.getFullYear()}`;

  return `
    <div class="single-report-wrapper">
      <!-- Master Header -->
      <div class="doc-header">
        <div class="header-main">
          <div class="brand-row">
            <div>
              <div class="brand-title">REKAPITULASI DOKUMEN LAPORAN AUDIT & KEPATUHAN OPERASIONAL</div>
              <div class="brand-subtitle">Kompilasi Seluruh Laporan Hasil Evaluasi Standar Operasional Prosedur Gerai Terfilter</div>
            </div>
          </div>
          <div class="doc-classification">
            <span class="confidential-pill">STRICTLY CONFIDENTIAL</span>
            <div class="system-seal">DOKUMEN RESMI INTERNAL</div>
          </div>
        </div>
        <div class="doc-control-grid">
          <div class="doc-control-item">
            <div class="doc-control-label">TOTAL LAPORAN TERFILTER</div>
            <div class="doc-control-val">${total} Laporan Gerai</div>
          </div>
          <div class="doc-control-item">
            <div class="doc-control-label">TANGGAL EKSPOR</div>
            <div class="doc-control-val">${dateStr}</div>
          </div>
          <div class="doc-control-item">
            <div class="doc-control-label">UNIT BISNIS / WORKSPACE</div>
            <div class="doc-control-val">${workspaceName}</div>
          </div>
          <div class="doc-control-item">
            <div class="doc-control-label">RATA-RATA KEPATUHAN</div>
            <div class="doc-control-val">
              <span class="status-chip ${avgScore >= 80 ? 'chip-compliant' : avgScore >= 60 ? 'chip-issues' : 'chip-noncompliant'}">
                ${avgScore}% Kepatuhan
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Master KPI Summary Cards -->
      <div class="metrics-grid">
        <div class="metric-card score-card">
          <div class="metric-header">
            <span class="metric-label">RATA-RATA SKOR</span>
            <span class="grade-badge ${avgGradeClass}">${avgGradeLabel}</span>
          </div>
          <div class="metric-value-row">
            <span class="score-number">${avgScore}</span>
            <span class="score-unit">%</span>
          </div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${avgScore}%; background: ${avgScoreColor};"></div>
          </div>
          <div class="metric-footer">Rata-rata dari ${total} laporan gerai</div>
        </div>

        <div class="metric-card">
          <span class="metric-label">DISTRIBUSI STATUS AUDIT</span>
          <div class="stats-row">
            <div class="stat-box stat-pass">
              <span class="stat-number">${sesuaiCount}</span>
              <span class="stat-desc">Sesuai SOP</span>
            </div>
            <div class="stat-box stat-fail">
              <span class="stat-number">${masalahCount}</span>
              <span class="stat-desc">Ada Temuan</span>
            </div>
            <div class="stat-box" style="background: #fff1f2; border-color: #fecdd3;">
              <span class="stat-number" style="color: #9f1239;">${tidakMengerjakanCount}</span>
              <span class="stat-desc">Tidak Patuh</span>
            </div>
          </div>
          <div class="metric-footer">Total ${total} laporan diuji</div>
        </div>

        <div class="metric-card">
          <span class="metric-label">TOTAL TEMUAN MASALAH</span>
          <div class="metric-value-row">
            <span class="score-number" style="color: ${totalIssues > 0 ? '#b91c1c' : '#15803d'};">${totalIssues}</span>
            <span class="score-unit">Temuan</span>
          </div>
          <div class="metric-sub-text">Total ketidaksesuaian butir pada gerai yang diperiksa</div>
        </div>

        <div class="metric-card">
          <span class="metric-label">INTEGRITAS DOKUMEN</span>
          <div class="metric-main-text" style="color: #0f172a; font-size: 11px;">100% TERVERIFIKASI SISTEM</div>
          <div class="metric-sub-text">Seluruh data diambil langsung dari catatan log audit database resmi</div>
        </div>
      </div>

      <!-- Master Batch Index Table -->
      <div class="panel-section">
        <div class="panel-header">
          <div class="panel-title">TABEL DAFTAR REKAPITULASI LAPORAN AUDIT TERFILTER</div>
        </div>
        <table class="findings-table">
          <thead>
            <tr>
              <th style="width: 28px; text-align: center;">NO</th>
              <th style="width: 26%;">NAMA GERAI / TOKO</th>
              <th style="width: 22%;">NAMA JADWAL AUDIT</th>
              <th style="width: 16%;">STAFF PELAKSANA</th>
              <th style="width: 14%;">WAKTU SUBMIT</th>
              <th style="width: 12%; text-align: center;">STATUS</th>
              <th style="width: 10%; text-align: center;">SKOR</th>
            </tr>
          </thead>
          <tbody>
            ${reports.map((r, idx) => `
              <tr class="${r.status === 'Tidak Mengerjakan' ? 'row-issue' : 'row-normal'}">
                <td style="text-align: center; font-weight: 700; color: #64748b; font-size: 10px;">${idx + 1}</td>
                <td>
                  <strong style="color: #0f172a; font-size: 11px;">${r.storeName}</strong>
                  <div style="font-size: 9px; color: #64748b;">${r.storeLocation || '-'}</div>
                </td>
                <td style="font-size: 10px; color: #334155;">${r.scheduleName}</td>
                <td style="font-size: 10px; color: #334155;">
                  ${r.status === 'Tidak Mengerjakan' ? '<span style="color: #94a3b8; font-style: italic;">-</span>' : (r.auditorName && r.auditorName !== '-' ? r.auditorName : '-')}
                </td>
                <td style="font-size: 9.5px; color: #475569;">
                  <div>${r.submitDate}</div>
                  <div style="font-size: 8.5px; color: #94a3b8;">${r.submitTime}</div>
                </td>
                <td style="text-align: center; vertical-align: middle;">
                  <span class="${r.status === 'Sesuai' ? 'status-text-pass' : 'status-text-fail'}">
                    ${r.status === 'Sesuai' ? '✓ Sesuai' : r.status === 'Masalah' ? `✕ Masalah (${r.issueCount})` : '✕ Tidak Patuh'}
                  </span>
                </td>
                <td style="text-align: center; font-weight: 800; font-size: 11px; color: ${r.complianceScore >= 80 ? '#15803d' : r.complianceScore >= 60 ? '#b45309' : '#be123c'};">
                  ${r.complianceScore}%
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Helper terisolasi untuk menyuntikkan dokumen HTML ke invisible iframe dan memicu dialog print PDF
 * Dilengkapi penguncian hasTriggered agar dialog cetak dijamin muncul tepat 1 kali.
 */
function printHtmlDocument(htmlDoc: string, pdfTitle: string): void {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.title = pdfTitle;
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlDoc);
      doc.close();

      let hasTriggered = false;
      let printTimer: any = null;

      // Ubah document.title utama sementara agar browser menyarankan nama file PDF sesuai pdfTitle
      const previousDocTitle = document.title;

      const triggerPrint = () => {
        if (hasTriggered) return;
        hasTriggered = true;
        if (printTimer) {
          clearTimeout(printTimer);
          printTimer = null;
        }

        try {
          document.title = pdfTitle;
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          toast.success("Dokumen siap disimpan sebagai PDF! Pilih 'Save as PDF' di jendela dialog.");
        } catch (e) {
          console.warn("Print dialog error:", e);
        }

        setTimeout(() => {
          document.title = previousDocTitle;
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      };

      const images = doc.images;
      if (!images || images.length === 0) {
        printTimer = setTimeout(triggerPrint, 250);
      } else {
        let loaded = 0;
        const total = images.length;
        const onDone = () => {
          loaded++;
          if (loaded >= total) {
            triggerPrint();
          }
        };

        for (let i = 0; i < total; i++) {
          const img = images[i];
          if (img.complete) {
            loaded++;
          } else {
            img.onload = onDone;
            img.onerror = onDone;
          }
        }

        if (loaded >= total) {
          printTimer = setTimeout(triggerPrint, 250);
        } else {
          // Batas toleransi gambar jika lambat
          printTimer = setTimeout(triggerPrint, 1800);
        }
      }
    }
  } catch (err) {
    console.error("Iframe print error:", err);
    if (document.body.contains(iframe)) {
      document.body.removeChild(iframe);
    }
  }
}

/**
 * Helper terisolasi untuk memuat gambar menjadi data URL base64 yang aman untuk jsPDF
 */
async function loadBase64Image(
  src?: string
): Promise<{ dataUrl: string; format: "JPEG" | "PNG"; width: number; height: number } | null> {
  if (!src) return null;
  try {
    const resolved = await resolveImageSrc(src);
    if (!resolved) return null;

    if (resolved.startsWith("data:image/png")) {
      return { dataUrl: resolved, format: "PNG", width: 100, height: 100 };
    }
    if (resolved.startsWith("data:image/jpeg") || resolved.startsWith("data:image/jpg")) {
      return { dataUrl: resolved, format: "JPEG", width: 100, height: 100 };
    }

    if (typeof window !== "undefined" && typeof Image !== "undefined") {
      return await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth || img.width || 400;
            canvas.height = img.naturalHeight || img.height || 300;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const isPng = resolved.includes(".png") || resolved.startsWith("data:image/png");
              const format: "JPEG" | "PNG" = isPng ? "PNG" : "JPEG";
              const dataUrl = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.9);
              resolve({ dataUrl, format, width: canvas.width, height: canvas.height });
              return;
            }
          } catch (err) {
            console.warn("Canvas export error:", err);
          }
          resolve(null);
        };
        img.onerror = () => resolve(null);
        img.src = resolved;
      });
    }
  } catch (e) {
    console.warn("loadBase64Image failure:", e);
  }
  return null;
}

/**
 * 3. GENERATOR FILE PDF SATUAN KUALITAS INDUSTRI (MENGGUNAKAN VECTOR jsPDF RESMI)
 * Menghasilkan file PDF individual resmi yang bersih, tajam, berstandar industri:
 * - Tidak ada watermark atau URL browser (localhost:3000/laporan ditiadakan).
 * - Format nama file: Laporan_Audit_<NamaToko>_<Tanggal>.pdf
 * - Jika status "Tidak Mengerjakan", nama staf, peran, foto diri, dan tanda tangan dikosongi.
 * - Kolom prioritas dan status checklist berupa tipografi murni tanpa bubble.
 * - Foto terlampir memiliki penomoran urut yang jelas (#1, #2...) dan tag referensi.
 * - Tanda tangan dan foto diambil 100% dari database riil (tanpa tanda tangan palsu buatan).
 */
export async function generateIndividualPdfBlob(
  report: AuditReportItem
): Promise<{ blob: Blob; fileName: string }> {
  const cleanStore = sanitizeFileNamePart(report.storeName || "Toko");
  const cleanDate = sanitizeFileNamePart(report.submitDate || "Tanggal");
  const fileName = `Laporan_Audit_${cleanStore}_${cleanDate}.pdf`;

  const JsPDFConstructor = await getJsPDF();
  const doc = new JsPDFConstructor({ orientation: "portrait", unit: "mm", format: "a4" });
  let currentY = 14;

  const docNumber = `AUD/RPT/${(report.submitDate || "2026").replace(/[^0-9]/g, "").slice(-4) || "2026"}/${(report.id || "001").replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;
  const isNonCompliant = report.status === "Tidak Mengerjakan";

  // Filter & data pelaksana
  const displayAuditorName = isNonCompliant ? "-" : (report.auditorName && report.auditorName !== "-" ? report.auditorName : "-");
  const displayAuditorRole = isNonCompliant ? "-" : (report.auditorRole && report.auditorRole !== "-" ? report.auditorRole : "-");

  // Load aset gambar riil database
  const loadedSignature = isNonCompliant ? null : await loadBase64Image(report.signatureUrl);
  const loadedAuditorPhoto = isNonCompliant ? null : await loadBase64Image(report.auditorPhoto);

  const findings = Array.isArray(report.findings) ? report.findings : [];
  const loadedFindings = await Promise.all(
    findings.map(async (f) => ({
      ...f,
      loadedPhoto: await loadBase64Image(f.photoUrl),
    }))
  );

  const totalItems = isNonCompliant ? 0 : (loadedFindings.length > 0 ? loadedFindings.length : (report.issueCount || 0));
  const issues = loadedFindings.filter((f) => f.hasIssue);
  const issueCount = isNonCompliant ? 0 : (loadedFindings.length > 0 ? issues.length : (report.issueCount || 0));
  const compliantCount = isNonCompliant ? 0 : Math.max(0, totalItems - issueCount);
  const issueRate = totalItems > 0 ? Math.round((issueCount / totalItems) * 100) : 0;

  // Grade & Compliance Label
  let gradeLabel = "GRADE A";
  let scoreColor: [number, number, number] = [21, 128, 61]; // #15803d
  let complianceNote = "Memenuhi 100% parameter evaluasi SOP.";

  if (isNonCompliant) {
    gradeLabel = "GRADE F";
    scoreColor = [190, 18, 60]; // #be123c
    complianceNote = "Jadwal ditutup otomatis karena melewati batas toleransi.";
  } else if (report.complianceScore < 60) {
    gradeLabel = "GRADE D";
    scoreColor = [190, 18, 60];
    complianceNote = "Ditemukan banyak ketidaksesuaian butir di lapangan.";
  } else if (report.complianceScore < 75) {
    gradeLabel = "GRADE C";
    scoreColor = [180, 83, 9]; // #b45309
    complianceNote = "Terdapat butir evaluasi yang memerlukan perhatian.";
  } else if (report.complianceScore < 90) {
    gradeLabel = "GRADE B";
    scoreColor = [30, 64, 175]; // #1e40af
    complianceNote = "Kepatuhan operasional berjalan baik dengan sedikit temuan.";
  }

  // Status Label
  let statusText = "MEMENUHI SOP";
  let statusTag = "Sesuai Standar Mutu";
  if (isNonCompliant) {
    statusText = "TIDAK MENGERJAKAN";
    statusTag = "Tidak Patuh";
  } else if (report.status === "Masalah" || issueCount > 0) {
    statusText = `TEMUAN MASALAH (${issueCount})`;
    statusTag = "Perlu Perbaikan";
  }

  // Risiko Label
  let riskTitle = "RISIKO RENDAH";
  let riskColor: [number, number, number] = [21, 128, 61];
  if (isNonCompliant) {
    riskTitle = "RISIKO KRITIS";
    riskColor = [190, 18, 60];
  } else if (issueCount > 0) {
    const hasHighRisk = loadedFindings.some((f) => f.hasIssue && (f.priority === "High" || f.isPhotoRequired));
    riskTitle = hasHighRisk ? "RISIKO TINGGI" : "RISIKO SEDANG";
    riskColor = hasHighRisk ? [190, 18, 60] : [180, 83, 9];
  }

  // Helper Auto Page Break
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > 275) {
      doc.addPage();
      currentY = 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`AUDIT & COMPLIANCE MANAGEMENT SYSTEM • ${docNumber} • ${report.storeName}`, 14, 10);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(14, 12, 196, 12);
      return true;
    }
    return false;
  };

  // ==================== 1. HEADER CORPORATE (TANPA ICON) ====================
  doc.setFillColor(15, 41, 55); // #0f2937
  doc.roundedRect(14, currentY, 182, 15, 1.5, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("AUDIT & COMPLIANCE MANAGEMENT SYSTEM", 18, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Standar Operasional Prosedur (SOP) & Jaminan Mutu Gerai Resmi", 18, currentY + 11);

  // Strictly Confidential Badge
  doc.setFillColor(190, 18, 60);
  doc.roundedRect(146, currentY + 3.5, 46, 5, 1, 1, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("STRICTLY CONFIDENTIAL", 169, currentY + 7, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(203, 213, 225);
  doc.text("DOKUMEN RESMI INTERNAL", 192, currentY + 12.5, { align: "right" });

  currentY += 16.5;

  // ==================== 2. CONTROL GRID ====================
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, currentY, 182, 11, 1, 1, "FD");

  const ctrlColW = 182 / 4;
  const ctrlItems = [
    { label: "NOMOR DOKUMEN", val: docNumber },
    { label: "WAKTU SUBMIT", val: `${report.submitDate || "-"} • ${report.submitTime || "-"}` },
    { label: "WORKSPACE / DIVISI", val: report.workspaceName || "Retail Operations" },
    { label: "STATUS KEPATUHAN", val: statusText },
  ];

  ctrlItems.forEach((c, idx) => {
    const cx = 14 + idx * ctrlColW;
    if (idx > 0) {
      doc.setDrawColor(226, 232, 240);
      doc.line(cx, currentY, cx, currentY + 11);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cx + 3, currentY + 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    if (idx === 3) {
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(c.val.length > 25 ? c.val.slice(0, 23) + "..." : c.val, cx + 3, currentY + 8.5);
  });

  currentY += 13.5;

  // ==================== 3. EXECUTIVE METRICS KPI CARDS ====================
  const kpiCardW = (182 - 3 * 2.5) / 4; // ~43.6mm
  const kpiCardH = 21;

  // Card 1: Skor
  let kx = 14;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(kx, currentY, kpiCardW, kpiCardH, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SKOR KEPATUHAN", kx + 3, currentY + 4.5);
  // Grade
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.roundedRect(kx + kpiCardW - 16, currentY + 2, 13, 4, 0.8, 0.8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(6);
  doc.text(gradeLabel, kx + kpiCardW - 9.5, currentY + 4.8, { align: "center" });

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`${report.complianceScore}%`, kx + 3, currentY + 12);

  // Progress Bar
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(kx + 3, currentY + 14, kpiCardW - 6, 2, 0.5, 0.5, "F");
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  const barW = Math.max(1, ((kpiCardW - 6) * (report.complianceScore || 0)) / 100);
  doc.roundedRect(kx + 3, currentY + 14, barW, 2, 0.5, 0.5, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(complianceNote.slice(0, 32), kx + 3, currentY + 19);

  // Card 2: Status Audit
  kx += kpiCardW + 2.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(kx, currentY, kpiCardW, kpiCardH, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("STATUS HASIL AUDIT", kx + 3, currentY + 4.5);

  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.setFontSize(8.5);
  doc.text(statusText, kx + 3, currentY + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(isNonCompliant ? "Lewat batas toleransi waktu" : `${issueCount} butir evaluasi deviasi`, kx + 3, currentY + 14.5);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`[ ${statusTag} ]`, kx + 3, currentY + 19);

  // Card 3: Statistik Butir
  kx += kpiCardW + 2.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(kx, currentY, kpiCardW, kpiCardH, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("STATISTIK EVALUASI", kx + 3, currentY + 4.5);

  // 3 Mini stats boxes
  const miniW = (kpiCardW - 7) / 3;
  const sY = currentY + 6.5;
  // Box Diperiksa
  doc.setFillColor(248, 250, 252);
  doc.rect(kx + 2, sY, miniW, 8.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(String(totalItems), kx + 2 + miniW / 2, sY + 4.5, { align: "center" });
  doc.setFontSize(5);
  doc.setTextColor(100, 116, 139);
  doc.text("Diuji", kx + 2 + miniW / 2, sY + 7.5, { align: "center" });

  // Box Sesuai
  doc.setFillColor(240, 253, 244);
  doc.rect(kx + 3.5 + miniW, sY, miniW, 8.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(21, 128, 61);
  doc.text(String(compliantCount), kx + 3.5 + miniW * 1.5, sY + 4.5, { align: "center" });
  doc.setFontSize(5);
  doc.text("Sesuai", kx + 3.5 + miniW * 1.5, sY + 7.5, { align: "center" });

  // Box Temuan
  doc.setFillColor(255, 241, 242);
  doc.rect(kx + 5 + miniW * 2, sY, miniW, 8.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(190, 18, 60);
  doc.text(String(issueCount), kx + 5 + miniW * 2.5, sY + 4.5, { align: "center" });
  doc.setFontSize(5);
  doc.text("Temuan", kx + 5 + miniW * 2.5, sY + 7.5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`${issueRate}% Deviasi Ketidaksesuaian`, kx + 3, currentY + 19);

  // Card 4: Profil Risiko
  kx += kpiCardW + 2.5;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(kx, currentY, kpiCardW, kpiCardH, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PROFIL RISIKO", kx + 3, currentY + 4.5);

  doc.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
  doc.setFontSize(8.5);
  doc.text(riskTitle, kx + 3, currentY + 10.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text(isNonCompliant ? "Kategori pelanggaran jadwal" : `${issueCount} butir perlu perbaikan`, kx + 3, currentY + 14.5);

  doc.setFontSize(5.8);
  doc.text("Berdasarkan evaluasi SOP", kx + 3, currentY + 19);

  currentY += kpiCardH + 3.5;

  // ==================== 4. INFORMASI OBJEK GERAI & VERIFIKASI ====================
  checkPageBreak(25);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text("1. INFORMASI OBJEK GERAI & VERIFIKASI PELAKSANA LAPANGAN", 17, currentY + 3.8);

  currentY += 5.5;

  // Table Grid 4 baris
  const infoH = 17;
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 182, infoH, "D");

  const iCol1 = 14;
  const iCol2 = 48;
  const iCol3 = 105;
  const iCol4 = 142;

  // Horizontal divider lines
  const rowStep = infoH / 4;
  for (let r = 1; r < 4; r++) {
    doc.line(14, currentY + r * rowStep, 196, currentY + r * rowStep);
  }
  doc.line(105, currentY, 105, currentY + infoH);

  doc.setFontSize(6.5);
  // Row 1
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Nama Gerai / Toko", iCol1 + 2, currentY + rowStep * 0 + 3);
  doc.setTextColor(15, 23, 42);
  doc.text(report.storeName || "-", iCol2, currentY + rowStep * 0 + 3);

  doc.setTextColor(100, 116, 139);
  doc.text("Auditor Pelaksana", iCol3 + 2, currentY + rowStep * 0 + 3);
  doc.setTextColor(15, 23, 42);
  doc.text(displayAuditorName, iCol4, currentY + rowStep * 0 + 3);

  // Row 2
  doc.setTextColor(100, 116, 139);
  doc.text("Lokasi & Wilayah", iCol1 + 2, currentY + rowStep * 1 + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(report.storeLocation || "-", iCol2, currentY + rowStep * 1 + 3);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Peran / Jabatan", iCol3 + 2, currentY + rowStep * 1 + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(displayAuditorRole, iCol4, currentY + rowStep * 1 + 3);

  // Row 3
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Jadwal Penugasan", iCol1 + 2, currentY + rowStep * 2 + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(report.scheduleName || "-", iCol2, currentY + rowStep * 2 + 3);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Waktu Penyelesaian", iCol3 + 2, currentY + rowStep * 2 + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`${report.submitDate || "-"} pukul ${report.submitTime || "-"}`, iCol4, currentY + rowStep * 2 + 3);

  // Row 4
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Periode Laporan", iCol1 + 2, currentY + rowStep * 3 + 3);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(report.month || "-", iCol2, currentY + rowStep * 3 + 3);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("Validasi Kehadiran", iCol3 + 2, currentY + rowStep * 3 + 3);
  if (isNonCompliant) {
    doc.setTextColor(190, 18, 60);
    doc.text("✕ Tidak Hadir / Lewat Batas Toleransi", iCol4, currentY + rowStep * 3 + 3);
  } else {
    doc.setTextColor(21, 128, 61);
    doc.text("✓ Terotentikasi GPS & Waktu Nyata", iCol4, currentY + rowStep * 3 + 3);
  }

  currentY += infoH + 3.5;

  // ==================== 5. RINGKASAN EVALUASI & CATATAN AUDIT ====================
  checkPageBreak(20);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text("2. RINGKASAN EVALUASI & CATATAN AUDIT", 17, currentY + 3.8);
  currentY += 5.5;

  const defaultNote = isNonCompliant
    ? "Pemeriksaan lapangan tidak terlaksana karena staf tidak melakukan submit checklist dalam rentang toleransi keterlambatan yang ditentukan. Jadwal ditutup otomatis dengan status Tidak Mengerjakan."
    : issueCount > 0
    ? `Terdapat ${issueCount} butir checklist yang memerlukan perhatian dan perbaikan operasional di gerai.`
    : "Seluruh aspek evaluasi operasional gerai telah diperiksa dan terverifikasi memenuhi Standar Operasional Prosedur (SOP) prima.";

  const noteContent = report.summaryNote || defaultNote;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const noteLines = doc.splitTextToSize(noteContent, 174);
  const noteBoxH = Math.max(9, noteLines.length * 3.5 + 4);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, currentY, 182, noteBoxH, 1, 1, "FD");

  doc.setTextColor(51, 65, 85);
  doc.text(noteLines, 17, currentY + 4);

  currentY += noteBoxH + 3.5;

  // ==================== 6. MATRIKS EVALUASI BUTIR CHECKLIST ====================
  checkPageBreak(25);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text("3. MATRIKS EVALUASI BUTIR CHECKLIST LAPANGAN", 17, currentY + 3.8);
  currentY += 5.5;

  const drawTableHeader = () => {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, currentY, 182, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text("NO", 18, currentY + 4, { align: "center" });
    doc.text("PARAMETER BUTIR EVALUASI SOP", 24, currentY + 4);
    doc.text("KATEGORI", 88, currentY + 4);
    doc.text("PRIORITAS", 121, currentY + 4, { align: "center" });
    doc.text("STATUS", 140, currentY + 4, { align: "center" });
    doc.text("CATATAN LAPANGAN & TINDAKAN", 152, currentY + 4);
    currentY += 6;
  };

  drawTableHeader();

  if (isNonCompliant || loadedFindings.length === 0) {
    checkPageBreak(12);
    doc.setFillColor(255, 241, 242);
    doc.rect(14, currentY, 182, 10, "F");
    doc.setDrawColor(254, 205, 211);
    doc.line(14, currentY + 10, 196, currentY + 10);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(159, 18, 57);
    doc.text(
      isNonCompliant
        ? "Checklist tidak dikerjakan oleh staf karena melewati batas toleransi penugasan (Status: Tidak Mengerjakan)."
        : "Tidak ada butir checklist yang tercatat pada laporan ini.",
      105,
      currentY + 6,
      { align: "center" }
    );
    currentY += 10;
  } else {
    loadedFindings.forEach((item, idx) => {
      const isHigh = item.priority === "High" || item.isPhotoRequired || item.severity === "Tinggi";
      const titleLines = doc.splitTextToSize(item.itemTitle || `Pemeriksaan Butir ${idx + 1}`, 60);

      const noteText = item.hasIssue
        ? `Temuan: ${item.issueNote || item.auditorNote || "Ketidaksesuaian butir."}${item.recommendation ? `\nRekomendasi: ${item.recommendation}` : ""}`
        : item.auditorNote || "Sesuai standar operasional prima.";
      const noteLines = doc.splitTextToSize(noteText, 42);

      const rowH = Math.max(7.5, Math.max(titleLines.length, noteLines.length) * 3.4 + 3.5);

      if (currentY + rowH > 275) {
        doc.addPage();
        currentY = 16;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`AUDIT & COMPLIANCE MANAGEMENT SYSTEM • ${docNumber} • ${report.storeName}`, 14, 10);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, 12, 196, 12);
        drawTableHeader();
      }

      // Zebra striping
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(14, currentY, 182, rowH, "F");
      doc.setDrawColor(226, 232, 240);
      doc.line(14, currentY + rowH, 196, currentY + rowH);

      // No
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(String(idx + 1), 18, currentY + 4, { align: "center" });

      // Title
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.text(titleLines, 24, currentY + 3.8);

      // Category
      doc.setTextColor(71, 85, 105);
      doc.text((item.category || "Operasional").slice(0, 18), 88, currentY + 3.8);

      // Prioritas: Tipografi murni tanpa bubble
      if (isHigh) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(190, 18, 60);
        doc.text("Tinggi", 121, currentY + 3.8, { align: "center" });
      } else {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text("Normal", 121, currentY + 3.8, { align: "center" });
      }

      // Status: Tipografi murni tanpa bubble
      if (item.hasIssue) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(190, 18, 60);
        doc.text("✕ Temuan", 140, currentY + 3.8, { align: "center" });
      } else {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(21, 128, 61);
        doc.text("✓ Sesuai", 140, currentY + 3.8, { align: "center" });
      }

      // Catatan
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(noteLines, 152, currentY + 3.8);

      currentY += rowH;
    });
  }

  currentY += 4;

  // ==================== 7. LAMPIRAN BUKTI FOTO LAPANGAN ====================
  const findingsWithPhotos = loadedFindings
    .map((f, idx) => ({ ...f, itemNumber: idx + 1 }))
    .filter((f) => Boolean(f.loadedPhoto));

  const totalPhotos = (loadedAuditorPhoto ? 1 : 0) + findingsWithPhotos.length;

  if (totalPhotos > 0) {
    checkPageBreak(30);
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY, 182, 5.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(`4. LAMPIRAN BUKTI FOTO LAPANGAN (${totalPhotos} FOTO TERLAMPIR)`, 17, currentY + 3.8);
    currentY += 7;

    let photoSeq = 1;
    const photoCardW = 88;
    const photoCardH = 54;

    const allPhotoCards: Array<{
      seq: number;
      refText: string;
      title: string;
      sub: string;
      caption: string;
      isDefect: boolean;
      loadedPhoto: { dataUrl: string; format: "JPEG" | "PNG"; width: number; height: number };
    }> = [];

    if (loadedAuditorPhoto) {
      allPhotoCards.push({
        seq: photoSeq++,
        refText: "VERIFIKASI KEHADIRAN",
        title: `Foto Kehadiran: ${displayAuditorName}`,
        sub: `${displayAuditorRole} • Gerai ${report.storeName}`,
        caption: `Submit: ${report.submitDate || "-"} • ${report.submitTime || "-"}`,
        isDefect: false,
        loadedPhoto: loadedAuditorPhoto,
      });
    }

    findingsWithPhotos.forEach((p) => {
      if (p.loadedPhoto) {
        allPhotoCards.push({
          seq: photoSeq++,
          refText: `REFERENSI BUTIR #${p.itemNumber}`,
          title: `Foto Butir #${p.itemNumber}: ${(p.itemTitle || "").slice(0, 32)}`,
          sub: `Kategori: ${p.category || "-"} • ${p.hasIssue ? "Temuan Masalah" : "Sesuai SOP"}`,
          caption: p.photoCaption || `Dokumentasi bukti inspeksi butir #${p.itemNumber}`,
          isDefect: Boolean(p.hasIssue),
          loadedPhoto: p.loadedPhoto,
        });
      }
    });

    for (let i = 0; i < allPhotoCards.length; i += 2) {
      checkPageBreak(photoCardH + 4);

      // Card 1
      const p1 = allPhotoCards[i];
      const cx1 = 14;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(cx1, currentY, photoCardW, photoCardH, 1, 1, "FD");

      // Gambar 1
      try {
        doc.addImage(p1.loadedPhoto.dataUrl, p1.loadedPhoto.format, cx1 + 2, currentY + 2, photoCardW - 4, 35);
      } catch (e) {
        doc.setFillColor(241, 245, 249);
        doc.rect(cx1 + 2, currentY + 2, photoCardW - 4, 35, "F");
      }

      // Tag Nomor Urut Foto
      doc.setFillColor(p1.isDefect ? 190 : 15, p1.isDefect ? 18 : 41, p1.isDefect ? 60 : 55);
      doc.roundedRect(cx1 + 3, currentY + 3, 16, 4, 0.5, 0.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.text(`FOTO #${p1.seq}`, cx1 + 11, currentY + 5.8, { align: "center" });

      // Badge Referensi
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(cx1 + photoCardW - 32, currentY + 3, 30, 4, 0.5, 0.5, "F");
      doc.setTextColor(51, 65, 85);
      doc.setFontSize(5.5);
      doc.text(p1.refText, cx1 + photoCardW - 17, currentY + 5.8, { align: "center" });

      // Meta text di bawah foto
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(p1.title, cx1 + 3, currentY + 41);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(5.5);
      doc.setTextColor(100, 116, 139);
      doc.text(p1.sub, cx1 + 3, currentY + 45.5);
      doc.text(p1.caption.slice(0, 52), cx1 + 3, currentY + 49.5);

      // Card 2 (jika ada pasangan)
      if (i + 1 < allPhotoCards.length) {
        const p2 = allPhotoCards[i + 1];
        const cx2 = 108;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(cx2, currentY, photoCardW, photoCardH, 1, 1, "FD");

        try {
          doc.addImage(p2.loadedPhoto.dataUrl, p2.loadedPhoto.format, cx2 + 2, currentY + 2, photoCardW - 4, 35);
        } catch (e) {
          doc.setFillColor(241, 245, 249);
          doc.rect(cx2 + 2, currentY + 2, photoCardW - 4, 35, "F");
        }

        doc.setFillColor(p2.isDefect ? 190 : 15, p2.isDefect ? 18 : 41, p2.isDefect ? 60 : 55);
        doc.roundedRect(cx2 + 3, currentY + 3, 16, 4, 0.5, 0.5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.text(`FOTO #${p2.seq}`, cx2 + 11, currentY + 5.8, { align: "center" });

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cx2 + photoCardW - 32, currentY + 3, 30, 4, 0.5, 0.5, "F");
        doc.setTextColor(51, 65, 85);
        doc.setFontSize(5.5);
        doc.text(p2.refText, cx2 + photoCardW - 17, currentY + 5.8, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(15, 23, 42);
        doc.text(p2.title, cx2 + 3, currentY + 41);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(p2.sub, cx2 + 3, currentY + 45.5);
        doc.text(p2.caption.slice(0, 52), cx2 + 3, currentY + 49.5);
      }

      currentY += photoCardH + 3.5;
    }
  }

  // ==================== 8. LEMBAR PENGESAHAN PETUGAS AUDIT LAPANGAN ====================
  checkPageBreak(40);
  doc.setFillColor(241, 245, 249);
  doc.rect(14, currentY, 182, 5.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text("5. LEMBAR PENGESAHAN PETUGAS AUDIT LAPANGAN", 17, currentY + 3.8);
  currentY += 6.5;

  if (isNonCompliant) {
    // Alert Merah: Jadwal ditutup otomatis tanpa penugasan staf tunggal
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(14, currentY, 182, 16, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(159, 18, 57);
    doc.text("TIDAK ADA DOKUMENTASI PENGESAHAN & TANDA TANGAN", 105, currentY + 5.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(190, 18, 60);
    doc.text(
      "Jadwal audit ini ditutup secara otomatis oleh sistem karena melewati batas toleransi pengerjaan. Tidak ada penugasan staf tunggal,",
      105,
      currentY + 10,
      { align: "center" }
    );
    doc.text(
      "dokumentasi foto kehadiran, maupun tanda tangan digital yang tercatat di database resmi.",
      105,
      currentY + 13.5,
      { align: "center" }
    );
    currentY += 19;
  } else {
    // 100% Real Database Signature & Selfie
    const signBoxH = 34;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(14, currentY, 182, signBoxH, 1, 1, "FD");

    // Jika ada selfie auditor
    let contentStartX = 18;
    if (loadedAuditorPhoto) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.rect(18, currentY + 3, 22, 28, "FD");
      try {
        doc.addImage(loadedAuditorPhoto.dataUrl, loadedAuditorPhoto.format, 19, currentY + 4, 20, 26);
      } catch (e) {
        // fallback
      }
      contentStartX = 44;
    }

    // Kotak Tanda Tangan
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TANDA TANGAN DIGITAL AUDITOR LAPANGAN (DATABASE):", contentStartX, currentY + 5.5);

    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(contentStartX, currentY + 7, 50, 15, 0.5, 0.5, "FD");

    if (loadedSignature) {
      try {
        doc.addImage(loadedSignature.dataUrl, loadedSignature.format, contentStartX + 2, currentY + 8, 46, 13);
      } catch (e) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text("Tanda Tangan Terlampir", contentStartX + 25, currentY + 15, { align: "center" });
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text("Tanda Tangan Belum Tersedia", contentStartX + 25, currentY + 15, { align: "center" });
    }

    // Nama & Jabatan Auditor
    const textStartX = contentStartX + 54;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(displayAuditorName, textStartX, currentY + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${displayAuditorRole} • Gerai ${report.storeName}`, textStartX, currentY + 13.5);
    doc.text(`Tanggal Submit: ${report.submitDate || "-"} pukul ${report.submitTime || "-"}`, textStartX, currentY + 17.5);

    if (loadedSignature) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(21, 128, 61);
      doc.text("✓ Tervalidasi Digital dari Database", textStartX, currentY + 21.5);
    }

    // Pernyataan Integritas Auditor
    doc.setFont("helvetica", "italic");
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    const declText = `"Saya menyatakan bahwa seluruh butir evaluasi, respon pemeriksaan, dan bukti foto pada laporan ini diambil langsung di lokasi gerai ${report.storeName} sesuai dengan fakta operasional lapangan."`;
    doc.text(doc.splitTextToSize(declText, 174), 18, currentY + 28);

    currentY += signBoxH + 3.5;
  }

  // Legal Notice
  checkPageBreak(12);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 8, 1, 1, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Catatan Integritas Data: Seluruh data pada dokumen ini bersumber langsung dari database sistem audit tanpa data buatan. Waktu submit, catatan,",
    17,
    currentY + 3.2
  );
  doc.text(
    "bukti foto, serta tanda tangan digital tervalidasi secara elektronik melalui Audit Checklist System.",
    17,
    currentY + 6.2
  );

  // ==================== 9. NOMOR HALAMAN RESMI (TANPA URL BROWSER) ====================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("AUDIT & COMPLIANCE MANAGEMENT SYSTEM • DOKUMEN RESMI INTERNAL", 14, 291);
    doc.text(`Halaman ${p} dari ${totalPages}`, 196, 291, { align: "right" });
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(14, 287.5, 196, 287.5);
  }

  const pdfBlob = doc.output("blob");
  return { blob: pdfBlob, fileName };
}

/**
 * 4. EKSPOR LAPORAN SATUAN KE FILE PDF RESMI
 * Mengunduh langsung file PDF resmi berkualitas industri tanpa memunculkan dialog ganda.
 */
export async function exportSingleReport(report: AuditReportItem): Promise<void> {
  if (!report) {
    toast.error("Data laporan tidak ditemukan.");
    return;
  }

  toast.info("Menyiapkan file PDF resmi berkualitas industri...", { duration: 1500 });
  try {
    const { blob, fileName } = await generateIndividualPdfBlob(report);

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Berhasil mengunduh dokumen PDF (${fileName})`);
  } catch (err) {
    console.error("Gagal mengunduh laporan PDF:", err);
    toast.error("Gagal membuat file PDF. Silakan coba lagi.");
  }
}

/**
 * 5. EKSPOR SEMUA LAPORAN TERFILTER KE SATU ARSIP ZIP BERISI FILE-FILE PDF INDIVIDUAL & REKAP CSV
 * Memenuhi kebutuhan corporate:
 * - Menghasilkan arsip ZIP bernama: Kumpulan_Laporan_Audit_<Workspace>_<Tanggal>.zip
 * - Di dalam ZIP, setiap gerai memiliki file PDF sendiri bernama: Laporan_Audit_<NamaToko>_<Tanggal>.pdf
 * - Dilengkapi rekapitulasi standar korporat CSV di dalam ZIP: Rekap_Audit_<Workspace>_<Tanggal>.csv
 */
export async function exportAllFilteredReportsToZip(
  reports: AuditReportItem[],
  workspaceName = "Workspace"
): Promise<void> {
  if (!reports || reports.length === 0) {
    toast.error("Tidak ada data laporan audit untuk diekspor.");
    return;
  }

  // Jika hanya ada 1 laporan, langsung unduh file PDF satuannya
  if (reports.length === 1) {
    await exportSingleReport(reports[0]);
    return;
  }

  const cleanWs = sanitizeFileNamePart(workspaceName || "Audit");
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const zipFileName = `Kumpulan_Laporan_Audit_${cleanWs}_${reports.length}_Gerai_${dateStr}.zip`;

  const toastId = toast.loading(`Menyiapkan arsip ZIP berisi ${reports.length} file PDF individual...`);

  try {
    const JSZipConstructor = await getJSZip();
    const zip = new JSZipConstructor();
    const usedNames = new Map<string, number>();

    // 1. Generate masing-masing PDF laporan audit secara paralel
    let completedCount = 0;
    await Promise.all(
      reports.map(async (report) => {
        const { blob, fileName } = await generateIndividualPdfBlob(report);

        // Pastikan nama file unik di dalam zip jika ada nama gerai & tanggal yang sama
        let uniqueName = fileName;
        if (usedNames.has(fileName)) {
          const count = usedNames.get(fileName)! + 1;
          usedNames.set(fileName, count);
          uniqueName = fileName.replace(/\.pdf$/, `_${count}.pdf`);
        } else {
          usedNames.set(fileName, 1);
        }

        zip.file(uniqueName, blob);
        completedCount++;
      })
    );

    // 2. Tambahkan Rekapitulasi Standar Korporat Format CSV ke dalam ZIP
    const csvContent = generateCorporateCsvContent(reports, workspaceName);
    zip.file(`Rekap_Kompilasi_Audit_${cleanWs}_${dateStr}.csv`, csvContent);

    // 3. Compile dan kompresi ZIP
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", zipFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.dismiss(toastId);
    toast.success(`Berhasil mengunduh arsip ZIP berisi ${reports.length} file PDF laporan & 1 rekap CSV!`);
  } catch (err) {
    console.error("Gagal mengompresi laporan ke ZIP:", err);
    toast.dismiss(toastId);
    toast.error("Terjadi kesalahan saat memproses arsip ZIP.");
  }
}

/**
 * 6. EKSPOR SEMUA LAPORAN KE DOKUMEN KOMPILASI PRINT PDF (ALTERNATIF JIKA INGIN CETAK BROWSER)
 */
export async function exportAllFilteredReportsToPdf(
  reports: AuditReportItem[],
  workspaceName = "Workspace"
): Promise<void> {
  if (!reports || reports.length === 0) {
    toast.error("Tidak ada data laporan audit untuk diekspor.");
    return;
  }

  // Delegasikan ke arsip ZIP individual agar tidak membebani memori print browser
  await exportAllFilteredReportsToZip(reports, workspaceName);
}

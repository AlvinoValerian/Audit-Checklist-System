"use client";

import React from "react";
import {
  ArrowLeft,
  FileDown,
  Store,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Check,
  FileCheck,
} from "lucide-react";
import { AuditReportItem } from "@/types/report";
import { toast } from "sonner";

interface DetailLaporanViewProps {
  report: AuditReportItem;
  onBack: () => void;
}

// 10 Detailed checklist items matching the exact reference screenshot
const DETAILED_CHECKLIST_ITEMS = [
  {
    number: "01",
    question: "Apakah area meja kasir bersih, seragam rapi, dan bebas dari penumpukan struk/nota transaksi manual?",
    category: "Pelayanan & Transaksi (POS)",
    status: "TEMUAN",
    hasIssue: true,
    issueDescription:
      "Ditemukan tumpukan struk transaksi manual dan kantong plastik yang tidak terpakai di atas meja kasir 2. Selain itu, kabel terminal mesin EDC tampak semrawut dan waktu foto (14:15 WIB) tidak sesuai rentang jadwal toleransi audit (09:00 - 12:00 WIB).",
    recommendation:
      "PIC Kasir wajib membersihkan area meja kasir dan merapikan kabel EDC maksimal dalam waktu 1x24 jam. Pasang penutup jalur kabel bawah meja.",
    photoUrl: "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=600&auto=format&fit=crop",
    photoCaption: "Foto_POS_02_Sudirman.jpg",
    photoTimestamp: "18 Agu - 14:15 WIB",
  },
  {
    number: "02",
    question: "Apakah mesin EDC, scanner barcode, dan printer struk kasir berfungsi normal tanpa kendala koneksi?",
    category: "Perangkat & Hardware POS",
    status: "SESUAI",
    hasIssue: false,
    auditorNote:
      "Semua perangkat POS 1 dan POS 2 berfungsi optimal. Kertas struk cadangan tersedia 3 roll di laci kasir.",
    photoUrl: "https://images.unsplash.com/photo-1584473457406-6240486418e9?q=80&w=600&auto=format&fit=crop",
    photoCaption: "Foto_EDC_POS.jpg",
    photoTimestamp: "18 Agu - 10:15 WIB",
  },
  {
    number: "03",
    question: "Apakah kebersihan lorong belanja bebas dari debu, tumpahan cairan, dan kardus sisa kardus/barang berserakan?",
    category: "Kebersihan & Area Belanja Toko",
    status: "SESUAI",
    hasIssue: false,
    auditorNote:
      "Kondisi lantai lorong belanja dipel bersih dan tidak ada kardus sisa penataan barang yang menghalangi lorong pelanggan. Jadwal sweeping harian terlaksana.",
    photoUrl: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=600&auto=format&fit=crop",
    photoCaption: "Foto_Lorong_Utama.jpg",
    photoTimestamp: "18 Agu - 10:20 WIB",
  },
  {
    number: "04",
    question: "Apakah penataan produk di rak gondola rapi sesuai planogram dan semua label harga (price tag) terpasang jelas?",
    category: "Display, Merchandising & Price Tag",
    status: "SESUAI",
    hasIssue: false,
    auditorNote:
      "Semua produk tertata rapi sesuai standar visual merchandising dan label harga elektronik (ESL) aktif tanpa kendala. Tidak ditemukan label harga hilang atau terlipat.",
    photoUrl: "https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?q=80&w=600&auto=format&fit=crop",
    photoCaption: "Foto_Display_Rak.jpg",
    photoTimestamp: "18 Agu - 10:28 WIB",
  },
  {
    number: "05",
    question: "Apakah temperatur chiller pendingin minuman sesuai standar (2°C - 6°C) dan pintu kaca tertutup rapat?",
    category: "Peralatan Pendingin & Chiller Minuman",
    status: "SESUAI",
    hasIssue: false,
    auditorNote:
      "Termometer digital chiller menunjukkan angka 3.2°C (dalam rentang aman 2-6°C). Lampu showcase menyala terang dan karet pintu masih kedap.",
    photoUrl: "https://images.unsplash.com/photo-1588964895597-cfccd6e2dbf9?q=80&w=600&auto=format&fit=crop",
    photoCaption: "Foto_Chiller_Minuman.jpg",
    photoTimestamp: "18 Agu - 10:35 WIB",
  },
  {
    number: "06",
    question: "Apakah seluruh staf toko mengenakan seragam resmi, name tag pribadi, dan berpenampilan rapi?",
    category: "Standar Grooming & Kehadiran Staf",
    status: "SESUAI",
    hasIssue: false,
    auditorNote:
      "Total 4 staf shift pagi mengenakan seragam rapi dan atribut lengkap sesuai SOP. Tidak ada pelanggaran kerapian rambut dan kuku.",
  },
  {
    number: "07",
    question: "Apakah alat pemadam api ringan (APAR) tersedia di lokasi yang mudah dijangkau dengan jarum tekanan pada zona hijau?",
    category: "K3 & Fasilitas Keselamatan Toko",
    status: "SESUAI",
    hasIssue: false,
    auditorNote:
      "Tabung APAR diposisikan di samping pintu kasir. Jarum pressure gauge tepat berada pada zona hijau (stabil) dan masa berlaku hingga Desember 2025.",
  },
  {
    number: "08",
    question: "Apakah pintu darurat / jalur evakuasi bebas dari tumpukan barang dan tidak terkunci gembok dari dalam?",
    category: "K3 & Jalur Evakuasi Darurat",
    status: "SESUAI",
    hasIssue: false,
    auditorNote:
      "Pintu darurat belakang toko bebas hambatan dan sistem kunci push bar dapat difungsikan seketika tanpa halangan.",
  },
  {
    number: "09",
    question: "Apakah panel listrik utama (MCB box) dalam kondisi tertutup rapi dan tidak ada kabel terkelupas?",
    category: "Instalasi Kelistrikan & Utilitas Toko",
    status: "SESUAI",
    hasIssue: false,
    auditorNote:
      "Panel listrik terkunci rapi, bebas debu berlebih, dan seluruh saklar sirkuit telah diberi label penanda zona beban.",
  },
  {
    number: "10",
    question: "Apakah display promo POP / standing banner terbitan resmi terkini tanpa adanya materi promosi kadaluarsa?",
    category: "Materi Promosi & POSM Toko",
    status: "SESUAI",
    hasIssue: false,
    auditorNote:
      "Banner promo 'Spesial Kemerdekaan' terpasang rapi di area entrance toko dan tidak ditemukan standing banner periode sebelumnya.",
  },
];

export default function DetailLaporanView({ report, onBack }: DetailLaporanViewProps) {
  const handleDownloadPdf = () => {
    toast.success(`Mengunduh PDF Laporan ${report.storeName}...`);
  };

  return (
    <div className="space-y-5 pb-10 animate-in fade-in duration-200">
      {/* Back Link */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Kembali ke Daftar Laporan</span>
        </button>
      </div>

      {/* Main Header with Action Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Detail Laporan Hasil Audit
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Dokumentasi lengkap hasil evaluasi kepatuhan operasional checklist lapangan beserta bukti foto dan tanda tangan petugas.
          </p>
        </div>

        {/* Action Button: Direct Download */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#193f53] hover:bg-[#143343] text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Unduh Laporan PDF</span>
          </button>
        </div>
      </div>

      {/* Overview Cards Row (2 Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Card: INFORMASI AUDIT & LOKASI */}
        <div className="lg:col-span-7 bg-[#fffdfa] border border-[#f5ede4] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <div className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[10px] font-bold text-slate-600">
                  i
                </div>
                <span>INFORMASI AUDIT & LOKASI</span>
              </div>
              <span className="text-[11px] text-slate-400 font-medium">
                Inspeksi Lapangan
              </span>
            </div>

            {/* Inner 2 Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* NAMA TOKO */}
              <div className="bg-[#fcfaf7] border border-[#f5ece0] rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <Store className="w-3.5 h-3.5 text-slate-500" />
                  <span>NAMA TOKO</span>
                </div>
                <p className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                  {report.storeName}
                </p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  {report.storeLocation}
                </p>
              </div>

              {/* NAMA JADWAL */}
              <div className="bg-[#fcfaf7] border border-[#f5ece0] rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                  <span>NAMA JADWAL</span>
                </div>
                <p className="text-xs sm:text-[13px] font-normal text-slate-800 leading-snug">
                  {report.scheduleName || "Checklist Operasional Harian"}
                </p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Jadwal: Setiap Hari (09:00 - 12:00 WIB)
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-[#f5ece0]/60">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Waktu Submit: <strong className="text-slate-800 font-bold">{report.submitDate}, 11:15 WIB</strong>
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-semibold bg-emerald-50/90 border border-emerald-200 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Geofence Radius 100m Valid
            </span>
          </div>
        </div>

        {/* Right Card: RINGKASAN HASIL EVALUASI */}
        <div className="lg:col-span-5 bg-[#fffdfa] border border-[#f5ede4] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            {/* Header Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                <FileCheck className="w-4 h-4 text-slate-600" />
                <span>RINGKASAN HASIL EVALUASI</span>
              </div>
              <span className="text-[11px] font-bold text-slate-700">
                Total 10 Butir
              </span>
            </div>

            {/* Two score boxes */}
            <div className="grid grid-cols-2 gap-3">
              {/* Sesuai Box */}
              <div className="bg-[#f4fbf6] border border-emerald-200 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    SESUAI
                  </span>
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-extrabold text-emerald-700 leading-none">
                    9 <span className="text-xs font-bold text-emerald-700">Butir (90%)</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium mt-1">
                    Jawaban: YES
                  </p>
                </div>
              </div>

              {/* Temuan Box */}
              <div className="bg-[#fef6f6] border border-rose-200 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                    TEMUAN
                  </span>
                  <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <XCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-extrabold text-rose-700 leading-none">
                    1 <span className="text-xs font-bold text-rose-700">Butir (10%)</span>
                  </div>
                  <p className="text-[10px] text-rose-600 font-medium mt-1">
                    Jawaban: NO
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Bar & Kepatuhan */}
          <div className="pt-3 mt-3 border-t border-[#f5ece0]/60">
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1.5">
              <span>Tingkat Kepatuhan:</span>
              <span className="font-bold text-slate-900">90% (Kategori: Baik)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: "90%" }} />
              <div className="bg-rose-500 h-full" style={{ width: "10%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Daftar Evaluasi Checklist Pertanyaan & Jawaban */}
      <div className="space-y-3">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Daftar Evaluasi Checklist Pertanyaan & Jawaban
            </h3>
            <p className="text-[11px] text-slate-500">
              Seluruh pertanyaan evaluasi operasional dengan respon YES / NO, deskripsi catatan, dan foto dokumentasi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              9 Butir Sesuai
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-600">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              1 Temuan Masalah
            </span>
          </div>
        </div>

        {/* List of 10 Checklist Cards */}
        <div className="space-y-3">
          {DETAILED_CHECKLIST_ITEMS.map((item) => (
            <div
              key={item.number}
              className={`rounded-xl border p-4 shadow-xs transition-all ${
                item.hasIssue
                  ? "bg-rose-50/15 border-rose-200"
                  : "bg-white border-slate-200"
              }`}
            >
              {/* Question Header Row */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 ${
                      item.hasIssue
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {item.number}
                  </span>
                  <div>
                    <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                      {item.question}
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Kategori: {item.category}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
                  {item.hasIssue ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      TEMUAN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      SESUAI
                    </span>
                  )}
                </div>
              </div>

              {/* Body Content Row: Finding & Photo */}
              <div className="pt-3 grid grid-cols-1 lg:grid-cols-12 gap-3.5">
                {/* Left: Notes / Description */}
                <div className={`${item.photoUrl ? "lg:col-span-8" : "lg:col-span-12"} space-y-2.5`}>
                  {item.hasIssue ? (
                    /* Alert Temuan */
                    <div className="bg-rose-50/60 border border-rose-200 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-rose-700 uppercase tracking-wider mb-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>DESKRIPSI TEMUAN AUDITOR:</span>
                      </div>
                      <p className="text-[11px] text-rose-900 font-medium leading-relaxed">
                        {item.issueDescription}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-slate-50/50 border border-slate-200 rounded-lg p-3 text-xs">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                        <span>💬 DESKRIPSI / CATATAN AUDITOR:</span>
                      </div>
                      <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                        {item.auditorNote}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right: Photo Card (if photo exists) */}
                {item.photoUrl && (
                  <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-2 flex flex-col justify-between shadow-2xs">
                    <div className="relative aspect-[16/10] rounded-md overflow-hidden bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.photoUrl}
                        alt={item.photoCaption}
                        className="w-full h-full object-cover"
                      />
                      {item.hasIssue && (
                        <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[8px] uppercase tracking-wider shadow-sm">
                          KETIDAKSESUAIAN
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1.5 px-0.5">
                      <span className="truncate max-w-[140px]">{item.photoCaption}</span>
                      <span>{item.photoTimestamp}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3: Pengesahan & Verifikasi Petugas Audit Lapangan */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div>
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span>Pengesahan & Verifikasi Petugas Audit Lapangan</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Validasi autentikasi auditor pelaksana dengan dokumentasi foto kehadiran langsung di lokasi dan tanda tangan digital resmi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-1">
          {/* Left: Auditor Selfie Verification Card (Compact) */}
          <div className="md:col-span-4 bg-[#fffdfa] border border-[#f5ede4] rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
            {/* Selfie Photo - Compact */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden shadow-2xs bg-slate-900 mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=500&auto=format&fit=crop"
                alt="Verifikasi Selfie di Toko"
                className="w-full h-full object-cover"
              />
              {/* Bottom Overlay Badge */}
              <div className="absolute bottom-1.5 inset-x-1.5 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-medium rounded flex items-center justify-center">
                Verifikasi Selfie di Toko
              </div>
            </div>

            {/* Name & Role */}
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-2">
              {report.auditorName || "Budi Santoso"}
            </h4>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-medium mt-1">
              <svg className="w-3 h-3 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <circle cx="9" cy="15" r="2" />
                <path d="M14 15h3" />
              </svg>
              <span>{report.auditorRole || "Auditor Lapangan"}</span>
            </div>

            <p className="text-[9.5px] text-slate-400 mt-1.5 font-medium">
              Clock-in: 18 Agu 2024 • 09:28 WIB (GPS Valid)
            </p>
          </div>

          {/* Right: Digital Signature & Declaration Statement (Compact) */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                TANDA TANGAN DIGITAL AUDITOR LAPANGAN:
              </span>

              {/* Dashed Signature Box - Compact */}
              <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-white p-3 h-28 sm:h-32 flex items-center justify-center">
                {/* Authentic Signature Graphic */}
                <svg
                  className="w-44 h-16 text-slate-800"
                  viewBox="0 0 260 80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 55 C 35 15, 45 10, 55 45 C 65 65, 80 60, 95 48 C 110 35, 125 45, 135 60 C 145 65, 160 30, 175 35 C 190 40, 205 55, 230 45" />
                  <path d="M45 42 L 105 40" />
                  <circle cx="236" cy="42" r="2.5" fill="currentColor" />
                </svg>

                {/* Bottom-right Tervalidasi Badge */}
                <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md text-[9.5px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Tervalidasi Digital • 18 Agu 2024</span>
                </div>
              </div>
            </div>

            {/* Declaration Box */}
            <div className="rounded-xl border border-slate-200/80 bg-[#faf8f5]/80 p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                Saya menyatakan bahwa seluruh butir evaluasi, respon Yes/No, catatan temuan, dan foto dokumentasi pada laporan ini adalah benar diambil langsung di lokasi {report.storeName} sesuai dengan fakta operasional lapangan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

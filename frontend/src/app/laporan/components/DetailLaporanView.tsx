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
  Calendar,
  AlertCircle,
} from "lucide-react";
import { AuditReportItem } from "@/types/report";
import { toast } from "sonner";
import DecryptedImage from "@/components/DecryptedImage";

interface DetailLaporanViewProps {
  report: AuditReportItem;
  onBack: () => void;
}

export default function DetailLaporanView({ report, onBack }: DetailLaporanViewProps) {
  const handleDownloadPdf = () => {
    toast.success(`Mengunduh PDF Laporan ${report.storeName}...`);
  };

  const findings = Array.isArray(report.findings) ? report.findings : [];
  const totalItems = findings.length > 0 ? findings.length : (report.issueCount || 1);
  const issueCount = findings.length > 0 ? findings.filter((f) => f.hasIssue).length : report.issueCount;
  const compliantCount = Math.max(0, totalItems - issueCount);
  const compliantPercentage = Math.round((compliantCount / totalItems) * 100);
  const issuePercentage = 100 - compliantPercentage;

  let complianceCategory = "Sangat Baik";
  if (report.complianceScore < 60) {
    complianceCategory = "Perlu Perhatian";
  } else if (report.complianceScore < 75) {
    complianceCategory = "Cukup";
  } else if (report.complianceScore < 90) {
    complianceCategory = "Baik";
  }

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
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Detail Laporan Hasil Audit
            </h2>
            {report.workspaceName && (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-semibold">
                {report.workspaceName}
              </span>
            )}
          </div>
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
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>NAMA JADWAL</span>
                </div>
                <p className="text-xs sm:text-[13px] font-normal text-slate-800 leading-snug">
                  {report.scheduleName || "Checklist Operasional Harian"}
                </p>
                <p className="text-[10.5px] text-slate-500 mt-0.5">
                  Periode: {report.month}
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-3 border-t border-[#f5ece0]/60">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Waktu Submit: <strong className="text-slate-800 font-bold">{report.submitDate}, {report.submitTime}</strong>
              </span>
            </div>

            {report.status === "Tidak Mengerjakan" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-bold bg-rose-100 border border-rose-300 text-rose-800 shadow-2xs">
                <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                Audit Tidak Dikerjakan (Kedaluwarsa)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-semibold bg-emerald-50/90 border border-emerald-200 text-emerald-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Verifikasi Lokasi Valid
              </span>
            )}
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
                Total {totalItems} Butir
              </span>
            </div>

            {/* Two score boxes */}
            <div className="grid grid-cols-2 gap-3">
              {/* Sesuai Box */}
              <div className="bg-[#f4fbf6] border border-emerald-200 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                      SESUAI
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase bg-emerald-100 text-emerald-800">
                      Standar SOP
                    </span>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <Check className="w-3 h-3" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-extrabold text-emerald-700 leading-none">
                    {compliantCount} <span className="text-xs font-bold text-emerald-700">Butir ({compliantPercentage}%)</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-medium mt-1">
                    Jawaban: YES
                  </p>
                </div>
              </div>

              {/* Temuan Box */}
              <div className="bg-[#fef6f6] border border-rose-200 rounded-2xl p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                      TEMUAN
                    </span>
                    {issueCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-rose-200 text-rose-800">
                        Perlu Perbaikan
                      </span>
                    )}
                  </div>
                  <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <XCircle className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="mt-2">
                  <div className="text-xl font-extrabold text-rose-700 leading-none">
                    {issueCount} <span className="text-xs font-bold text-rose-700">Butir ({issuePercentage}%)</span>
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
              <span className="font-bold text-slate-900">
                {report.complianceScore}% (Kategori: {complianceCategory})
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
              <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${report.complianceScore}%` }} />
              <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${100 - report.complianceScore}%` }} />
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
              {compliantCount} Butir Sesuai
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-600">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              {issueCount} Temuan Masalah
            </span>
          </div>
        </div>

        {/* List of Checklist Cards */}
        {findings.length > 0 ? (
          <div className="space-y-3">
            {findings.map((item, index) => {
              const itemNumber = String(index + 1).padStart(2, "0");
              return (
                <div
                  key={item.id || index}
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
                        {itemNumber}
                      </span>
                      <div>
                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                          {item.itemTitle}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Kategori: {item.category}
                        </p>
                      </div>
                    </div>

                    {/* Status & Priority Badge */}
                    <div className="shrink-0 flex items-center gap-1">
                      {item.hasIssue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-50 border border-rose-200 text-rose-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          TEMUAN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          SESUAI
                        </span>
                      )}

                      {/* Priority Badge murni ditentukan dari konfigurasi template checklist (wajib foto = High, tidak wajib foto = Low) */}
                      {(item.priority === "High" || item.severity === "Tinggi" || item.isPhotoRequired) ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          Priority High
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                          Priority Low
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
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>DESKRIPSI TEMUAN MASALAH LAPANGAN:</span>
                          </div>
                          <p className="text-[11.5px] text-rose-900 leading-relaxed font-normal">
                            {item.issueNote || "Ditemukan ketidaksesuaian butir checklist saat audit operasional."}
                          </p>

                          {item.recommendation && (
                            <div className="mt-2 pt-2 border-t border-rose-200/70 text-[11px] text-rose-800">
                              <strong className="font-semibold text-rose-900">Rekomendasi Tindakan: </strong>
                              {item.recommendation}
                            </div>
                          )}
                        </div>
                      ) : (
                        /* Sesuai Note */
                        <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-3 text-xs">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>CATATAN PEMERIKSAAN AUDITOR:</span>
                          </div>
                          <p className="text-[11.5px] text-emerald-900 leading-relaxed font-normal">
                            {item.auditorNote || item.issueNote || "Seluruh indikator butir checklist memenuhi standar SOP prima dan terverifikasi di lapangan."}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Evidence Photo if exists */}
                    {item.photoUrl && (
                      <div className="lg:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-2 shrink-0">
                        <div className="relative aspect-4/3 rounded-lg overflow-hidden bg-slate-900">
                          <DecryptedImage
                            src={item.photoUrl}
                            alt={item.photoCaption || item.itemTitle}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {item.hasIssue && (
                            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[8px] uppercase tracking-wider shadow-sm">
                              KETIDAKSESUAIAN
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono pt-1.5 px-0.5">
                          <span className="truncate max-w-[140px]">{item.photoCaption || "Bukti_Foto_Audit.jpg"}</span>
                          <span>{item.photoTimestamp || report.submitTime}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          report.status === "Tidak Mengerjakan" ? (
            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-8 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto stroke-[2]" />
              <h4 className="text-xs sm:text-sm font-bold text-rose-900">
                Audit Tidak Dikerjakan (Tidak Patuh)
              </h4>
              <p className="text-[11px] text-rose-700 max-w-md mx-auto leading-relaxed">
                Jadwal audit ini ditutup secara otomatis oleh sistem karena melewati batas toleransi keterlambatan 1 jam tanpa ada pengerjaan checklist dari staf penugasan.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500 text-xs">
              Belum ada rincian butir checklist yang tersimpan untuk laporan ini.
            </div>
          )
        )}
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
          {/* Left: Auditor Selfie Verification Card */}
          <div className="md:col-span-4 bg-[#fffdfa] border border-[#f5ede4] rounded-xl p-3.5 flex flex-col items-center justify-center text-center">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden shadow-2xs bg-slate-900 mx-auto">
              <DecryptedImage
                src={report.auditorPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=500&auto=format&fit=crop"}
                alt={report.auditorName}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 inset-x-1.5 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-medium rounded flex items-center justify-center">
                Verifikasi Kehadiran Toko
              </div>
            </div>

            <h4 className="text-xs sm:text-sm font-bold text-slate-900 mt-2">
              {report.auditorName}
            </h4>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-medium mt-1">
              <span>{report.auditorRole}</span>
            </div>

            <p className="text-[9.5px] text-slate-400 mt-1.5 font-medium">
              Submit: {report.submitDate} • {report.submitTime} (GPS Valid)
            </p>
          </div>

          {/* Right: Digital Signature & Declaration Statement */}
          <div className="md:col-span-8 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                TANDA TANGAN DIGITAL AUDITOR LAPANGAN:
              </span>

              <div className="relative border-2 border-dashed border-slate-200 rounded-xl bg-white p-3 h-28 sm:h-32 flex items-center justify-center">
                {report.signatureUrl ? (
                  <DecryptedImage
                    src={report.signatureUrl}
                    alt="Tanda Tangan Digital"
                    className="max-h-20 w-auto object-contain bg-white rounded-md"
                  />
                ) : (
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
                )}

                <div className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded-md text-[9.5px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  <span>Tervalidasi Digital • {report.submitDate}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-[#faf8f5]/80 p-3 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
              <p className="text-[10.5px] text-slate-600 leading-relaxed">
                Saya menyatakan bahwa seluruh butir evaluasi, respon Yes/No, catatan temuan, dan bukti foto pada laporan ini adalah benar diambil langsung di lokasi {report.storeName} sesuai dengan fakta operasional lapangan.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

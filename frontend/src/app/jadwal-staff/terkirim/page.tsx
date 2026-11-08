"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Store as StoreIcon,
  Check,
  CheckCircle2,
  FileText,
  Clock,
  User,
  ArrowRight,
  X,
  Smartphone,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";

interface ReportDetail {
  reportId: string;
  reportNumber: string;
  status: string;
  isLate: boolean;
  totalQuestions: number;
  answeredQuestions: number;
  scoreText: string;
  storeName: string;
  storeCode: string;
  storeLocation: string;
  scheduleTitle: string;
  signerName: string;
  signerRole: string;
  submittedAt: string;
  submittedAtFormatted: string;
}

function TerkirimContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportIdParam = searchParams.get("reportId") || "";
  const scheduleIdParam = searchParams.get("scheduleId") || "";

  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [report, setReport] = useState<ReportDetail | null>(null);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    // Bersihkan sisa cache lokal pengerjaan tugas
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("staff_completed_tasks");
      } catch (e) {}
    }

    // Ambil data detail laporan resmi dari backend database PostgreSQL
    const fetchReport = async () => {
      try {
        setLoading(true);
        const token = AuthService.getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const endpoint = reportIdParam
          ? `/api/staff/reports/${reportIdParam}`
          : `/api/staff/reports/latest`;

        let res = await fetch(endpoint, { headers });
        if (!res.ok) {
          res = await fetch(`http://127.0.0.1:5000${endpoint}`, { headers });
        }

        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setReport(json.data);
          }
        }
      } catch (err) {
        console.error("Gagal memuat detail laporan database:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportIdParam, scheduleIdParam]);

  const displayReportNumber = report?.reportNumber
    ? (report.reportNumber.startsWith("#") ? report.reportNumber : `#${report.reportNumber}`)
    : (reportIdParam ? `#CHK-${reportIdParam.slice(0, 8).toUpperCase()}` : "-");
  const isLate = Boolean(report?.isLate || report?.status === "terlambat");
  const totalItems = report?.totalQuestions ?? 0;
  const answeredItems = report?.answeredQuestions ?? totalItems;
  const scorePercent = report?.scoreText || "-";
  const displayStore = report?.storeName
    ? `${report.storeName}${report.storeCode ? ` (${report.storeCode})` : ""}`
    : (currentUser?.storeLocation || "-");
  const displaySchedule = report?.scheduleTitle || "-";
  const displaySigner = report?.signerName || currentUser?.fullName || "-";
  const displayRole = report?.signerRole || currentUser?.position || "";
  const displayTime = report?.submittedAtFormatted || "-";

  const handleReturnToDashboard = () => {
    router.push("/jadwal-staff");
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-900 sm:relative sm:inset-auto sm:min-h-screen sm:bg-slate-900 sm:flex sm:items-center sm:justify-center sm:py-6 sm:px-4 font-sans antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Layar Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Checklist Berhasil Dikirim (Mobile View)
        </span>
        <button
          onClick={() => setIsFullscreenMode(!isFullscreenMode)}
          className="ml-2 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer touch-manipulation active:scale-95"
        >
          <Maximize2 className="w-3 h-3" />
          {isFullscreenMode ? "Bingkai HP" : "Layar Penuh"}
        </button>
      </div>

      {/* Smartphone Device Frame Container */}
      <div
        className={`w-full h-full flex flex-col bg-[#f8fbff] text-slate-900 transition-all duration-300 relative ${
          isFullscreenMode
            ? "max-w-md sm:rounded-none sm:shadow-none sm:h-screen"
            : "sm:h-[844px] sm:max-h-[92vh] sm:max-w-[420px] sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] sm:border-[9px] sm:border-slate-800 sm:ring-1 sm:ring-white/10 overflow-hidden"
        }`}
      >
        {/* Dynamic Island / Speaker Pill on Desktop Frame */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 pointer-events-none" />

        {/* 2. Top Navigation Bar matching the design */}
        <div className="px-5 pt-3.5 sm:pt-3 pb-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white shadow-2xs border border-slate-200/80 flex items-center justify-center text-slate-800">
              <StoreIcon className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="font-bold text-sm text-slate-900">
              Store Ops Audit
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 font-mono text-[10px] font-bold rounded-full">
              LIVE SYNC
            </span>
            <button
              onClick={handleReturnToDashboard}
              className="w-7 h-7 rounded-full hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-95"
              aria-label="Tutup"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-3 flex flex-col justify-between">
          <div>
            {/* 3. Hero Success Icon with Glow Ring */}
            <div className="text-center mt-2 sm:mt-4">
              <div className="relative inline-flex items-center justify-center">
                {/* Outer Glow Halo */}
                <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100/90 flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-300">
                  {/* Inner Vibrant Circle */}
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                </div>
              </div>

              {/* Headline */}
              <h1 className="text-xl sm:text-[22px] font-bold text-slate-900 mt-4 tracking-tight leading-tight">
                Checklist Berhasil Dikirim
              </h1>

              {/* Subtitle */}
              <p className="text-xs text-slate-500 max-w-[270px] mx-auto text-center mt-2 leading-relaxed">
                Laporan audit operasional Anda telah tersimpan dan terverifikasi secara aman di sistem pusat.
              </p>
            </div>

            {/* 4. Receipt / Verification Summary Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100/90 shadow-[0_4px_24px_rgba(0,0,0,0.04)] mt-6 space-y-4">
              {/* Header: Audit Code & Verified Badges */}
              <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>{loading ? "Memuat..." : displayReportNumber}</span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {isLate && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-600" />
                      <span>Terlambat</span>
                    </span>
                  )}
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-md">
                    Terverifikasi GPS & E-Sign
                  </span>
                </div>
              </div>

              {/* Evaluation Score Box */}
              <div className="bg-[#f0fdf4]/80 border border-emerald-100 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none block">
                      HASIL EVALUASI
                    </span>
                    <span className="text-sm font-bold text-slate-900 leading-tight mt-0.5 block">
                      {loading ? "Menghitung data..." : `${answeredItems} dari ${totalItems} Item Selesai`}
                    </span>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-sm rounded-full">
                  {loading ? "..." : scorePercent}
                </span>
              </div>

              {/* Details List Rows */}
              <div className="space-y-2.5 pt-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <StoreIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Toko</span>
                  </span>
                  <span className="font-bold text-slate-900 text-right truncate">
                    {loading ? "..." : displayStore}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jadwal</span>
                  </span>
                  <span className="font-bold text-slate-900 text-right truncate">
                    {loading ? "..." : displaySchedule}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Petugas</span>
                  </span>
                  <span className="text-right">
                    <span className="font-bold text-slate-900">{loading ? "..." : displaySigner}</span>{" "}
                    {displayRole ? <span className="text-slate-500 font-normal">({displayRole})</span> : null}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Waktu Serah</span>
                  </span>
                  <span className="font-semibold font-mono text-slate-800 text-right">
                    {loading ? "..." : displayTime}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Bottom Action Section */}
          <div className="pt-6 pb-5">
            {/* Primary Action Button */}
            <button
              onClick={handleReturnToDashboard}
              className="w-full py-3.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
            >
              <span>Kembali ke Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChecklistTerkirimPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Memuat tanda terima pengiriman...</span>
          </div>
        </div>
      }
    >
      <TerkirimContent />
    </Suspense>
  );
}

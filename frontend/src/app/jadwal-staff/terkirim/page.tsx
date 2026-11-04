"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Store as StoreIcon,
  Check,
  CheckCircle2,
  FileText,
  Clock,
  User,
  ArrowRight,
  Cloud,
  X,
  Share2,
  Download,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  RotateCcw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";

function TerkirimContent() {
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState<string>("11:38");
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>(
    "24 Okt 2024, 11:38 WIB"
  );
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showPdfModal, setShowPdfModal] = useState<boolean>(false);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    // Pastikan task sch-2 tersimpan sebagai selesai di localStorage
    if (typeof window !== "undefined") {
      try {
        const completed = JSON.parse(
          localStorage.getItem("staff_completed_tasks") || "[]"
        );
        if (!completed.includes("sch-2")) {
          completed.push("sch-2");
          localStorage.setItem("staff_completed_tasks", JSON.stringify(completed));
        }
      } catch (e) {
        console.warn(e);
      }
    }

    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Agu",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
      setCurrentDateFormatted(
        `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${hours}:${minutes} WIB`
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  const displayName = currentUser?.fullName || "Siti Rahmawati";
  const displayLocation =
    currentUser?.storeLocation || currentUser?.storeCode
      ? `${currentUser.storeLocation || "Mall Kelapa Gading 3"} (${currentUser.storeCode || "KK-JKT-15"})`
      : "Mall Kelapa Gading 3 (KK-JKT-15)";

  const handleReturnToDashboard = () => {
    router.push("/jadwal-staff?completed=sch-2");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center sm:py-6 p-0 sm:px-4 font-sans select-none antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Layar Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Checklist Berhasil Dikirim (Mobile View)
        </span>
        <button
          onClick={() => setIsFullscreenMode(!isFullscreenMode)}
          className="ml-2 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer"
        >
          <Maximize2 className="w-3 h-3" />
          {isFullscreenMode ? "Bingkai HP" : "Layar Penuh"}
        </button>
      </div>

      {/* Smartphone Device Frame Container */}
      <div
        className={`w-full bg-[#f8fbff] text-slate-900 transition-all duration-300 relative flex flex-col ${
          isFullscreenMode
            ? "max-w-md min-h-screen sm:rounded-none sm:shadow-none"
            : "max-w-[420px] min-h-[844px] sm:max-h-[92vh] sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] sm:border-[9px] sm:border-slate-800 sm:ring-1 sm:ring-white/10 overflow-hidden"
        }`}
      >
        {/* Dynamic Island / Speaker Pill on Desktop Frame */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 pointer-events-none" />

        {/* 1. Mobile Status Bar */}
        <div className="pt-3 px-6 pb-1 flex items-center justify-between text-slate-900 font-semibold text-xs tracking-tight z-20 shrink-0 select-none bg-transparent">
          <span className="text-sm font-bold tracking-tight">{currentTime}</span>
          <div className="flex items-center gap-1.5 text-slate-800">
            <Signal className="w-3.5 h-3.5 stroke-[2.2]" />
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
            <Battery className="w-4 h-4 stroke-[2.2]" />
          </div>
        </div>

        {/* 2. Top Navigation Bar matching the image */}
        <div className="px-5 py-3 flex items-center justify-between shrink-0">
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
              className="w-7 h-7 rounded-full hover:bg-slate-200/60 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-5 py-3 flex flex-col justify-between">
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
              {/* Header: Audit Code & Verified Badge */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>#CHK-20241024-8824</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-md">
                  Terverifikasi GPS & E-Sign
                </span>
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
                      8 dari 8 Item Selesai
                    </span>
                  </div>
                </div>

                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-sm rounded-full">
                  100%
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
                    {displayLocation}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Jadwal</span>
                  </span>
                  <span className="font-bold text-slate-900 text-right">
                    Hygiene & Sanitasi Meja Bar
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Petugas</span>
                  </span>
                  <span className="text-right">
                    <span className="font-bold text-slate-900">{displayName}</span>{" "}
                    <span className="text-slate-500 font-normal">(Senior Barista)</span>
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Waktu Serah</span>
                  </span>
                  <span className="font-semibold font-mono text-slate-800 text-right">
                    {currentDateFormatted}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Bottom Action Section */}
          <div className="pt-6 pb-4">
            {/* Primary Action Button */}
            <button
              onClick={handleReturnToDashboard}
              className="w-full py-3.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Kembali ke Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Secondary Quick Links matching image */}
            <div className="mt-3.5 flex items-center justify-center gap-2 text-xs font-semibold text-slate-700">
              <button
                onClick={() => setShowPdfModal(true)}
                className="hover:text-blue-700 transition-colors cursor-pointer flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                <span>Lihat Bukti Pengiriman (PDF)</span>
              </button>

              <span className="text-slate-300">•</span>

              <button
                onClick={() => router.push("/jadwal-staff/riwayat")}
                className="hover:text-blue-700 transition-colors cursor-pointer flex items-center gap-1"
              >
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Riwayat Hari Ini</span>
              </button>
            </div>

            {/* Offline Sync Subtitle */}
            <div className="mt-4 flex items-center justify-center gap-1 text-[11px] text-slate-400 select-none">
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
              <span>Disinkronkan otomatis dengan Workspace Store Manager</span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: BUKTI PENGIRIMAN DIGITAL (PDF PREVIEW) */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Bukti Serah Terima Resmi
                </h3>
              </div>
              <button
                onClick={() => setShowPdfModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Nomor Registrasi:</span>
                <span className="font-mono font-bold text-slate-800">#CHK-20241024-8824</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hash Dokumen:</span>
                <span className="font-mono text-slate-600 text-[10px]">SHA256: 8F4C...92BA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Petugas / Auditor:</span>
                <span className="font-semibold text-slate-800">{displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Koordinat Validasi:</span>
                <span className="font-mono text-slate-600 text-[10px]">-6.15842, 106.90821</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status Validasi:</span>
                <span className="text-emerald-600 font-bold">100% Lolos Audit</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  toast.success("Dokumen bukti audit PDF berhasil diunduh!");
                  setShowPdfModal(false);
                }}
                className="w-full py-2.5 bg-[#193f53] hover:bg-[#122f3e] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Salinan Dokumen PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
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

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Store as StoreIcon,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  KeyRound,
  FileText,
  LogOut,
  ChevronRight,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  RotateCcw,
  Sparkles,
  Info,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";
import StaffBottomNav from "../components/StaffBottomNav";

function ProfileContent() {
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState<string>("09:41");
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = () => {
    AuthService.logout();
    toast.info("Anda telah logout dari aplikasi.");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    } else {
      router.push("/login");
    }
  };

  const displayName = currentUser?.fullName || "Staf Lapangan";
  const displayEmail = currentUser?.email || "staff@gacoan.com";
  const displayPhone = currentUser?.phone || "-";
  const displayStore = currentUser?.storeName || "Mie Gacoan";
  const displayLocation = currentUser?.storeLocation || "Malang";
  const displayStoreCode = currentUser?.storeCode || "ST-01";
  const displayRole = currentUser?.position || "Auditor Lapangan";

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center sm:py-6 p-0 sm:px-4 font-sans select-none antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Layar Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Profil Staff (Mobile View)
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
        <div className="pt-3 px-6 pb-1 flex items-center justify-between text-slate-900 font-semibold text-xs tracking-tight z-20 shrink-0 select-none bg-white/70 backdrop-blur-md border-b border-slate-100/50">
          <span className="text-sm font-bold tracking-tight">{currentTime}</span>
          <div className="flex items-center gap-1.5 text-slate-800">
            <Signal className="w-3.5 h-3.5 stroke-[2.2]" />
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
            <Battery className="w-4 h-4 stroke-[2.2]" />
          </div>
        </div>

        {/* 2. Top Header Bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => router.push("/jadwal-staff")}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <h1 className="text-base font-bold text-slate-900 flex-1 px-1">
            Profil Saya
          </h1>

          <div className="w-8 h-8 rounded-full bg-blue-50 text-[#193f53] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#193f53]" />
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5">
          {/* 3. User Identity Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-[#193f53]" />

            <div className="relative inline-block mt-2">
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-slate-200 mx-auto shadow-sm">
                <img
                  src="https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=400&fit=crop"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white absolute bottom-0 right-1 shadow-xs" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mt-2 leading-tight">
              {displayName}
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {displayRole} • ID: {currentUser?.id || "staff-01"}
            </p>

            <div className="flex items-center justify-center gap-1.5 mt-2.5">
              <span className="px-2.5 py-0.5 bg-blue-50 text-[#193f53] border border-blue-100 text-[10px] font-bold rounded-full">
                {currentUser?.role || "Staff Lapangan"}
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded-full">
                Aktif Bertugas
              </span>
            </div>

            {/* Contact Details */}
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs space-y-1.5 text-left text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{displayEmail}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{displayPhone}</span>
              </div>
            </div>
          </div>

          {/* 4. Store Assignment Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-2xs space-y-2.5 text-xs">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <StoreIcon className="w-3.5 h-3.5 text-slate-500" />
              <span>Penugasan Gerai</span>
            </h3>

            <div className="space-y-2 pt-0.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500">Outlet Aktif:</span>
                <span className="font-bold text-slate-900 text-right truncate">
                  {displayStore} — {displayLocation}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Kode Store:</span>
                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                  {displayStoreCode}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Shift Kerja:</span>
                <span className="font-semibold text-emerald-600">
                  Operasional Gerai (Shift Terjadwal)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Supervisor:</span>
                <span className="font-semibold text-slate-800">
                  Store Manager Cabang
                </span>
              </div>
            </div>
          </div>

          {/* 5. Performance Stats Summary */}
          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs">
              <Award className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Total Audit Selesai
              </span>
              <span className="text-base font-bold text-slate-900 block mt-0.5">
                78 Laporan
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-2xs">
              <ShieldCheck className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Kepatuhan SOP
              </span>
              <span className="text-base font-bold text-emerald-600 block mt-0.5">
                99.2%
              </span>
            </div>
          </div>

          {/* 6. Settings & Quick Menus */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden text-xs">
            <button
              onClick={() => toast.info("Fitur ubah kata sandi dapat diajukan ke Admin Workspace.")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 border-b border-slate-50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 font-medium text-slate-800">
                <KeyRound className="w-4 h-4 text-slate-400" />
                <span>Keamanan & Kata Sandi</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              onClick={() => toast.info("Sinkronisasi otomatis aktif dengan cache offline.")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 border-b border-slate-50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 font-medium text-slate-800">
                <Smartphone className="w-4 h-4 text-slate-400" />
                <span>Mode Offline & Sinkronisasi Draf</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full">
                Aktif
              </span>
            </button>

            <button
              onClick={() => toast.info("Panduan SOP resmi terhubung dengan Store Ops Portal V3.3.")}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-2.5 font-medium text-slate-800">
                <FileText className="w-4 h-4 text-slate-400" />
                <span>Panduan SOP Operasional Barista</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* 7. Logout Button */}
          <div className="pt-1 pb-2">
            <button
              onClick={handleLogout}
              className="w-full py-3 px-4 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun (Logout)</span>
            </button>

            <p className="text-[10px] text-slate-400 text-center font-mono mt-3 uppercase tracking-wider">
              OPS FIELD SYSTEM V3.3 • STORE #{displayStoreCode}
            </p>
          </div>
        </div>

        {/* 8. Bottom Navigation Bar */}
        <StaffBottomNav activeTab="profile" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Memuat profil staff...</span>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

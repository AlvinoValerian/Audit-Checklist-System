"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  ArrowRight,
  RotateCw,
  Store as StoreIcon,
  ShieldCheck,
  FileText,
  Camera,
  Lock,
  AlertCircle,
  Calendar,
  Wifi,
  Battery,
  Signal,
  ChevronRight,
  LogOut,
  User,
  X,
  Check,
  History,
  Sun,
  Smartphone,
  Maximize2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";
import StaffBottomNav from "./components/StaffBottomNav";

interface StaffScheduleItem {
  id: string;
  timeRange: string;
  title: string;
  checklistInfo?: string;
  infoNote?: string;
  status: "Selesai" | "Siap Dimulai" | "Libur" | "Terkunci";
  statusBadge: string;
  submittedInfo?: string;
  actionText?: string;
  exemptionText?: string;
  unlockText?: string;
  canStart?: boolean;
  isCompleted?: boolean;
  isHighlighted?: boolean;
  isHoliday?: boolean;
  isLocked?: boolean;
  hasDetail?: boolean;
  templateName?: string;
  templateId?: string;
  storeName?: string;
  storeId?: string;
  tasks?: Array<{ id: string; name: string; description?: string }>;
}

interface StaffScheduleData {
  staff: {
    name: string;
    shift: string;
    dateFormatted: string;
  };
  store: {
    name: string;
    location: string;
    code: string;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
    label: string;
  };
  schedules: StaffScheduleItem[];
}

export default function JadwalStaffPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("09:47");

  // State data jadwal dengan initial template matching screenshot
  const [scheduleData, setScheduleData] = useState<StaffScheduleData>({
    staff: {
      name: "Siti Rahmawati",
      shift: "Shift Pagi",
      dateFormatted: "Kamis, 24 Oktober 2024",
    },
    store: {
      name: "Kopi Kenangan",
      location: "Mall Kelapa Gading 3",
      code: "KK-JKT-15",
    },
    progress: {
      completed: 1,
      total: 3,
      percentage: 33,
      label: "1 dari 3 Tugas Selesai",
    },
    schedules: [
      {
        id: "sch-1",
        timeRange: "06:30 – 07:30 WIB",
        title: "Opening Store & Persiapan Barista",
        checklistInfo: "12 Item Checklist • Termasuk verifikasi chiller",
        status: "Selesai",
        statusBadge: "Selesai",
        submittedInfo: "Diserahkan pukul 07:15 WIB oleh Siti R.",
        isCompleted: true,
        canStart: false,
        hasDetail: true,
      },
      {
        id: "sch-2",
        timeRange: "09:00 – 12:00 WIB",
        title: "Jadwal Audit Operasional Reguler",
        checklistInfo: "Checklist Operasional Harian (18 Butir) • Cabang Sudirman",
        infoNote: "Fokus inspeksi pada display rak depan, kebersihan area kasir, dan kesesuaian label harga promo terpasang.",
        status: "Siap Dimulai",
        statusBadge: "Siap Dimulai",
        canStart: true,
        isHighlighted: true,
        actionText: "Kerjakan Checklist →",
      },
      {
        id: "sch-3",
        timeRange: "14:00 – 15:00 WIB",
        title: "Pengecekan Kebersihan Area Dine-in",
        infoNote: "Jadwal Ditiadakan / Toko Sedang Perawatan Gedung",
        exemptionText: "Bebas Tugas: Pengecualian Terjadwal (Maintenance Mall)",
        status: "Libur",
        statusBadge: "Libur",
        isHoliday: true,
        canStart: false,
      },
      {
        id: "sch-4",
        timeRange: "21:00 – 22:30 WIB",
        title: "Closing Kasir & End-of-Day",
        checklistInfo: "15 Item Checklist • Rekonsiliasi EDC & gembok",
        unlockText: "Terbuka Pukul 20:30 WIB",
        status: "Terkunci",
        statusBadge: "Terkunci",
        isLocked: true,
        canStart: false,
      },
    ],
  });

  // Modal State untuk Detail Tugas Selesai
  const [showDetailModal, setShowDetailModal] = useState<StaffScheduleItem | null>(null);
  const [isDetailAnimating, setIsDetailAnimating] = useState<boolean>(false);

  const handleOpenDetailModal = (item: StaffScheduleItem) => {
    setShowDetailModal(item);
    setIsDetailAnimating(false);
    setTimeout(() => setIsDetailAnimating(true), 20);
  };

  const handleCloseDetailModal = () => {
    setIsDetailAnimating(false);
    setTimeout(() => setShowDetailModal(null), 300);
  };

  // State untuk Pop-up Sukses dari Atas (di dalam layar HP)
  const [successToast, setSuccessToast] = useState<{
    show: boolean;
    title: string;
    message: string;
  }>({
    show: false,
    title: "",
    message: "",
  });

  const triggerSuccessToast = (title: string, message: string) => {
    setSuccessToast({ show: true, title, message });
    setTimeout(() => {
      setSuccessToast((prev) => ({ ...prev, show: false }));
    }, 4500);
  };

  // Modal State untuk Bottom Sheet Mulai Kerjakan Jadwal (Pop-up dari bawah)
  const [activeStartModal, setActiveStartModal] = useState<StaffScheduleItem | null>(null);
  const [isModalAnimating, setIsModalAnimating] = useState<boolean>(false);

  const handleOpenStartModal = (item: StaffScheduleItem) => {
    setActiveStartModal(item);
    setIsModalAnimating(false);
    setTimeout(() => setIsModalAnimating(true), 20);
  };

  const handleCloseStartModal = () => {
    setIsModalAnimating(false);
    setTimeout(() => setActiveStartModal(null), 300);
  };

  const handleProceedToAudit = () => {
    if (!activeStartModal) return;
    const targetId = activeStartModal.id;
    handleCloseStartModal();
    router.push(`/jadwal-staff/pengerjaan?id=${targetId}`);
  };

  // Update jam status bar secara live
  useEffect(() => {
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

  // Fetch data jadwal staf dari backend
  const fetchScheduleData = async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const token = AuthService.getToken();
      const user = AuthService.getCurrentUser();
      const activeWs = AuthService.getActiveWorkspace();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (user?.email) headers["x-user-email"] = user.email;
      if (user?.role) headers["x-user-role"] = user.role;
      const rawId = user?.rawId || (user?.id ? user.id.replace(/^staff-/, "").replace(/^sa-/, "").replace(/^adm-/, "") : undefined);
      if (rawId) headers["x-user-id"] = rawId;
      if (activeWs?.id) headers["x-workspace-id"] = activeWs.id;

      let res: Response | null = null;
      try {
        res = await fetch("/api/staff/my-schedules", { headers, cache: "no-store" });
        if (!res || !res.ok) throw new Error(`Fetch status: ${res?.status}`);
      } catch {
        res = await fetch("http://127.0.0.1:5000/api/staff/my-schedules", { headers, cache: "no-store" });
      }

      if (res && res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setIsOfflineMode(false);
          const backendSchedules: StaffScheduleItem[] = Array.isArray(json.data.schedules) ? json.data.schedules : [];

          // Periksa apakah ada tugas yang sudah diselesaikan dari pengerjaan lokal
          let completedLocal: string[] = [];
          if (typeof window !== "undefined") {
            try {
              completedLocal = JSON.parse(localStorage.getItem("staff_completed_tasks") || "[]");
            } catch (e) {}
          }

          const mappedSchedules = backendSchedules.map((s) => {
            if (completedLocal.includes(s.id) && s.status !== "Libur") {
              return {
                ...s,
                status: "Selesai" as const,
                statusBadge: "Selesai",
                canStart: false,
                isCompleted: true,
                hasDetail: true,
                isHighlighted: false,
                submittedInfo: s.submittedInfo || `Diserahkan tepat waktu oleh ${user?.fullName?.split(" ")[0] || "Staf"}`,
              };
            }
            return s;
          });

          const nonHoliday = mappedSchedules.filter((s) => s.status !== "Libur");
          const compCount = mappedSchedules.filter((s) => s.status === "Selesai").length;
          const totCount = nonHoliday.length;

          setScheduleData({
            staff: {
              name: user?.fullName || json.data.staff?.name || "Staf Lapangan",
              shift: json.data.staff?.shift || "Shift Pagi",
              dateFormatted: json.data.staff?.dateFormatted || new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }),
            },
            store: {
              name: json.data.store?.name || user?.storeName || "Toko Cabang",
              location: json.data.store?.location || user?.storeLocation || "Kota Malang",
              code: json.data.store?.code || user?.storeCode || "ST-01",
            },
            progress: {
              completed: compCount,
              total: totCount,
              percentage: totCount > 0 ? Math.round((compCount / totCount) * 100) : 0,
              label: `${compCount} dari ${totCount} Tugas Selesai`,
            },
            schedules: mappedSchedules,
          });

          if (!silent) {
            triggerSuccessToast(
              "Jadwal Berhasil Diperbarui!",
              "Data jadwal audit operasional shift Anda telah disinkronkan dari database."
            );
          }
        }
      } else {
        setIsOfflineMode(true);
      }
    } catch (err) {
      console.warn("Menggunakan data lokal jadwal staff:", err);
      setIsOfflineMode(true);
      if (!silent) {
        toast.info("Jadwal dimuat dalam mode offline.");
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    fetchScheduleData(true);

    // Cek jika baru saja menyerahkan checklist (redirect dari terkirim atau pengerjaan)
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get("completed") || params.get("success") || params.get("submitted")) {
          triggerSuccessToast(
            "🎉 Laporan Berhasil Diserahkan!",
            "Hasil audit checklist operasional telah terkirim dan tersimpan aman di database."
          );
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch (e) {}
    }
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

  const displayName = scheduleData.staff.name || currentUser?.fullName || "Siti Rahmawati";
  const displayStore = scheduleData.store.name || currentUser?.storeName || "Kopi Kenangan";
  const displayLocation = scheduleData.store.location || currentUser?.storeLocation || "Mall Kelapa Gading 3";
  const displayStoreCode = scheduleData.store.code || currentUser?.storeCode || "KK-JKT-15";

  const getInitials = (name: string) => {
    if (!name) return "SR";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-[#f3f4fa] flex flex-col items-center justify-center sm:py-6 p-0 sm:px-4 font-sans select-none antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Laptop / Desktop View */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Tampilan Mobile (HP) Staff
        </span>
        <button
          onClick={() => setIsFullscreenMode(!isFullscreenMode)}
          className="ml-2 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer"
          title="Alihkan mode tampilan layar"
        >
          <Maximize2 className="w-3 h-3" />
          {isFullscreenMode ? "Bingkai HP" : "Layar Penuh"}
        </button>
      </div>

      {/* Smartphone Device Frame Container */}
      <div
        className={`w-full bg-[#f4f6fc] text-slate-900 transition-all duration-300 relative flex flex-col ${
          isFullscreenMode
            ? "max-w-md min-h-screen sm:rounded-none sm:shadow-none"
            : "max-w-[420px] min-h-[844px] sm:max-h-[92vh] sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] sm:border-[9px] sm:border-slate-800 sm:ring-1 sm:ring-white/10 overflow-hidden"
        }`}
      >
        {/* Dynamic Island / Speaker Pill on Desktop Frame */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 pointer-events-none" />

        {/* 1. Mobile Status Bar (Matching Image) */}
        <div className="pt-3 px-6 pb-1 flex items-center justify-between text-slate-900 font-semibold text-xs tracking-tight z-20 shrink-0 select-none bg-transparent">
          <span className="text-sm font-bold tracking-tight">{currentTime}</span>
          <div className="flex items-center gap-1.5 text-slate-800">
            <Signal className="w-3.5 h-3.5 stroke-[2.2]" />
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
            <div className="flex items-center">
              <Battery className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* POPUP BERHASIL DARI ATAS (DI DALAM HP) */}
        <div
          className={`absolute top-11 inset-x-3 z-40 transition-all duration-500 ease-out transform pointer-events-none ${
            successToast.show
              ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
              : "-translate-y-16 opacity-0 scale-95"
          }`}
        >
          <div className="bg-white/95 backdrop-blur-md border border-emerald-200/90 rounded-2xl p-3 shadow-[0_10px_30px_-5px_rgba(16,185,129,0.25)] flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center shrink-0 text-emerald-600 mt-0.5">
              <CheckCircle2 className="w-4 h-4 stroke-[2.3]" />
            </div>
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-900 leading-tight truncate">
                  {successToast.title}
                </h4>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                {successToast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast((prev) => ({ ...prev, show: false }))}
              className="w-6 h-6 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 -mr-0.5 -mt-0.5"
              aria-label="Tutup notifikasi"
            >
              <X className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Inside Mobile Screen */}
        <div className="flex-1 overflow-y-auto px-4 pt-2 pb-6 space-y-3.5">
          {/* 2. Top Header (Store Name, Subtitle, History Icon, Avatar) */}
          <div className="flex items-center justify-between py-1 relative">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#193f53] text-white flex items-center justify-center shadow-xs shrink-0">
                <StoreIcon className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                  {displayStore}
                </h1>
                <p className="text-[11px] font-medium text-slate-400 leading-none mt-1 truncate">
                  {displayLocation} • {displayStoreCode}
                </p>
              </div>
            </div>

            {/* Right Action Icons: History & Profile Avatar */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => router.push("/jadwal-staff/riwayat")}
                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200/80 shadow-2xs transition-colors cursor-pointer"
                title="Riwayat Audit Shift"
                aria-label="Riwayat"
              >
                <History className="w-4 h-4 stroke-[2.2]" />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-8 h-8 rounded-full bg-blue-50 text-[#193f53] font-bold text-xs flex items-center justify-center border border-blue-200 shadow-2xs relative hover:ring-2 hover:ring-[#193f53]/20 transition-all cursor-pointer"
                  aria-label="Profil Pengguna"
                >
                  <span>{getInitials(displayName)}</span>
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 shadow-2xs" />
                </button>

                {/* Profile Popup */}
                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 p-2.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-2 py-1.5 border-b border-slate-100 pb-2 mb-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {displayName}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {currentUser?.email || "staff@gacoan.com"}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push("/jadwal-staff/profile")}
                        className="w-full text-left px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span>Lihat Profil Saya</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-2 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 3. Offline / Pull Down Banner Pill matching the image */}
          <div className="bg-[#fef9c3] border border-amber-200/70 text-amber-900 rounded-full px-3.5 py-1.5 flex items-center justify-between text-xs shadow-2xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
              <span className="font-medium text-[11px]">
                {isOfflineMode
                  ? "Mode Offline • Tarik ke bawah untuk refresh"
                  : "Mode Offline • Tarik ke bawah untuk refresh"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => fetchScheduleData(false)}
              disabled={isRefreshing}
              className="text-amber-900 hover:text-amber-950 transition-transform active:rotate-180 cursor-pointer"
              title="Refresh Data"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* 4. Greeting Card & Shift Progress matching the image */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3.5">
            <div>
              <h2 className="text-base sm:text-[17px] font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                Halo, {displayName} <span>👋</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {scheduleData.staff.shift} • {scheduleData.staff.dateFormatted}
                </span>
              </p>
            </div>

            <div className="pt-0.5">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                  PROGRES SHIFT
                </span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/60">
                  {scheduleData.progress.label}
                </span>
              </div>
              {/* Progress Bar Track */}
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#193f53] rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${scheduleData.progress.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* 5. Section Header: "Jadwal Hari Ini" */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Jadwal Hari Ini
              </h3>
              <p className="text-xs text-slate-400 leading-none mt-1">
                Daftar audit & checklist operasional shift Anda
              </p>
            </div>
            <button
              type="button"
              onClick={() => fetchScheduleData(false)}
              disabled={isRefreshing}
              className="text-blue-600 hover:text-blue-700 font-semibold text-xs flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-blue-50/50 transition-all cursor-pointer"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* 6. Schedule Cards List */}
          <div className="space-y-3">
            {scheduleData.schedules.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700">Tidak Ada Jadwal Hari Ini</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Belum ada penugasan checklist yang dijadwalkan untuk cabang ini.
                </p>
              </div>
            ) : (
              scheduleData.schedules.map((item) => {
                // CARD TYPE 1: SELESAI
                if (item.status === "Selesai") {
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.timeRange}</span>
                        </div>
                        <div className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100/80 text-[11px] font-semibold rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>Selesai</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                        {item.title}
                      </h4>

                      {item.checklistInfo && (
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.checklistInfo}</span>
                        </p>
                      )}

                      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[210px]">
                            {item.submittedInfo || "Diserahkan tepat waktu"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenDetailModal(item)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs hover:border-slate-300 transition-all flex items-center gap-0.5 cursor-pointer active:scale-95"
                        >
                          <span>Detail</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                }

                // CARD TYPE 2: SIAP DIMULAI (HIGHLIGHTED / ACTIVE AUDIT)
                if (item.status === "Siap Dimulai") {
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border border-slate-300 shadow-sm relative transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.timeRange}</span>
                        </div>
                        <div className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/60 text-[11px] font-semibold rounded-full flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" />
                          <span>Siap Dimulai</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                        {item.title}
                      </h4>

                      {item.checklistInfo && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.checklistInfo}</span>
                        </p>
                      )}

                      {/* Instruksi Khusus Admin Callout matching image */}
                      <div className="mt-3 p-3 bg-[#fef9c3]/70 border border-amber-200/70 rounded-xl space-y-0.5">
                        <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                          <span>📢</span>
                          <span>Instruksi Khusus Admin</span>
                        </div>
                        <p className="text-[11px] text-amber-900/90 leading-relaxed">
                          {item.infoNote ||
                            "Fokus inspeksi pada display rak depan, kebersihan area kasir, dan kesesuaian label harga promo."}
                        </p>
                      </div>

                      {/* Big Action Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenStartModal(item)}
                        className="mt-3.5 w-full py-3 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <span>Kerjakan Checklist</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                }

                // CARD TYPE 3: LIBUR (MAINTENANCE / BEBAS TUGAS)
                if (item.status === "Libur") {
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.timeRange}</span>
                        </div>
                        <div className="px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 text-[11px] font-semibold rounded-full flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          <span>Libur</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                        {item.title}
                      </h4>

                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 leading-snug">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>
                          {item.infoNote || "Jadwal Ditiadakan / Toko Sedang Perawatan Gedung"}
                        </span>
                      </p>

                      <div className="mt-3 p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center gap-2.5 text-xs text-blue-700 font-medium">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                          {item.exemptionText ||
                            "Bebas Tugas: Pengecualian Terjadwal (Maintenance Mall)"}
                        </span>
                      </div>
                    </div>
                  );
                }

                // CARD TYPE 4: TERKUNCI (UPCOMING LOCKED TASK)
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all opacity-90"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.timeRange}</span>
                      </div>
                      <div className="px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-full flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-500" />
                        <span>Terkunci</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                      {item.title}
                    </h4>

                    {item.checklistInfo && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.checklistInfo}</span>
                      </p>
                    )}

                    <div className="mt-3.5 w-full py-3 px-4 bg-slate-100/90 text-slate-400 font-medium text-xs rounded-xl flex items-center justify-center gap-2 select-none border border-slate-200/50">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.unlockText || "Terbuka Pukul 20:30 WIB"}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 7. Footer System Info matching image */}
          <div className="pt-2 text-center select-none pb-2">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Terakhir disinkronkan: Baru saja</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 uppercase">
              OPS FIELD SYSTEM V3.3 • STORE #{displayStoreCode}
            </p>
          </div>
        </div>

        {/* 8. Bottom Navigation with Issue Tab preserved */}
        <StaffBottomNav activeTab="checklist" />

        {/* POPUP MODAL: DETAIL TUGAS SELESAI (SLIDE UP DARI BAWAH DI DALAM HP DENGAN ANIMASI) */}
        {showDetailModal && (
          <div
            className={`absolute inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-[2px] transition-opacity duration-300 overflow-hidden ${
              isDetailAnimating ? "opacity-100" : "opacity-0"
            }`}
            onClick={handleCloseDetailModal}
          >
            <div
              className={`w-full bg-white rounded-t-[26px] shadow-[0_-8px_30px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden transition-all duration-300 ease-out transform ${
                isDetailAnimating ? "translate-y-0" : "translate-y-full"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Drag Handle Bar */}
              <div className="pt-2.5 pb-1 flex justify-center">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>

              {/* 2. Header */}
              <div className="px-4 pt-1.5 pb-2 border-b border-slate-100 flex items-start justify-between">
                <div className="pr-2">
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full uppercase">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>Hasil Audit Terverifikasi</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1 truncate max-w-[260px] leading-snug">
                    {showDetailModal.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="w-7 h-7 rounded-full bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors -mr-1 -mt-0.5 cursor-pointer shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              </div>

              {/* 3. Detail Content */}
              <div className="p-4 space-y-3 overflow-y-auto max-h-[50vh] text-xs">
                <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Waktu Penyerahan:</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {showDetailModal.submittedInfo || showDetailModal.timeRange}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Auditor / Staff:</span>
                    <span className="font-semibold text-slate-800 text-xs">{displayName}</span>
                  </div>
                  {showDetailModal.checklistInfo && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 text-[11px]">Template SOP:</span>
                      <span className="font-semibold text-slate-800 text-xs truncate max-w-[170px]">
                        {showDetailModal.checklistInfo}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Status:</span>
                    <span className="font-bold text-emerald-600 text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selesai Diverifikasi
                    </span>
                  </div>
                </div>

                {showDetailModal.tasks && showDetailModal.tasks.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    <p className="font-bold text-slate-800 text-[11px]">Daftar Item Checklist:</p>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside text-[11px]">
                      {showDetailModal.tasks.map((t) => (
                        <li key={t.id} className="truncate">{t.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 4. Action Button */}
              <div className="p-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>

              {/* 5. Home Indicator Bar */}
              <div className="pb-2 flex justify-center">
                <div className="w-24 h-1 bg-slate-300/80 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* POPUP MODAL: BOTTOM SHEET KERJAKAN CHECKLIST (SLIDE UP DARI BAWAH DI DALAM HP) */}
        {activeStartModal && (
          <div
            className={`absolute inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-[2px] transition-opacity duration-300 overflow-hidden ${
              isModalAnimating ? "opacity-100" : "opacity-0"
            }`}
            onClick={handleCloseStartModal}
          >
            <div
              className={`w-full bg-white rounded-t-[28px] shadow-[0_-10px_35px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden transition-all duration-300 ease-out transform ${
                isModalAnimating ? "translate-y-0" : "translate-y-full"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Drag Handle Bar */}
              <div className="pt-2.5 pb-1 flex justify-center">
                <div className="w-11 h-1 bg-slate-200/90 rounded-full" />
              </div>

              {/* 2. Header: Judul Jadwal & Tombol Close (X) */}
              <div className="px-5 pt-1.5 pb-0.5 flex items-start justify-between">
                <div className="pr-2">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                    {activeStartModal.title || "Jadwal Audit Operasional Reguler"}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Rincian Jadwal Penugasan Audit
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseStartModal}
                  className="w-8 h-8 rounded-full bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors -mr-1.5 -mt-1 cursor-pointer shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              </div>

              {/* 3. Badges Row: Aktif & Butir Item */}
              <div className="px-5 pt-2 flex items-center gap-2">
                <div className="px-3 py-1 bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]/80 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Aktif</span>
                </div>
                <div className="px-3 py-1 bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe]/80 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                  <FileText className="w-3.5 h-3.5 text-[#2563eb]" />
                  <span>
                    {activeStartModal.tasks?.length ||
                      activeStartModal.checklistInfo?.match(/(\d+)\s*(Butir|Item)/i)?.[1] ||
                      "18"}{" "}
                    Butir Item
                  </span>
                </div>
              </div>

              {/* 4. Instruksi Khusus Admin Box (Persis Mockup Gambar) */}
              <div className="mx-5 mt-3 p-3 bg-[#fef9c3]/70 border border-amber-200/80 rounded-2xl space-y-0.5">
                <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                  <span>📢</span>
                  <span>Instruksi Khusus Admin</span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed mt-0.5">
                  {activeStartModal.infoNote ||
                    "Fokus inspeksi pada display rak depan, kebersihan area kasir, dan kesesuaian label harga promo."}
                </p>
              </div>

              {/* 5. Metadata Card: Toko Target, Waktu, Template Checklist */}
              <div className="mx-5 mt-3 p-3.5 bg-[#f8fafc] border border-slate-100 rounded-2xl space-y-3 text-xs">
                {/* Toko / Cabang Target */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                    <StoreIcon className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-400 leading-none">
                      Toko / Cabang Target
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 leading-tight truncate">
                      {activeStartModal.storeName ||
                        (activeStartModal.checklistInfo?.includes("Cabang")
                          ? activeStartModal.checklistInfo.split("•").pop()?.trim() || `${displayStore} (${displayLocation})`
                          : `${displayStore} (${displayLocation})`)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100/90" />

                {/* Waktu Pelaksanaan */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                    <Clock className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-slate-400 leading-none">
                      Waktu Pelaksanaan
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 leading-tight">
                      {activeStartModal.timeRange || "09:00 – 12:00 WIB"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                      Selesaikan sebelum batas waktu berakhir
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100/90" />

                {/* Template Checklist */}
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-slate-400 leading-none">
                      Template Checklist
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-1 leading-tight truncate">
                      {activeStartModal.templateName ||
                        activeStartModal.checklistInfo?.split(/[(•]/)[0]?.trim() ||
                        "Checklist Operasional Harian"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
                      {activeStartModal.tasks?.length ||
                        activeStartModal.checklistInfo?.match(/(\d+)\s*(Butir|Item)/i)?.[1] ||
                        "18"}{" "}
                      butir pertanyaan SOP wajib diisi
                    </p>
                  </div>
                </div>
              </div>

              {/* 6. Action Button: Mulai Kerjakan Checklist */}
              <div className="p-5 pt-3 pb-2">
                <button
                  type="button"
                  onClick={handleProceedToAudit}
                  className="w-full py-3.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span>Mulai Kerjakan Checklist</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* 7. Bottom Home Indicator Bar */}
              <div className="pb-2.5 flex justify-center">
                <div className="w-28 h-1 bg-slate-300/80 rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

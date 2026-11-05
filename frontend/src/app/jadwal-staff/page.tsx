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
  Sparkles,
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
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>("09:41");

  // State data jadwal
  const [scheduleData, setScheduleData] = useState<StaffScheduleData>({
    staff: {
      name: "Siti Rahmawati",
      shift: "Shift Pagi",
      dateFormatted: "Kamis, 24 Oktober 2024",
    },
    store: {
      name: "Kopi Kenangan",
      location: "Mall Kelapa Gading 3 • KK-JKT-15",
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
        timeRange: "06:30 - 07:30 WIB",
        title: "Opening Store & Persiapan Barista",
        checklistInfo: "12 Item Checklist • Termasuk verifikasi chiller",
        status: "Selesai",
        statusBadge: "Selesai",
        submittedInfo: "Diserahkan pukul 07:15 WIB oleh Siti R.",
        canStart: false,
        isCompleted: true,
        hasDetail: true,
      },
      {
        id: "sch-2",
        timeRange: "11:00 - 12:00 WIB",
        title: "Hygiene & Sanitasi Meja Bar",
        checklistInfo: "8 Item Checklist • Foto wajib di area bar & sink",
        status: "Siap Dimulai",
        statusBadge: "Siap Dimulai",
        canStart: true,
        actionText: "Kerjakan Checklist →",
        isHighlighted: true,
      },
      {
        id: "sch-3",
        timeRange: "14:00 - 15:00 WIB",
        title: "Pengecekan Kebersihan Area Dine-in",
        infoNote: "Jadwal Ditiadakan / Toko Sedang Perawatan Gedung",
        status: "Libur",
        statusBadge: "Libur",
        exemptionText: "Bebas Tugas: Pengecualian Terjadwal (Maintenance Mall)",
        canStart: false,
        isHoliday: true,
      },
      {
        id: "sch-4",
        timeRange: "21:00 - 22:30 WIB",
        title: "Closing Kasir & End-of-Day",
        checklistInfo: "15 Item Checklist • Rekonsiliasi EDC & gembok",
        status: "Terkunci",
        statusBadge: "Terkunci",
        unlockText: "Terbuka Pukul 20:30 WIB",
        canStart: false,
        isLocked: true,
      },
    ],
  });

  // Modal State untuk Pengerjaan Checklist
  const [activeChecklistModal, setActiveChecklistModal] = useState<StaffScheduleItem | null>(null);
  const [checklistItems, setChecklistItems] = useState([
    { id: "1", text: "Sanitasi & lap permukaan meja barista", done: true },
    { id: "2", text: "Pembersihan area steam wand & portafilter", done: true },
    { id: "3", text: "Pengosongan knockbox ampas kopi", done: false },
    { id: "4", text: "Pemeriksaan dan pencucian sink cuci piring", done: false },
    { id: "5", text: "Sanitasi blender & pitcher susu", done: false },
    { id: "6", text: "Verifikasi ketersediaan kain lap steril", done: false },
    { id: "7", text: "Pengecekan suhu chiller susu (< 4°C)", done: false },
    { id: "8", text: "Foto bukti kondisi akhir area bar & sink", done: false, isPhoto: true },
  ]);
  const [photoUploaded, setPhotoUploaded] = useState<boolean>(false);
  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState<boolean>(false);

  // Modal State untuk Detail Tugas Selesai
  const [showDetailModal, setShowDetailModal] = useState<StaffScheduleItem | null>(null);

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

  // Fetch data dari backend
  const fetchScheduleData = async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const token = AuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("http://localhost:5000/api/staff/my-schedules", {
        headers,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setScheduleData((prev) => ({
            ...prev,
            staff: {
              ...prev.staff,
              ...json.data.staff,
            },
            store: {
              ...prev.store,
              ...json.data.store,
            },
            progress: {
              ...prev.progress,
              ...json.data.progress,
            },
            schedules: json.data.schedules || prev.schedules,
          }));
          if (!silent) {
            toast.success("Jadwal shift berhasil diperbarui!");
          }
        }
      }
    } catch (err) {
      console.warn("Menggunakan data lokal jadwal staff:", err);
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

    // Ambil initial data
    fetchScheduleData(true);

    // Periksa apakah ada tugas yang sudah diselesaikan dari halaman pengerjaan
    if (typeof window !== "undefined") {
      try {
        const completed = JSON.parse(localStorage.getItem("staff_completed_tasks") || "[]");
        if (completed.includes("sch-2")) {
          setScheduleData((prev) => {
            const updated = prev.schedules.map((s) => {
              if (s.id === "sch-2") {
                return {
                  ...s,
                  status: "Selesai" as const,
                  statusBadge: "Selesai",
                  canStart: false,
                  isCompleted: true,
                  hasDetail: true,
                  isHighlighted: false,
                  submittedInfo: `Diserahkan pukul 11:45 WIB oleh ${
                    user?.fullName?.split(" ")[0] || "Siti"
                  } R.`,
                };
              }
              return s;
            });
            const compCount = updated.filter((s) => s.status === "Selesai").length;
            const totCount = updated.filter((s) => s.status !== "Libur").length;
            return {
              ...prev,
              progress: {
                completed: compCount,
                total: totCount,
                percentage: Math.round((compCount / totCount) * 100),
                label: `${compCount} dari ${totCount} Tugas Selesai`,
              },
              schedules: updated,
            };
          });
        }
      } catch (e) {
        console.warn(e);
      }
    }
  }, []);

  // Handle Logout
  const handleLogout = () => {
    AuthService.logout();
    toast.info("Anda telah logout.");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    } else {
      router.push("/login");
    }
  };

  // Toggle item checklist
  const toggleItem = (id: string) => {
    setChecklistItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  // Submit Checklist
  const handleSubmitChecklist = () => {
    const remaining = checklistItems.filter((i) => !i.done).length;
    if (remaining > 0 && !photoUploaded) {
      toast.error("Harap lengkapi semua item checklist dan unggah foto bukti.");
      return;
    }

    setIsSubmittingChecklist(true);
    setTimeout(() => {
      setIsSubmittingChecklist(false);
      setActiveChecklistModal(null);

      // Update card 2 status menjadi Selesai
      setScheduleData((prev) => {
        const updatedSchedules = prev.schedules.map((item) => {
          if (item.id === "sch-2") {
            return {
              ...item,
              status: "Selesai" as const,
              statusBadge: "Selesai",
              canStart: false,
              isCompleted: true,
              hasDetail: true,
              isHighlighted: false,
              submittedInfo: `Diserahkan pukul ${currentTime} WIB oleh ${
                currentUser?.fullName?.split(" ")[0] || "Siti"
              } R.`,
            };
          }
          return item;
        });

        const completedCount = updatedSchedules.filter((s) => s.status === "Selesai").length;
        const totalCount = updatedSchedules.filter((s) => s.status !== "Libur").length;

        return {
          ...prev,
          progress: {
            completed: completedCount,
            total: totalCount,
            percentage: Math.round((completedCount / totalCount) * 100),
            label: `${completedCount} dari ${totalCount} Tugas Selesai`,
          },
          schedules: updatedSchedules,
        };
      });

      toast.success("Checklist Hygiene & Sanitasi Bar berhasil diserahkan!");
    }, 800);
  };

  // Avatar initials
  const getInitials = (name: string) => {
    if (!name) return "SR";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const displayName = currentUser?.fullName || scheduleData.staff.name;
  const displayStore = currentUser?.storeName || scheduleData.store.name;
  const displayLocation =
    currentUser?.storeLocation || currentUser?.storeCode
      ? `${currentUser.storeLocation || "Cabang"} • ${currentUser.storeCode || "ST-01"}`
      : scheduleData.store.location;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center sm:py-6 p-0 sm:px-4 font-sans select-none antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Laptop / Desktop View */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Tampilan Mobile (HP) Staff
        </span>
        <button
          onClick={() => setIsFullscreenMode(!isFullscreenMode)}
          className="ml-2 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded-full transition-all flex items-center gap-1"
          title="Alihkan mode tampilan layar"
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

        {/* 1. Mobile Status Bar (iOS / Android Style) */}
        <div className="pt-3 px-6 pb-1 flex items-center justify-between text-slate-900 font-semibold text-xs tracking-tight z-20 shrink-0 select-none">
          <span className="text-sm font-bold tracking-tight">{currentTime}</span>
          <div className="flex items-center gap-1.5 text-slate-800">
            <Signal className="w-3.5 h-3.5 stroke-[2.2]" />
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
            <div className="flex items-center">
              <Battery className="w-4 h-4 stroke-[2.2]" />
            </div>
          </div>
        </div>

        {/* Scrollable Content Inside Mobile Screen */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-8 space-y-4">
          {/* 2. Store Header & Profile Avatar */}
          <div className="flex items-center justify-between py-1 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#eef4ff] text-[#193f53] flex items-center justify-center shadow-xs border border-blue-100">
                <StoreIcon className="w-5 h-5 stroke-[2.2] text-[#193f53]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  {displayStore}
                </h1>
                <p className="text-[11px] font-medium text-slate-500 leading-none mt-1">
                  {displayLocation}
                </p>
              </div>
            </div>

            {/* Staff Avatar with Online Dot & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-full bg-[#f1f5f9] text-[#193f53] font-bold text-xs flex items-center justify-center border border-slate-200/90 shadow-2xs relative hover:ring-2 hover:ring-[#193f53]/20 transition-all active:scale-95 cursor-pointer"
                aria-label="Profil Staff"
              >
                <span>{getInitials(displayName)}</span>
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 shadow-2xs" />
              </button>

              {/* Profile Dropdown Popup */}
              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2 py-1.5 border-b border-slate-100 pb-2 mb-2">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {displayName}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentUser?.email || "staff@store.com"}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-50 text-[#193f53] text-[10px] font-semibold rounded-full">
                        Staff Auditor Lapangan
                      </span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-2 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Logout dari Aplikasi
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. Greeting Card & Shift Progress */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3.5">
            <div>
              <h2 className="text-[17px] font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                Halo, {displayName} <span className="animate-pulse">👋</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium flex items-center gap-1.5">
                <span>☀️</span> {scheduleData.staff.shift} • {scheduleData.staff.dateFormatted}
              </p>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                  PROGRES SHIFT
                </span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
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

          {/* 4. Section Title & Refresh Action */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <h3 className="text-[15px] font-bold text-slate-900 leading-tight">
                Jadwal Hari Ini
              </h3>
              <p className="text-[11px] text-slate-500 leading-none mt-1">
                Daftar audit & checklist operasional shift Anda
              </p>
            </div>
            <button
              onClick={() => fetchScheduleData(false)}
              disabled={isRefreshing}
              className="text-[#193f53] hover:text-blue-800 font-semibold text-xs flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-white/80 active:scale-95 transition-all cursor-pointer"
            >
              <span>Refresh</span>
              <RotateCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
          </div>

          {/* 5. Schedule Cards List */}
          <div className="space-y-3">
            {scheduleData.schedules.map((item) => {
              // CARD 1: SELESAI
              if (item.status === "Selesai") {
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100 text-slate-700 text-[11px] font-medium font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.timeRange}</span>
                      </div>
                      <div className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3 stroke-[3]" />
                        <span>Selesai</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                      {item.title}
                    </h4>

                    {item.checklistInfo && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.checklistInfo}</span>
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
                      <span className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {item.submittedInfo || "Diserahkan tepat waktu"}
                        </span>
                      </span>
                      <button
                        onClick={() => setShowDetailModal(item)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs hover:border-slate-300 transition-all flex items-center gap-0.5 cursor-pointer active:scale-95"
                      >
                        <span>Detail</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              }

              // CARD 2: SIAP DIMULAI (HIGHLIGHTED & ACTIVE)
              if (item.status === "Siap Dimulai") {
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-[0_4px_16px_rgba(25,63,83,0.08)] relative overflow-hidden group transition-all duration-200 hover:shadow-xl hover:border-[#193f53]/40"
                  >
                    {/* Top Highlight Indicator Bar matching the image */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#193f53]" />

                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100 text-slate-700 text-[11px] font-medium font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.timeRange}</span>
                      </div>
                      <div className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping inline-block" />
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

                    {/* Prominent Action Button with Hover Effect */}
                    <button
                      onClick={() => router.push(`/jadwal-staff/pengerjaan?id=${item.id}`)}
                      className="mt-3.5 w-full py-2.5 sm:py-3 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all duration-200 group-hover:shadow-md active:scale-[0.98] cursor-pointer"
                    >
                      <span>Kerjakan Checklist</span>
                      <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                  </div>
                );
              }

              // CARD 3: LIBUR (EXEMPTION / MAINTENANCE)
              if (item.status === "Libur") {
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-slate-300 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100 text-slate-700 text-[11px] font-medium font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{item.timeRange}</span>
                      </div>
                      <div className="px-2.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 text-[11px] font-semibold rounded-full flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Libur</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                      {item.title}
                    </h4>

                    {item.infoNote && (
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 leading-snug">
                        <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.infoNote}</span>
                      </p>
                    )}

                    {/* Exemption Banner Box */}
                    <div className="mt-3 p-3 bg-[#f0f7ff] border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-[#1e40af] font-medium leading-relaxed">
                      <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{item.exemptionText}</span>
                    </div>
                  </div>
                );
              }

              // CARD 4: TERKUNCI (UPCOMING LOCKED TASK)
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] opacity-85 hover:opacity-100 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-full border border-slate-100 text-slate-700 text-[11px] font-medium font-mono">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{item.timeRange}</span>
                    </div>
                    <div className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold rounded-full flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Terkunci</span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
                    {item.title}
                  </h4>

                  {item.checklistInfo && (
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{item.checklistInfo}</span>
                    </p>
                  )}

                  {/* Locked Button */}
                  <div className="mt-3.5 w-full py-2.5 px-4 bg-slate-100/80 text-slate-400 font-medium text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200/60 select-none">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{item.unlockText || "Terbuka Pukul 20:30 WIB"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6. Footer System Info */}
          <div className="pt-4 text-center select-none">
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Terakhir disinkronkan: Baru saja</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 uppercase">
              OPS FIELD SYSTEM V3.3 • STORE #{scheduleData.store.code}
            </p>
          </div>
        </div>

        {/* 7. Bottom Navigation Bar matching the image */}
        <StaffBottomNav activeTab="checklist" />
      </div>

      {/* MODAL 1: CHECKLIST EXECUTION MODAL (KERJAKAN CHECKLIST) */}
      {activeChecklistModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase">
                  Checklist Lapangan
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {activeChecklistModal.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveChecklistModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist Items Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
              <p className="text-xs text-slate-500">
                Centang setiap item setelah diverifikasi dan unggah foto dokumentasi kebersihan:
              </p>

              <div className="space-y-2">
                {checklistItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      item.done
                        ? "bg-blue-50/40 border-blue-200 text-slate-900"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center mt-0.5 shrink-0 transition-colors ${
                        item.done ? "bg-[#193f53] text-white" : "border border-slate-300"
                      }`}
                    >
                      {item.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                    <span
                      className={`text-xs font-medium leading-relaxed ${
                        item.done ? "line-through text-slate-400" : ""
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Photo Evidence Box */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  Foto Bukti Area Bar & Sink (Wajib)
                </label>
                <div
                  onClick={() => setPhotoUploaded(!photoUploaded)}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    photoUploaded
                      ? "border-emerald-400 bg-emerald-50/50 text-emerald-800"
                      : "border-slate-300 hover:border-slate-400 bg-slate-50 text-slate-500"
                  }`}
                >
                  {photoUploaded ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span className="text-xs font-semibold">
                        Foto berhasil diambil & terlampir (1 Foto)
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Camera className="w-6 h-6 mx-auto text-slate-400" />
                      <p className="text-xs font-medium">
                        Ketuk untuk Ambil Foto via Kamera HP
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Format JPG/PNG, maks 5 MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveChecklistModal(null)}
                className="w-1/3 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitChecklist}
                disabled={isSubmittingChecklist}
                className="w-2/3 py-2.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingChecklist ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Kirim & Selesaikan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DETAIL TUGAS SELESAI */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase">
                  ✓ Hasil Audit Terverifikasi
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  {showDetailModal.title}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Penyerahan:</span>
                  <span className="font-semibold text-slate-800">
                    {showDetailModal.submittedInfo || "07:15 WIB"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Auditor / Staff:</span>
                  <span className="font-semibold text-slate-800">{displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Suhu Chiller:</span>
                  <span className="font-semibold text-emerald-600">3.4°C (Normal)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Item Terpenuhi:</span>
                  <span className="font-semibold text-slate-800">12 / 12 Item (100%)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-slate-800">Item Checklist Opening:</p>
                <ul className="space-y-1 text-slate-600 list-disc list-inside">
                  <li>Kalibrasi mesin espresso & grinder</li>
                  <li>Cek persediaan susu fresh & bean kopi</li>
                  <li>Sterilisasi meja bar & knock box</li>
                  <li>Verifikasi suhu chiller & freezer</li>
                  <li>Kebersihan area kasir & mesin EDC</li>
                </ul>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100">
              <button
                onClick={() => setShowDetailModal(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

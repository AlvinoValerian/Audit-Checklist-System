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
  AlertTriangle,
  Calendar,
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
import DecryptedImage from "@/components/DecryptedImage";

interface StaffScheduleItem {
  id: string;
  timeRange: string;
  title: string;
  checklistInfo?: string;
  infoNote?: string;
  status: "Selesai" | "Siap Dimulai" | "Terlambat" | "Libur" | "Terkunci" | "Kedaluwarsa" | "Tidak Dikerjakan";
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
  isLate?: boolean;
  isExpired?: boolean;
  isNonCompliant?: boolean;
  toleranceTime?: string;
  hasDetail?: boolean;
  templateName?: string;
  templateId?: string;
  storeName?: string;
  storeId?: string;
  tasks?: Array<{ id: string; name: string; description?: string }>;
  report?: {
    reportId: string;
    status: string;
    submittedAt?: string;
    submittedBy?: string | null;
    notes?: string | null;
  } | null;
}

interface StaffScheduleData {
  staff: {
    name: string;
    shift: string;
    dateFormatted: string;
    photo?: string | null;
  };
  store: {
    id?: string | null;
    name: string;
    location: string;
    code: string;
  };
  progress: {
    completed: number;
    total: number;
    percentage: number;
    label: string;
    expired?: number;
    late?: number;
  };
  schedules: StaffScheduleItem[];
}

export default function JadwalStaffPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);

  // State data jadwal dengan initial state bersih (diisi dari akun staf & database)
  const [scheduleData, setScheduleData] = useState<StaffScheduleData>({
    staff: {
      name: "Staf Lapangan",
      shift: "Auditor Lapangan",
      dateFormatted: new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    },
    store: {
      name: "Memuat Gerai...",
      location: "Memuat Lokasi...",
      code: "ST-01",
    },
    progress: {
      completed: 0,
      total: 0,
      percentage: 0,
      label: "Memuat tugas...",
    },
    schedules: [],
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
    if (item.isCompleted || item.status === "Selesai") {
      toast.info("Jadwal audit ini sudah selesai dikerjakan.");
      return;
    }
    if (item.isHoliday || item.status === "Libur") {
      toast.info(item.exemptionText || "Gerai sedang berstatus Libur Operasional.");
      return;
    }
    if (item.isLocked || item.status === "Terkunci") {
      toast.info(item.unlockText || "Jadwal audit belum memasuki jam pengerjaan.");
      return;
    }
    if (item.status === "Kedaluwarsa" || item.status === "Tidak Dikerjakan" || item.isExpired || item.canStart === false) {
      toast.error("Audit Kedaluwarsa: Batas toleransi pengerjaan 1 jam telah habis. Jadwal ditutup otomatis sebagai Tidak Patuh.");
      return;
    }
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
      if (user?.storeId) headers["x-store-id"] = user.storeId.toString();

      const storeParam = user?.storeId ? `?storeId=${encodeURIComponent(user.storeId)}` : "";

      let res: Response | null = null;
      try {
        res = await fetch(`/api/staff/my-schedules${storeParam}`, { headers, cache: "no-store" });
        if (!res || (!res.ok && res.status >= 500)) throw new Error(`Fetch status: ${res?.status}`);
      } catch {
        res = await fetch(`http://127.0.0.1:5000/api/staff/my-schedules${storeParam}`, { headers, cache: "no-store" });
      }

      if (res && (res.status === 401 || res.status === 403)) {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.message || "Sesi berakhir atau akun dinonaktifkan.");
        AuthService.logout();
        router.replace("/login");
        return;
      }

      if (res && res.ok) {
        const json = await res.json();
        if (json.status === "success" && json.data) {
          setIsOfflineMode(false);
          setLastSyncedAt(
            new Date().toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Asia/Jakarta",
            }) + " WIB"
          );
          let backendSchedules: StaffScheduleItem[] = Array.isArray(json.data.schedules) ? json.data.schedules : [];

          // Isolasi Ketat: Hanya jadwalkan tugas untuk store_id yang dinaungi staf ini
          const targetStoreId = json.data.store?.id || user?.storeId;
          if (targetStoreId) {
            const cleanTarget = targetStoreId.toString().replace(/^str-/, "").replace(/^st-/, "");
            backendSchedules = backendSchedules.filter((s) => {
              if (!s.storeId) return true;
              const sId = s.storeId.toString().replace(/^str-/, "").replace(/^st-/, "");
              return sId === cleanTarget;
            });
          }

          // Seluruh data status jadwal 100% murni dari database PostgreSQL
          // Bersihkan cache lokal jika ada agar tidak mengintervensi status database
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("staff_completed_tasks");
            } catch (e) {}
          }

          const mappedSchedules = backendSchedules;

          const nonHoliday = mappedSchedules.filter((s) => s.status !== "Libur");
          const compCount = mappedSchedules.filter((s) => s.status === "Selesai").length;
          const totCount = nonHoliday.length;

          setScheduleData({
            staff: {
              name: json.data.staff?.name || user?.fullName || "Staf Lapangan",
              shift: json.data.staff?.shift || user?.position || "Auditor Lapangan",
              dateFormatted: json.data.staff?.dateFormatted || new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Jakarta",
              }),
              photo: json.data.staff?.photo || null,
            },
            store: {
              id: json.data.store?.id || user?.storeId || null,
              name: json.data.store?.name || user?.storeName || "Toko Cabang",
              location: json.data.store?.location || user?.storeLocation || "Kota Malang",
              code: json.data.store?.code || user?.storeCode || "ST-01",
            },
            progress: {
              completed: compCount,
              total: totCount,
              expired: json.data.progress?.expired ?? mappedSchedules.filter((s) => s.status === "Kedaluwarsa" || s.isExpired).length,
              late: json.data.progress?.late ?? mappedSchedules.filter((s) => s.status === "Terlambat" || s.isLate).length,
              percentage: totCount > 0 ? Math.round((compCount / totCount) * 100) : 0,
              label: json.data.progress?.label || `${compCount} dari ${totCount} Tugas Selesai`,
            },
            schedules: mappedSchedules,
          });

          // Sinkronkan data user & toko terkini dari database ke sesi lokal
          setCurrentUser((prev) => {
            if (!prev) return prev;
            const updated: AuthUser = {
              ...prev,
              fullName: json.data.staff?.name || prev.fullName,
              position: json.data.staff?.shift || prev.position,
              storeId: json.data.store?.id || prev.storeId,
              storeName: json.data.store?.name || prev.storeName,
              storeLocation: json.data.store?.location || prev.storeLocation,
              storeCode: json.data.store?.code || prev.storeCode,
              profilePicture: json.data.staff?.photo ?? prev.profilePicture,
            };
            AuthService.setCurrentUser(updated);
            return updated;
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

    if (user) {
      setScheduleData((prev) => ({
        ...prev,
        staff: {
          name: user.fullName || "Staf Lapangan",
          shift: user.position || "Auditor Lapangan",
          dateFormatted: new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        },
        store: {
          name: user.storeName || "Toko Penugasan",
          location: user.storeLocation || "Cabang Gerai",
          code: user.storeCode || "ST-01",
        },
      }));
    }

    fetchScheduleData(true);

    // Ambil info profil staf terkini dari database
    const refreshProfile = async () => {
      try {
        const token = AuthService.getToken();
        if (!token) return;
        const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
        let res = await fetch("/api/auth/me", { headers, cache: "no-store" });
        if (!res.ok && res.status >= 500) {
          res = await fetch("http://127.0.0.1:5000/api/auth/me", { headers, cache: "no-store" });
        }
        if (res.status === 401 || res.status === 403) {
          const errJson = await res.json().catch(() => null);
          toast.error(errJson?.message || "Akun Anda dinonaktifkan atau sesi berakhir.");
          AuthService.logout();
          router.replace("/login");
          return;
        }
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && json.data?.user) {
            const latestUser = json.data.user;
            const prevUser = AuthService.getCurrentUser();
            const storeChanged = (prevUser?.storeId?.toString() || "") !== (latestUser.storeId?.toString() || "");
            setCurrentUser(latestUser);
            AuthService.setCurrentUser(latestUser);
            if (storeChanged) {
              fetchScheduleData(true);
            }
          }
        }
      } catch (e) {}
    };
    refreshProfile();

    // Auto re-sync saat pengguna kembali ke halaman/tab ini
    const handleFocusSync = () => {
      refreshProfile();
      fetchScheduleData(true);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", handleFocusSync);
    }

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

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", handleFocusSync);
      }
    };
  }, []);

  const handleLogout = () => {
    setShowProfileMenu(false);
    triggerSuccessToast(
      "Berhasil Logout",
      "Anda telah berhasil keluar dari akun. Mengalihkan..."
    );
    AuthService.logout();
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      } else {
        router.push("/login");
      }
    }, 1100);
  };

  const displayName =
    scheduleData.staff.name && scheduleData.staff.name !== "Staf Lapangan"
      ? scheduleData.staff.name
      : currentUser?.fullName || "Staf Lapangan";
  const displayStore =
    scheduleData.store.name && scheduleData.store.name !== "Memuat Gerai..."
      ? scheduleData.store.name
      : currentUser?.storeName || "Toko Penugasan";
  const displayLocation =
    scheduleData.store.location && scheduleData.store.location !== "Memuat Lokasi..."
      ? scheduleData.store.location
      : currentUser?.storeLocation || "Cabang Gerai";

  const getInitials = (name: string) => {
    if (!name) return "SR";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f4f6fc] sm:relative sm:inset-auto sm:min-h-screen sm:bg-[#f3f4fa] sm:flex sm:items-center sm:justify-center sm:py-6 sm:px-4 font-sans antialiased">
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
        className={`w-full h-full flex flex-col bg-[#f4f6fc] text-slate-900 transition-all duration-300 relative ${
          isFullscreenMode
            ? "max-w-md sm:rounded-none sm:shadow-none sm:h-screen"
            : "sm:h-[844px] sm:max-h-[92vh] sm:max-w-[420px] sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] sm:border-[9px] sm:border-slate-800 sm:ring-1 sm:ring-white/10 overflow-hidden"
        }`}
      >
        {/* Dynamic Island / Speaker Pill on Desktop Frame */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 pointer-events-none" />

        {/* POPUP BERHASIL DARI ATAS (DI DALAM HP) */}
        <div
          className={`absolute top-3 inset-x-3 z-50 transition-all duration-500 ease-out transform pointer-events-none ${
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
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-3.5 sm:pt-4 pb-6 space-y-3.5">
          {/* 2. Top Header (Store Name, Subtitle, Avatar) */}
          <div className="flex items-start justify-between gap-3 py-1 relative">
            <div className="flex items-start gap-2.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-[#193f53] text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                <StoreIcon className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {displayStore}
                </h1>
                <p className="text-[11px] font-medium text-slate-500 leading-snug mt-1">
                  {displayLocation}
                </p>
              </div>
            </div>

            {/* Right Action Icons: Profile Avatar (Icon Riwayat di Header Dihapus) */}
            <div className="flex items-center shrink-0 pt-0.5">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-8 h-8 rounded-full bg-blue-50 text-[#193f53] font-bold text-xs flex items-center justify-center border border-blue-200 shadow-2xs relative hover:ring-2 hover:ring-[#193f53]/20 transition-all cursor-pointer touch-manipulation active:scale-95"
                  aria-label="Profil Pengguna"
                >
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                    {currentUser?.profilePicture ? (
                      <DecryptedImage
                        src={currentUser.profilePicture}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{getInitials(displayName)}</span>
                    )}
                  </div>
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white absolute -bottom-0.5 -right-0.5 shadow-2xs z-10" />
                </button>

                {/* Profile Popup */}
                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 p-2.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center gap-2.5 px-2 py-1.5 border-b border-slate-100 pb-2 mb-1">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-[#193f53] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100 overflow-hidden">
                          {currentUser?.profilePicture ? (
                            <DecryptedImage
                              src={currentUser.profilePicture}
                              alt={displayName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{getInitials(displayName)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {displayName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {currentUser?.email || "-"}
                          </p>
                        </div>
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

          {/* 3. Connection / Sync Status Banner Pill */}
          <div
            className={`rounded-full px-3.5 py-1.5 flex items-center justify-between text-xs shadow-2xs border ${
              isOfflineMode
                ? "bg-[#fef9c3] border-amber-200/70 text-amber-900"
                : "bg-emerald-50/90 border-emerald-200/80 text-emerald-900"
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  isOfflineMode ? "bg-amber-600" : "bg-emerald-500 animate-pulse"
                }`}
              />
              <span className="font-medium text-[11px]">
                {isOfflineMode
                  ? "Mode Offline • Ketuk refresh untuk sinkron ulang"
                  : `Terhubung Database${lastSyncedAt ? ` • ${lastSyncedAt}` : ""}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => fetchScheduleData(false)}
              disabled={isRefreshing}
              className={`${
                isOfflineMode
                  ? "text-amber-900 hover:text-amber-950"
                  : "text-emerald-800 hover:text-emerald-950"
              } transition-transform active:rotate-180 cursor-pointer`}
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
            {loading && scheduleData.schedules.length === 0 ? (
              <div className="bg-white rounded-3xl p-6 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-2">
                <RotateCw className="w-8 h-8 text-[#193f53] animate-spin mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Memuat Jadwal Tugas...</h4>
                <p className="text-xs text-slate-400">
                  Menyinkronkan jadwal audit hari ini dari database server.
                </p>
              </div>
            ) : scheduleData.schedules.length === 0 ? (
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
                        <div
                          className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full flex items-center gap-1 border ${
                            item.statusBadge?.includes("Terlambat")
                              ? "bg-amber-50 text-amber-700 border-amber-200/80"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100/80"
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[2.5]" />
                          <span>{item.statusBadge || "Selesai"}</span>
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

                // CARD TYPE: KEDALUWARSA / TIDAK DIKERJAKAN (MELEWATI BATAS TOLERANSI 1 JAM -> TIDAK PATUH)
                if (item.status === "Kedaluwarsa" || item.status === "Tidak Dikerjakan" || item.isExpired) {
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border-2 border-rose-300 shadow-sm relative transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-rose-600 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 text-rose-500" />
                          <span>{item.timeRange}</span>
                        </div>
                        <div className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold rounded-full flex items-center gap-1.5 shadow-2xs">
                          <AlertCircle className="w-3 h-3 text-rose-700 stroke-[2.5]" />
                          <span>Tidak Patuh</span>
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

                      {/* Alert Callout Batas Toleransi Habis */}
                      <div className="mt-3 p-3 bg-rose-50/90 border border-rose-200 rounded-xl space-y-1">
                        <div className="flex items-center gap-1.5 text-rose-900 text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Batas Toleransi Berakhir • Tidak Mengerjakan</span>
                        </div>
                        <p className="text-[11px] text-rose-800 leading-relaxed">
                          Jadwal audit ini telah melewati batas toleransi keterlambatan 1 jam{item.toleranceTime ? ` (pukul ${item.toleranceTime} WIB)` : ""}. Sistem menutup audit ini secara otomatis dan tercatat sebagai <strong className="font-semibold text-rose-900">Tidak Mengerjakan / Tidak Patuh</strong>.
                        </p>
                      </div>

                      {/* Tombol Nonaktif (Kedaluwarsa) */}
                      <button
                        type="button"
                        disabled
                        className="mt-3.5 w-full py-3 px-4 bg-slate-100 text-slate-400 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 border border-slate-200 cursor-not-allowed select-none"
                      >
                        <Lock className="w-4 h-4 text-slate-400" />
                        <span>Audit Kedaluwarsa (Tidak Patuh)</span>
                      </button>
                    </div>
                  );
                }

                // CARD TYPE: TERLAMBAT (MASIH DALAM MASA TOLERANSI 1 JAM)
                if (item.status === "Terlambat") {
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border-2 border-amber-300 shadow-sm relative transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-700 text-xs font-semibold">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{item.timeRange}</span>
                        </div>
                        <div className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 text-[11px] font-bold rounded-full flex items-center gap-1.5 shadow-2xs">
                          <Clock className="w-3 h-3 text-amber-700 stroke-[2.5]" />
                          <span>Terlambat (Toleransi 1 Jam)</span>
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

                      {/* Alert Callout Masa Toleransi Terlambat */}
                      <div className="mt-3 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-0.5">
                        <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Masa Toleransi Keterlambatan (+1 Jam)</span>
                        </div>
                        <p className="text-[11px] text-amber-800/90 leading-relaxed">
                          Jadwal audit ini telah melewati jam shift normal ({item.timeRange}). Diberikan kelonggaran toleransi pengerjaan hingga pukul <strong className="font-semibold text-amber-900">{item.toleranceTime || "1 jam setelah jadwal"} WIB</strong>. Segera selesaikan sebelum audit ditutup otomatis sebagai Tidak Patuh.
                        </p>
                      </div>

                      {/* Tombol Kerjakan Checklist Terlambat */}
                      <button
                        type="button"
                        onClick={() => handleOpenStartModal(item)}
                        className="mt-3.5 w-full py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
                      >
                        <Clock className="w-4 h-4" />
                        <span>Kerjakan Checklist (Terlambat)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
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
                        className="mt-3.5 w-full py-3 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer touch-manipulation"
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
              <span className={`w-1.5 h-1.5 rounded-full ${isOfflineMode ? "bg-amber-500" : "bg-emerald-500"}`} />
              <span>
                {lastSyncedAt
                  ? `Terakhir disinkronkan: ${lastSyncedAt}`
                  : isOfflineMode
                  ? "Koneksi terputus dari server"
                  : "Menyinkronkan data..."}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 uppercase">
              OPS FIELD SYSTEM V3.3
            </p>
          </div>
        </div>

        {/* 8. Bottom Navigation matching reference layout */}
        <StaffBottomNav activeTab="checklist" showIssues={false} />

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
                  <div
                    className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-full uppercase ${
                      showDetailModal.statusBadge?.includes("Terlambat")
                        ? "text-amber-700 bg-amber-50 border-amber-200/80"
                        : "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                    <span>
                      {showDetailModal.statusBadge?.includes("Terlambat")
                        ? "Hasil Audit Terlambat (Terverifikasi)"
                        : "Hasil Audit Terverifikasi"}
                    </span>
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
                    <span className="font-semibold text-slate-800 text-xs text-right max-w-[190px]">
                      {showDetailModal.submittedInfo || showDetailModal.timeRange}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Auditor / Staff:</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {showDetailModal.report?.submittedBy || displayName}
                    </span>
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
                    <span
                      className={`font-bold text-xs flex items-center gap-1 ${
                        showDetailModal.statusBadge?.includes("Terlambat")
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {showDetailModal.statusBadge || "Selesai Diverifikasi"}
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
                    {activeStartModal.tasks?.length ??
                      (activeStartModal.checklistInfo?.match(/(\d+)\s*(Butir|Item)/i)?.[1] ||
                      "0")}{" "}
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
                      {activeStartModal.tasks?.length ??
                        (activeStartModal.checklistInfo?.match(/(\d+)\s*(Butir|Item)/i)?.[1] ||
                        "0")}{" "}
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

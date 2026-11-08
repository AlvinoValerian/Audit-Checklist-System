"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RotateCw,
  Store as StoreIcon,
  ChevronDown,
  ChevronRight,
  Check,
  Clock,
  User,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  MapPin,
  X,
  Smartphone,
  Maximize2,
  RotateCcw,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";
import StaffBottomNav from "../components/StaffBottomNav";

interface HistoryItem {
  id: string;
  time: string;
  title: string;
  auditor: string;
  auditorRole?: string;
  itemCount: string;
  scoreText: string;
  statusType: "selesai" | "terlambat" | "temuan" | "tidak_patuh";
  statusBadge: string;
  rightBadge?: string;
  isGpsValid?: boolean;
  storeName?: string;
  notes?: string;
}

interface HistoryGroup {
  dateHeader: string;
  itemCountLabel: string;
  items: HistoryItem[];
}

interface OutletInfo {
  name: string;
  location: string;
  code: string;
  address: string;
}

function RiwayatContent() {
  const router = useRouter();

  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filter tabs: Semua, Bulan Ini, Terlambat, Issue, Tidak Mengerjakan
  const [activeFilter, setActiveFilter] = useState<"semua" | "bulan-ini" | "terlambat" | "issue" | "tidak-mengerjakan">("semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);

  // State untuk melebarkan kartu outlet ke bawah (accordion in-place expand)
  const [isOutletExpanded, setIsOutletExpanded] = useState<boolean>(false);

  // Data gerai penugasan aktif staf
  const [selectedStore, setSelectedStore] = useState<OutletInfo>({
    name: "",
    location: "",
    code: "",
    address: "",
  });

  // Modal State untuk Detail Riwayat Checklist (Slide-up di dalam layar HP)
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);
  const [isDetailModalAnimating, setIsDetailModalAnimating] = useState<boolean>(false);

  const handleOpenDetail = (item: HistoryItem) => {
    setSelectedItem(item);
    setIsDetailModalAnimating(false);
    setTimeout(() => setIsDetailModalAnimating(true), 20);
  };

  const handleCloseDetail = () => {
    setIsDetailModalAnimating(false);
    setTimeout(() => setSelectedItem(null), 300);
  };

  // Sinkronisasi live clock & data user
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    if (user?.storeName) {
      setSelectedStore({
        name: user.storeName,
        location: user.storeLocation || "",
        code: user.storeCode || "",
        address: user.storeAddress || "",
      });
    }
  }, []);

  const displayName = currentUser?.fullName || "Staf Lapangan";

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [historyGroups, setHistoryGroups] = useState<HistoryGroup[]>([]);

  // Mengambil data riwayat checklist secara real-time dari database PostgreSQL
  const fetchHistoryData = async (silent = false) => {
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
        res = await fetch(`/api/staff/history${storeParam}`, { headers, cache: "no-store" });
        if (!res || !res.ok) throw new Error(`Fetch status: ${res?.status}`);
      } catch {
        res = await fetch(`http://127.0.0.1:5000/api/staff/history${storeParam}`, { headers, cache: "no-store" });
      }

      if (res && res.ok) {
        const json = await res.json();
        if (json.status === "success" && Array.isArray(json.data)) {
          setHistoryGroups(json.data);
          if (json.store) {
            setSelectedStore({
              name: json.store.name || user?.storeName || "",
              location: json.store.location || user?.storeLocation || "",
              code: json.store.code || user?.storeCode || "",
              address: json.store.address || user?.storeAddress || "",
            });
          }
          if (!silent) {
            toast.success("Riwayat checklist berhasil disinkronkan.");
          }
        }
      }
    } catch (err) {
      console.warn("Gagal memuat riwayat audit:", err);
      if (!silent) {
        toast.error("Gagal menyinkronkan data riwayat.");
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistoryData(true);
  }, []);

  const handleRefresh = () => {
    fetchHistoryData(false);
  };

  // Filter items sesuai tab aktif (Semua, Bulan Ini, Terlambat, Issue) dan pencarian
  const filteredGroups = historyGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        // Filter by tab
        if (activeFilter === "terlambat") {
          const isLate =
            item.statusType === "terlambat" ||
            item.statusBadge.toLowerCase().includes("terlambat");
          if (!isLate) return false;
        }

        if (activeFilter === "issue") {
          const hasIssue =
            item.statusType === "temuan" ||
            item.statusBadge.toLowerCase().includes("issue") ||
            item.statusBadge.toLowerCase().includes("temuan") ||
            item.rightBadge?.toLowerCase().includes("issue") ||
            item.rightBadge?.toLowerCase().includes("perlu tindak lanjut") ||
            item.notes?.toLowerCase().includes("issue") ||
            item.notes?.toLowerCase().includes("kebocoran");
          if (!hasIssue) return false;
        }

        if (activeFilter === "tidak-mengerjakan") {
          const isNonCompliant =
            item.statusType === "tidak_patuh" ||
            item.statusBadge.toLowerCase().includes("tidak patuh") ||
            item.statusBadge.toLowerCase().includes("tidak mengerjakan") ||
            item.rightBadge?.toLowerCase().includes("tidak mengerjakan");
          if (!isNonCompliant) return false;
        }

        if (activeFilter === "bulan-ini") {
          return true;
        }

        // Filter by search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.title.toLowerCase().includes(q) ||
            item.auditor.toLowerCase().includes(q) ||
            (item.auditorRole && item.auditorRole.toLowerCase().includes(q)) ||
            item.statusBadge.toLowerCase().includes(q)
          );
        }
        return true;
      });
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);

  // Total checklist count
  const totalChecklistCount = historyGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f4f6fc] sm:relative sm:inset-auto sm:min-h-screen sm:bg-[#f3f4fa] sm:flex sm:items-center sm:justify-center sm:py-6 sm:px-4 font-sans antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Layar Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Riwayat Checklist (Tampilan Mobile HP)
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
        className={`w-full h-full flex flex-col bg-[#f4f6fc] text-slate-900 transition-all duration-300 relative ${
          isFullscreenMode
            ? "max-w-md sm:rounded-none sm:shadow-none sm:h-screen"
            : "sm:h-[844px] sm:max-h-[92vh] sm:max-w-[420px] sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] sm:border-[9px] sm:border-slate-800 sm:ring-1 sm:ring-white/10 overflow-hidden"
        }`}
      >
        {/* Dynamic Island / Speaker Pill on Desktop Mockup */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 pointer-events-none" />

        {/* 2. Top Header Bar (Persis Gambar: Riwayat Checklist + Ikon Search & Refresh Biru, Tanpa Tombol Back) */}
        <div className="px-5 pt-3.5 sm:pt-4 pb-2.5 bg-transparent flex items-center justify-between gap-2 shrink-0">
          <h1 className="text-lg sm:text-[20px] font-bold text-slate-900 tracking-tight">
            Riwayat Checklist
          </h1>

          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
              aria-label="Cari riwayat"
            >
              <Search className="w-5 h-5 stroke-[2.2]" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
              aria-label="Segarkan data riwayat"
            >
              <RotateCw
                className={`w-5 h-5 stroke-[2.2] ${isRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Input Pencarian Interaktif (Dropdown) */}
        {showSearchInput && (
          <div className="px-4 py-2 bg-white/90 backdrop-blur-md border-b border-slate-200/80 animate-in slide-in-from-top-2 duration-150">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari audit atau nama staf..."
              className="w-full h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#193f53]"
              autoFocus
            />
          </div>
        )}

        {/* Scrollable Content Inside Mobile Screen */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-1.5 pb-6 space-y-3.5">
          {/* 3. Outlet Selector Card (Interaktif: Klik melebarkan rincian alamat cabang ke bawah dengan animasi) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs hover:border-slate-300 transition-all overflow-hidden">
            {/* Header Kartu (Klik untuk expand / collapse) */}
            <div
              onClick={() => setIsOutletExpanded(!isOutletExpanded)}
              className="p-3 flex items-center justify-between cursor-pointer select-none active:bg-slate-50/80 transition-colors"
              title={isOutletExpanded ? "Tutup rincian alamat outlet" : "Klik untuk melihat alamat cabang"}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#193f53] flex items-center justify-center shrink-0">
                  <StoreIcon className="w-5 h-5 stroke-[2]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-slate-400 leading-none">
                    Outlet Aktif
                  </p>
                  <p className="text-xs sm:text-[13px] font-bold text-slate-900 leading-tight mt-1">
                    {selectedStore.location ? `${selectedStore.name} — ${selectedStore.location}` : selectedStore.name}
                  </p>
                </div>
              </div>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors shrink-0 ml-1">
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ease-out ${
                    isOutletExpanded ? "rotate-180 text-[#193f53]" : ""
                  }`}
                />
              </div>
            </div>

            {/* Bagian Melebar ke Bawah: Informasi Cabang & Alamat Lengkap */}
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isOutletExpanded ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100/90 text-xs">
                <div className="bg-[#f8fafc] rounded-xl p-3 border border-slate-100/90 flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#193f53] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-slate-400 leading-none">
                      Alamat Gerai
                    </p>
                    <p className="text-[11px] font-medium text-slate-700 leading-relaxed mt-1">
                      {selectedStore.address}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Horizontal Pill Filter Tabs (Semua, Bulan Ini, ● Terlambat, ● Issue) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs select-none">
            {/* Filter 1: Semua */}
            <button
              onClick={() => setActiveFilter("semua")}
              className={`px-4 py-2 rounded-full font-semibold transition-all shrink-0 cursor-pointer touch-manipulation active:scale-95 ${
                activeFilter === "semua"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Semua ({totalChecklistCount})
            </button>

            {/* Filter 2: Bulan Ini */}
            <button
              onClick={() => setActiveFilter("bulan-ini")}
              className={`px-4 py-2 rounded-full font-semibold transition-all shrink-0 cursor-pointer touch-manipulation active:scale-95 ${
                activeFilter === "bulan-ini"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Bulan Ini
            </button>

            {/* Filter 3: Terlambat (Indikator Kuning/Amber) */}
            <button
              onClick={() => setActiveFilter("terlambat")}
              className={`px-4 py-2 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 ${
                activeFilter === "terlambat"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeFilter === "terlambat" ? "bg-amber-300" : "bg-amber-500"
                } inline-block`}
              />
              <span>Terlambat</span>
            </button>

            {/* Filter 4: Issue (Indikator Merah/Rose) */}
            <button
              onClick={() => setActiveFilter("issue")}
              className={`px-4 py-2 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 ${
                activeFilter === "issue"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeFilter === "issue" ? "bg-rose-300" : "bg-rose-500"
                } inline-block`}
              />
              <span>Issue</span>
            </button>

            {/* Filter 5: Tidak Mengerjakan (Indikator Merah) */}
            <button
              onClick={() => setActiveFilter("tidak-mengerjakan")}
              className={`px-4 py-2 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 ${
                activeFilter === "tidak-mengerjakan"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeFilter === "tidak-mengerjakan" ? "bg-rose-400" : "bg-rose-600"
                } inline-block`}
              />
              <span>Tidak Mengerjakan</span>
            </button>
          </div>

          {/* 5. Grouped History Timeline (Realtime dari Database) */}
          <div className="space-y-4 pt-0.5">
            {isLoading ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-2">
                <RotateCw className="w-8 h-8 text-[#193f53] animate-spin mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">Memuat Riwayat Audit...</h4>
                <p className="text-[11px] text-slate-400">
                  Menyinkronkan data riwayat checklist langsung dari server database.
                </p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-2">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">Tidak Ada Riwayat</h4>
                <p className="text-[11px] text-slate-400">
                  Tidak ditemukan riwayat checklist untuk filter {activeFilter}.
                </p>
              </div>
            ) : (
              filteredGroups.map((group, gIdx) => (
                <div key={gIdx} className="space-y-2.5">
                  {/* Section Header: Bulatan Navy + Judul Tanggal + Jumlah Checklist */}
                  <div className="flex items-center justify-between text-xs px-1">
                    <div className="flex items-center gap-2 font-bold text-slate-900 text-[11px] tracking-wider uppercase">
                      <span className="w-2 h-2 rounded-full bg-[#193f53] inline-block" />
                      <span>{group.dateHeader}</span>
                    </div>
                    <span className="text-xs font-normal text-slate-400">
                      {group.items.length} Checklist
                    </span>
                  </div>

                  {/* Cards List in this Group */}
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleOpenDetail(item)}
                        className="bg-white rounded-2xl p-4 border border-slate-100/90 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer group active:scale-[0.99]"
                      >
                        {/* Top Row: Status Badge (Selesai/Terlambat/Issue), Time, Chevron Right */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {item.statusType === "selesai" && (
                              <span className="px-2.5 py-0.5 bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]/80 text-[11px] font-semibold rounded-full flex items-center gap-1 shadow-2xs">
                                <Check className="w-3 h-3 stroke-[2.8]" />
                                <span>Selesai</span>
                              </span>
                            )}
                            {item.statusType === "terlambat" && (
                              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 text-[11px] font-semibold rounded-full flex items-center gap-1 shadow-2xs">
                                <Clock className="w-3 h-3 text-amber-700 stroke-[2.2]" />
                                <span>{item.statusBadge}</span>
                              </span>
                            )}
                            {item.statusType === "temuan" && (
                              <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200/80 text-[11px] font-semibold rounded-full flex items-center gap-1 shadow-2xs">
                                <AlertTriangle className="w-3 h-3 text-rose-600 stroke-[2.2]" />
                                <span>{item.statusBadge}</span>
                              </span>
                            )}
                            {item.statusType === "tidak_patuh" && (
                              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-bold rounded-full flex items-center gap-1 shadow-2xs">
                                <AlertCircle className="w-3 h-3 text-rose-700 stroke-[2.2]" />
                                <span>{item.statusBadge}</span>
                              </span>
                            )}

                            <span className="text-xs text-slate-400 font-normal ml-0.5">
                              • {item.time}
                            </span>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>

                        {/* Title Audit Checklist */}
                        <h3 className="font-bold text-sm sm:text-[15px] text-slate-900 mt-2.5 leading-snug">
                          {item.title}
                        </h3>

                        {/* Auditor Name + Role */}
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Oleh{" "}
                            <span className="font-semibold text-slate-800">
                              {item.auditor}
                            </span>
                            {item.auditorRole && (
                              <span className="text-slate-400 font-normal">
                                {" "}
                                ({item.auditorRole})
                              </span>
                            )}
                          </span>
                        </p>

                        {/* Separator Line */}
                        <div className="border-t border-slate-100/90 my-2.5" />

                        {/* Bottom Footer Info: Item Count, Percentage Score, GPS / Shift Badge */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-400 font-normal">{item.itemCount}</span>
                            <span className="text-slate-300">•</span>
                            <span
                              className={`font-bold ${
                                item.statusType === "selesai"
                                ? "text-[#059669]"
                                : item.statusType === "terlambat"
                                ? "text-amber-600"
                                : "text-rose-600"
                              }`}
                            >
                              {item.scoreText}
                            </span>
                          </div>

                          {/* Right Badge: GPS Valid atau Shift Pagi/Malam atau Perlu Tindak Lanjut */}
                          {item.isGpsValid ? (
                            <span className="px-2.5 py-0.5 bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]/80 text-[11px] font-semibold rounded-full flex items-center gap-1 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#059669] stroke-[2]" />
                              <span>GPS Valid</span>
                            </span>
                          ) : item.rightBadge ? (
                            <span
                              className={`text-xs font-medium ${
                                item.statusType === "temuan"
                                  ? "text-rose-600 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full text-[10px]"
                                  : "text-slate-400"
                              }`}
                            >
                              {item.rightBadge}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 6. Bottom Navigation Bar (Persis Gambar: 3 Tab - Checklist, Riwayat Aktif, Profile) */}
        <StaffBottomNav activeTab="audits" showIssues={false} />

        {/* POPUP MODAL: RINCIAN DETAIL RIWAYAT (SLIDE UP DARI BAWAH DI DALAM HP) */}
        {selectedItem && (
          <div
            className={`absolute inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-[2px] transition-opacity duration-300 overflow-hidden ${
              isDetailModalAnimating ? "opacity-100" : "opacity-0"
            }`}
            onClick={handleCloseDetail}
          >
            <div
              className={`w-full bg-white rounded-t-[28px] shadow-[0_-10px_35px_rgba(0,0,0,0.22)] flex flex-col overflow-hidden transition-all duration-300 ease-out transform ${
                isDetailModalAnimating ? "translate-y-0" : "translate-y-full"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle Bar */}
              <div className="pt-2.5 pb-1 flex justify-center">
                <div className="w-11 h-1 bg-slate-200/90 rounded-full" />
              </div>

              {/* Header Modal */}
              <div className="px-5 pt-1.5 pb-2 border-b border-slate-100 flex items-start justify-between">
                <div className="pr-2">
                  <div
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      selectedItem.statusType === "tidak_patuh"
                        ? "text-rose-800 bg-rose-100 border border-rose-300"
                        : selectedItem.statusType === "temuan"
                        ? "text-rose-700 bg-rose-50 border border-rose-200/80"
                        : selectedItem.statusType === "terlambat"
                        ? "text-amber-800 bg-amber-50 border border-amber-200/80"
                        : "text-emerald-700 bg-emerald-50 border border-emerald-200/80"
                    }`}
                  >
                    {selectedItem.statusType === "tidak_patuh" ? (
                      <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                    ) : selectedItem.statusType === "temuan" ? (
                      <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                    ) : (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    )}
                    <span>
                      {selectedItem.statusType === "tidak_patuh"
                        ? "Tidak Mengerjakan / Tidak Patuh"
                        : selectedItem.statusType === "temuan"
                        ? "Temuan / Issue Tercatat"
                        : "Laporan Audit Terverifikasi"}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1 leading-snug">
                    {selectedItem.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="w-8 h-8 rounded-full bg-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors -mr-1.5 -mt-1 cursor-pointer shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              </div>

              {/* Detail Content */}
              <div className="p-5 space-y-3.5 overflow-y-auto max-h-[50vh] text-xs">
                <div className="bg-[#f8fafc] p-3.5 rounded-2xl border border-slate-100 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Waktu Penyerahan:</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {selectedItem.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Auditor Pelaksana:</span>
                    <span className="font-semibold text-slate-800 text-xs">
                      {selectedItem.auditor}{" "}
                      {selectedItem.auditorRole && (
                        <span className="text-slate-400 font-normal">
                          ({selectedItem.auditorRole})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Kesesuaian SOP:</span>
                    <span
                      className={`font-bold text-xs ${
                        selectedItem.statusType === "temuan"
                          ? "text-rose-600"
                          : selectedItem.statusType === "terlambat"
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}
                    >
                      {selectedItem.itemCount} • {selectedItem.scoreText}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 text-[11px]">Validasi Lokasi:</span>
                    {selectedItem.isGpsValid ? (
                      <span className="font-semibold text-emerald-600 text-xs flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        GPS Terverifikasi di Gerai
                      </span>
                    ) : (
                      <span className="font-semibold text-rose-600 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {selectedItem.statusType === "tidak_patuh" ? "Nihil (Tidak Mengerjakan)" : "Lokasi Tidak Terverifikasi"}
                      </span>
                    )}
                  </div>
                </div>

                {selectedItem.notes && (
                  <div
                    className={`rounded-xl p-3 text-xs space-y-0.5 border ${
                      selectedItem.statusType === "tidak_patuh"
                        ? "bg-rose-50 border-rose-200 text-rose-900"
                        : selectedItem.statusType === "temuan"
                        ? "bg-rose-50/70 border-rose-200/80 text-rose-900"
                        : "bg-[#fef9c3]/60 border-amber-200/80 text-amber-900"
                    }`}
                  >
                    <p className="font-bold text-[11px]">
                      {selectedItem.statusType === "tidak_patuh"
                        ? "Status Kepatuhan Audit:"
                        : selectedItem.statusType === "temuan"
                        ? "Rincian Kendala / Issue:"
                        : "Catatan Pelaksanaan:"}
                    </p>
                    <p className="text-[11px] leading-relaxed opacity-90">
                      {selectedItem.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Button: Tutup */}
              <div className="p-5 pt-1 pb-2">
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="w-full py-3 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>

              {/* Bottom Home Indicator Bar */}
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

export default function RiwayatChecklistPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3f4fa] flex items-center justify-center text-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <RotateCcw className="w-4 h-4 animate-spin text-[#193f53]" />
            <span>Memuat riwayat checklist...</span>
          </div>
        </div>
      }
    >
      <RiwayatContent />
    </Suspense>
  );
}

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  RotateCw,
  Store as StoreIcon,
  ChevronDown,
  ChevronRight,
  Check,
  CheckCircle2,
  Clock,
  AlertTriangle,
  User,
  MapPin,
  Cloud,
  X,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
  Signal,
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
  statusType: "selesai" | "terlambat" | "temuan";
  statusBadge: string;
  rightBadge?: string;
  isGpsValid?: boolean;
}

interface HistoryGroup {
  dateHeader: string;
  dateSubHeader: string;
  items: HistoryItem[];
}

function RiwayatContent() {
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState<string>("09:41");
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<"semua" | "bulan-ini" | "tepat-waktu">("semua");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);

  // Selected item detail modal
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

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

  const displayName = currentUser?.fullName || "Siti Rahmawati";
  const displayStore = currentUser?.storeName || "Kopi Kenangan";
  const displayLocation = currentUser?.storeLocation || "Mall Kelapa Gading 3";

  // Data riwayat checklist sesuai screenshot
  const historyGroups: HistoryGroup[] = [
    {
      dateHeader: "HARI INI — 24 OKT 2024",
      dateSubHeader: "2 Selesai",
      items: [
        {
          id: "r-1",
          time: "11:38 WIB",
          title: "Hygiene & Sanitasi Meja Bar",
          auditor: displayName,
          auditorRole: "Senior Barista",
          itemCount: "8/8 Item",
          scoreText: "100% Sesuai",
          statusType: "selesai",
          statusBadge: "✓ Selesai",
          isGpsValid: true,
        },
        {
          id: "r-2",
          time: "07:15 WIB",
          title: "Opening Shift & Stock Check",
          auditor: displayName,
          itemCount: "12/12 Item",
          scoreText: "100% Sesuai",
          statusType: "selesai",
          statusBadge: "✓ Selesai",
          rightBadge: "Shift Pagi",
        },
      ],
    },
    {
      dateHeader: "KEMARIN — 23 OKT 2024",
      dateSubHeader: "2 Checklist",
      items: [
        {
          id: "r-3",
          time: "22:45 WIB",
          title: "Closing & Sanitasi Mesin Kopi",
          auditor: "Budi Santoso",
          auditorRole: "Barista",
          itemCount: "10/10 Item",
          scoreText: "95% Sesuai",
          statusType: "terlambat",
          statusBadge: "⏰ Terlambat 15m",
          rightBadge: "Shift Malam",
        },
        {
          id: "r-4",
          time: "16:30 WIB",
          title: "Deep Clean Grinder & Chiller Mingguan",
          auditor: displayName,
          itemCount: "14/15 Item",
          scoreText: "93% Sesuai",
          statusType: "temuan",
          statusBadge: "⚠️ 1 Temuan Diselesaikan",
          rightBadge: "Pembersihan Ekstra",
        },
      ],
    },
    {
      dateHeader: "MINGGU LALU",
      dateSubHeader: "22 Okt 2024",
      items: [
        {
          id: "r-5",
          time: "14:02 WIB",
          title: "Pengecekan Kebersihan Area Kasir & POS",
          auditor: displayName,
          itemCount: "6/6 Item",
          scoreText: "100% Sesuai",
          statusType: "selesai",
          statusBadge: "✓ Selesai",
          rightBadge: "Audit Reguler",
        },
      ],
    },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Riwayat checklist berhasil disinkronkan.");
    }, 600);
  };

  // Filter items
  const filteredGroups = historyGroups
    .map((group) => {
      const filteredItems = group.items.filter((item) => {
        // Filter by tab
        if (activeFilter === "tepat-waktu" && item.statusType !== "selesai") return false;
        // Filter by search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return (
            item.title.toLowerCase().includes(q) ||
            item.auditor.toLowerCase().includes(q)
          );
        }
        return true;
      });
      return { ...group, items: filteredItems };
    })
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center sm:py-6 p-0 sm:px-4 font-sans select-none antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Layar Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Riwayat Checklist (Mobile View)
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
        {/* Dynamic Island / Speaker Pill on Desktop Mockup */}
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

        {/* 2. Top Header Bar matching the image */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => router.push("/jadwal-staff")}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <h1 className="text-base font-bold text-slate-900 flex-1 px-1">
            Riwayat Checklist
          </h1>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setShowSearchInput(!showSearchInput)}
              className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Cari"
            >
              <Search className="w-4 h-4 stroke-[2.2]" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Segarkan"
            >
              <RotateCw
                className={`w-4 h-4 stroke-[2.2] ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
              />
            </button>
          </div>
        </div>

        {/* Search input dropdown */}
        {showSearchInput && (
          <div className="px-4 py-2 bg-white border-b border-slate-100 animate-in slide-in-from-top-2 duration-150">
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

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
          {/* 3. Outlet Selector Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between shadow-2xs hover:border-slate-300 transition-all cursor-pointer">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#193f53] flex items-center justify-center shrink-0">
                <StoreIcon className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">
                  Outlet Aktif
                </p>
                <p className="text-xs font-bold text-slate-900 leading-tight mt-1 truncate">
                  {displayStore} — {displayLocation}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </div>

          {/* 4. Horizontal Pill Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs select-none">
            <button
              onClick={() => setActiveFilter("semua")}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
                activeFilter === "semua"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Semua (24)
            </button>

            <button
              onClick={() => setActiveFilter("bulan-ini")}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 cursor-pointer ${
                activeFilter === "bulan-ini"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Bulan Ini
            </button>

            <button
              onClick={() => setActiveFilter("tepat-waktu")}
              className={`px-3.5 py-1.5 rounded-full font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                activeFilter === "tepat-waktu"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Selesai Tepat Waktu</span>
            </button>
          </div>

          {/* 5. Grouped History Timeline */}
          <div className="space-y-4">
            {filteredGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-2.5">
                {/* Section Header */}
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] tracking-wide">
                    {gIdx === 0 && <span className="w-2 h-2 rounded-full bg-[#193f53]" />}
                    <span>{group.dateHeader}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {group.dateSubHeader}
                  </span>
                </div>

                {/* Cards in this group */}
                <div className="space-y-2.5">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-300 hover:shadow-md transition-all cursor-pointer group"
                    >
                      {/* Top Row: Status Badge, Time, Chevron */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.statusType === "selesai" && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md flex items-center gap-1">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Selesai</span>
                            </span>
                          )}
                          {item.statusType === "terlambat" && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold rounded-md">
                              {item.statusBadge}
                            </span>
                          )}
                          {item.statusType === "temuan" && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-md">
                              {item.statusBadge}
                            </span>
                          )}

                          <span className="text-[11px] font-mono text-slate-600">
                            • {item.time}
                          </span>
                        </div>

                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </div>

                      {/* Title */}
                      <h3 className="font-bold text-sm text-slate-900 mt-2 leading-tight">
                        {item.title}
                      </h3>

                      {/* Auditor Name */}
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          Oleh <span className="font-semibold text-slate-700">{item.auditor}</span>
                          {item.auditorRole && (
                            <span className="text-slate-400 font-normal"> ({item.auditorRole})</span>
                          )}
                        </span>
                      </p>

                      {/* Bottom Footer Info */}
                      <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-slate-500">{item.itemCount}</span>
                          <span className="text-slate-300">•</span>
                          <span
                            className={`font-semibold ${
                              item.statusType === "selesai"
                                ? "text-emerald-600"
                                : item.statusType === "terlambat"
                                ? "text-amber-700"
                                : "text-slate-700"
                            }`}
                          >
                            {item.scoreText}
                          </span>
                        </div>

                        {/* Right Badge */}
                        {item.isGpsValid && (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-1 border border-emerald-100">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                            <span>GPS Valid</span>
                          </span>
                        )}
                        {item.rightBadge && !item.isGpsValid && (
                          <span
                            className={`text-[11px] font-medium ${
                              item.rightBadge === "Pembersihan Ekstra"
                                ? "bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-bold text-[10px]"
                                : "text-slate-400"
                            }`}
                          >
                            {item.rightBadge}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 6. Offline Footer Note */}
          <div className="py-2 select-none">
            <div className="bg-slate-100/70 border border-slate-200/60 rounded-xl py-2 px-3 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
              <Cloud className="w-3.5 h-3.5 text-slate-500" />
              <span>Disinkronkan otomatis • 24 riwayat tersimpan offline</span>
            </div>
          </div>
        </div>

        {/* 7. Bottom Navigation Bar matching the image */}
        <StaffBottomNav activeTab="audits" />
      </div>

      {/* POPUP MODAL: RINCIAN AUDIT DETAIL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  Arsip Audit Terverifikasi
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Waktu Audit:</span>
                <span className="font-semibold text-slate-800">{selectedItem.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Auditor:</span>
                <span className="font-semibold text-slate-800">{selectedItem.auditor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Skor Evaluasi:</span>
                <span className="font-bold text-emerald-600">{selectedItem.scoreText}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jumlah Checklist:</span>
                <span className="font-semibold text-slate-800">{selectedItem.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lokasi / GPS:</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" /> Terverifikasi Gerai
                </span>
              </div>
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              className="w-full py-2.5 bg-[#193f53] hover:bg-[#122f3e] text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RiwayatChecklistPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Memuat riwayat checklist...</span>
          </div>
        </div>
      }
    >
      <RiwayatContent />
    </Suspense>
  );
}

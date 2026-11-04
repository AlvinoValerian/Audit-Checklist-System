"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RotateCw,
  Store as StoreIcon,
  ChevronRight,
  Filter,
  X,
  Camera,
  MapPin,
  Check,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";
import StaffBottomNav from "../components/StaffBottomNav";

interface IssueItem {
  id: string;
  title: string;
  category: string;
  description: string;
  dateFormatted: string;
  reporter: string;
  priority: "Kritis" | "Sedang" | "Rendah";
  status: "Perlu Tindakan" | "Dalam Pantauan" | "Terselesaikan";
  resolutionNote?: string;
}

function IssuesContent() {
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState<string>("09:41");
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [activeFilter, setActiveFilter] = useState<"semua" | "perlu-tindakan" | "selesai">("semua");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modal Detail & Modal Buat Isu
  const [selectedIssue, setSelectedIssue] = useState<IssueItem | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newCategory, setNewCategory] = useState<string>("Mesin & Peralatan");
  const [newPriority, setNewPriority] = useState<"Kritis" | "Sedang" | "Rendah">("Sedang");
  const [newDescription, setNewDescription] = useState<string>("");

  const [issues, setIssues] = useState<IssueItem[]>([
    {
      id: "iss-1",
      title: "1 Botol Sirup Hazelnut Batch Lama",
      category: "Penyimpanan & FIFO",
      description: "Ditemukan botol sirup hazelnut batch lama yang mendekati batas expired pada rak chiller bar.",
      dateFormatted: "Hari Ini • 11:38 WIB",
      reporter: "Siti Rahmawati",
      priority: "Sedang",
      status: "Terselesaikan",
      resolutionNote: "Botol telah dipisahkan ke area karantina dan diganti dengan batch baru sesuai SOP.",
    },
    {
      id: "iss-2",
      title: "Gasket Portafilter Aus (Chamber 2)",
      category: "Mesin & Peralatan",
      description: "Terdapat rembesan air panas di sisi portafilter saat siklus ekstraksi espresso 9 bar.",
      dateFormatted: "Kemarin • 22:45 WIB",
      reporter: "Budi Santoso",
      priority: "Sedang",
      status: "Dalam Pantauan",
      resolutionNote: "Perlu penggantian rubber gasket pada jadwal kunjungan maintenance teknisi mingguan.",
    },
    {
      id: "iss-3",
      title: "Suhu Chiller Susu Sempat Menyentuh 4.8°C",
      category: "Suhu & Chiller",
      description: "Sensor chiller mendeteksi kenaikan suhu di atas toleransi aman (1°C - 4°C) saat jam istirahat.",
      dateFormatted: "Kemarin • 16:30 WIB",
      reporter: "Siti Rahmawati",
      priority: "Kritis",
      status: "Perlu Tindakan",
      resolutionNote: "Kondensor telah dibersihkan dari debu, suhu turun ke 2.8°C namun perlu pemantauan 1x24 jam.",
    },
    {
      id: "iss-4",
      title: "Knockbox Ampas Kopi Penuh di Jam Sibuk",
      category: "Kebersihan Meja Bar",
      description: "Penumpukan ampas kopi basah melebihi batas 2/3 kapasitas di bawah grinder utama.",
      dateFormatted: "22 Okt 2024 • 14:00 WIB",
      reporter: "Siti Rahmawati",
      priority: "Rendah",
      status: "Terselesaikan",
      resolutionNote: "Dikosongkan dan disterilisasi dengan semprotan alkohol sanitasi sebelum pergantian shift.",
    },
  ]);

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

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success("Daftar isu operasional berhasil disinkronkan.");
    }, 600);
  };

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      toast.error("Harap lengkapi judul dan deskripsi temuan.");
      return;
    }

    const newItem: IssueItem = {
      id: `iss-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      description: newDescription.trim(),
      dateFormatted: "Baru saja • Hari Ini",
      reporter: displayName,
      priority: newPriority,
      status: "Perlu Tindakan",
      resolutionNote: "Laporan baru tercatat di sistem gerai. Menunggu verifikasi SPV.",
    };

    setIssues([newItem, ...issues]);
    setShowCreateModal(false);
    setNewTitle("");
    setNewDescription("");
    toast.success("Temuan operasional baru berhasil dilaporkan!");
  };

  // Filtered issues
  const filteredIssues = issues.filter((item) => {
    if (activeFilter === "perlu-tindakan") {
      return item.status === "Perlu Tindakan" || item.status === "Dalam Pantauan";
    }
    if (activeFilter === "selesai") {
      return item.status === "Terselesaikan";
    }
    return true;
  });

  const countPending = issues.filter((i) => i.status !== "Terselesaikan").length;
  const countResolved = issues.filter((i) => i.status === "Terselesaikan").length;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center sm:py-6 p-0 sm:px-4 font-sans select-none antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Layar Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Isu & Temuan Gerai (Mobile View)
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
            Isu & Temuan Gerai
          </h1>

          <div className="flex items-center gap-1 shrink-0">
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
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-8 h-8 rounded-full bg-[#193f53] text-white hover:bg-[#122f3e] flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              aria-label="Tambah Isu"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
          {/* Outlet Info Box */}
          <div className="bg-[#eef4ff] border border-blue-100 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#193f53] flex items-center justify-center shrink-0">
              <StoreIcon className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <p className="text-xs font-semibold text-slate-800 truncate">
              {displayStore} — {displayLocation}
            </p>
          </div>

          {/* Metric Stats Cards */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white rounded-2xl p-2.5 border border-slate-100 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total
              </span>
              <span className="text-lg font-bold text-slate-900 block mt-0.5">
                {issues.length}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-2.5 border border-rose-100 shadow-2xs">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">
                Perlu Tindak
              </span>
              <span className="text-lg font-bold text-rose-700 block mt-0.5">
                {countPending}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-2.5 border border-emerald-100 shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">
                Selesai
              </span>
              <span className="text-lg font-bold text-emerald-700 block mt-0.5">
                {countResolved}
              </span>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 text-xs select-none">
            <button
              onClick={() => setActiveFilter("semua")}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all cursor-pointer ${
                activeFilter === "semua"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Semua ({issues.length})
            </button>
            <button
              onClick={() => setActiveFilter("perlu-tindakan")}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === "perlu-tindakan"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Perlu Tindakan ({countPending})</span>
            </button>
            <button
              onClick={() => setActiveFilter("selesai")}
              className={`px-3 py-1.5 rounded-full font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeFilter === "selesai"
                  ? "bg-[#193f53] text-white shadow-2xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Selesai ({countResolved})</span>
            </button>
          </div>

          {/* List of Issue Cards */}
          <div className="space-y-2.5">
            {filteredIssues.map((item) => {
              const isPending = item.status !== "Terselesaikan";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedIssue(item)}
                  className={`rounded-2xl p-4 border transition-all cursor-pointer group ${
                    isPending
                      ? "bg-rose-50/25 border-rose-200/90 shadow-2xs hover:shadow-md"
                      : "bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                            item.priority === "Kritis"
                              ? "bg-rose-100 text-rose-800"
                              : item.priority === "Sedang"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {item.priority}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          • {item.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-slate-900 mt-1 leading-snug">
                        {item.title}
                      </h3>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full shrink-0 ${
                        item.status === "Terselesaikan"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : item.status === "Dalam Pantauan"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{item.dateFormatted}</span>
                    </span>
                    <span className="flex items-center gap-0.5 font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                      <span>Rincian</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 7. Bottom Navigation Bar */}
        <StaffBottomNav activeTab="issues" />
      </div>

      {/* POPUP MODAL: DETAIL ISU */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                  Temuan Operasional
                </span>
                <h3 className="font-bold text-sm text-slate-900 mt-1">
                  {selectedIssue.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Kategori:</span>
                  <span className="font-semibold text-slate-800">{selectedIssue.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tingkat Prioritas:</span>
                  <span className="font-bold text-rose-700">{selectedIssue.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Pelapor:</span>
                  <span className="font-semibold text-slate-800">{selectedIssue.reporter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Tindakan:</span>
                  <span className="font-bold text-emerald-600">{selectedIssue.status}</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-800 block mb-1">
                  Deskripsi Temuan:
                </label>
                <p className="text-slate-600 leading-relaxed bg-white border border-slate-200 p-2.5 rounded-xl">
                  {selectedIssue.description}
                </p>
              </div>

              {selectedIssue.resolutionNote && (
                <div>
                  <label className="font-bold text-slate-800 block mb-1">
                    Tindakan Koreksi SOP:
                  </label>
                  <p className="text-emerald-800 leading-relaxed bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-xl">
                    {selectedIssue.resolutionNote}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedIssue(null)}
              className="w-full py-2.5 bg-[#193f53] hover:bg-[#122f3e] text-white font-semibold text-xs rounded-xl cursor-pointer"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      )}

      {/* POPUP MODAL: BUAT LAPORAN ISU BARU */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Laporkan Temuan Gerai
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Judul Temuan / Masalah *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Lampu neon display redup"
                  className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#193f53]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Kategori
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Mesin & Peralatan">Mesin & Peralatan</option>
                    <option value="Kebersihan Meja Bar">Kebersihan Meja Bar</option>
                    <option value="Penyimpanan & FIFO">Penyimpanan & FIFO</option>
                    <option value="Suhu & Chiller">Suhu & Chiller</option>
                    <option value="Area Dine-in">Area Dine-in</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Prioritas
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as "Kritis" | "Sedang" | "Rendah")}
                    className="w-full h-9 px-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  >
                    <option value="Kritis">Kritis</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Rendah">Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Keterangan / Kondisi Fisik *
                </label>
                <textarea
                  required
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Jelaskan kondisi fisik aktual dan nomor unit mesin jika ada..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#193f53] resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-[#193f53] hover:bg-[#122f3e] text-white font-semibold rounded-xl shadow-xs cursor-pointer"
                >
                  Kirim Laporan Temuan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function IssuesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Memuat daftar isu & temuan...</span>
          </div>
        </div>
      }
    >
      <IssuesContent />
    </Suspense>
  );
}

"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  Store as StoreIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Camera,
  Scale,
  ChevronRight,
  Lock,
  ArrowRight,
  Cloud,
  Check,
  RotateCcw,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  X,
  UploadCloud,
  Sparkles,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";

interface ReviewItem {
  id: number;
  number: number;
  title: string;
  statusType: "ya" | "na" | "temuan" | "wajib-isi" | "foto-wajib";
  statusBadge: string;
  isComplete: boolean;
  image?: string;
  imageBadge?: string;
  quote?: string;
  note?: string;
  subInfo?: string;
  actionText?: string;
}

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentTime, setCurrentTime] = useState<string>("09:41");
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Modal dialog states untuk mengisi item 7 & 8 langsung
  const [showItem7Modal, setShowItem7Modal] = useState<boolean>(false);
  const [item7Weight, setItem7Weight] = useState<string>("1.450");
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Data 8 item review sesuai screenshot
  const [items, setItems] = useState<ReviewItem[]>([
    {
      id: 1,
      number: 1,
      title: "Apakah rolling door dan lampu area depan berfungsi normal?",
      statusType: "ya",
      statusBadge: "✓ Ya",
      isComplete: true,
      image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=160&h=160&fit=crop",
      imageBadge: "06:45",
      quote: "“Semua lampu terang”",
      subInfo: "1 Foto terlampir",
    },
    {
      id: 2,
      number: 2,
      title: "Pemeriksaan kebersihan keset & area entrance",
      statusType: "na",
      statusBadge: "N/A",
      isComplete: true,
      note: "Alasan: Gerai indoor mall",
    },
    {
      id: 3,
      number: 3,
      title: "Apakah suhu chiller susu dan area meja bar telah disterilisasi?",
      statusType: "ya",
      statusBadge: "✓ Ya (2.8°C)",
      isComplete: true,
      image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=160&h=160&fit=crop",
      imageBadge: "GPS Terverifikasi",
      subInfo: "Sensor kalibrasi aktif",
    },
    {
      id: 4,
      number: 4,
      title: "Pengecekan tanggal kedaluwarsa sirup & fresh milk",
      statusType: "temuan",
      statusBadge: "⏰ Temuan",
      isComplete: true,
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=160&h=160&fit=crop",
      quote: "“1 botol sirup hazelnut sisa batch kemarin dipisahkan”",
      subInfo: "Tindakan koreksi dibuat",
    },
    {
      id: 5,
      number: 5,
      title: "Apakah tempat sampah bar dilapisi plastik hitam dan tertutup?",
      statusType: "ya",
      statusBadge: "✓ Ya",
      isComplete: true,
      subInfo: "Foto tidak disyaratkan",
    },
    {
      id: 6,
      number: 6,
      title: "Sanitasi steam wand mesin espresso dan portafilter",
      statusType: "ya",
      statusBadge: "✓ Ya",
      isComplete: true,
      image: "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=160&h=160&fit=crop",
      quote: "SOP Purging & soaking selesai",
      subInfo: "1 Foto terverifikasi",
    },
    {
      id: 7,
      number: 7,
      title: "Pencatatan sisa stok biji kopi House Blend (Opening Stock)",
      statusType: "ya",
      statusBadge: "✓ Ya (1.450 kg)",
      isComplete: true,
      note: "Timbangan tercatat: 1.450 kg • Sesuai standar opening",
      subInfo: "Data timbangan terverifikasi",
    },
    {
      id: 8,
      number: 8,
      title: "Foto kondisi keseluruhan meja bar sebelum melayani pelanggan",
      statusType: "ya",
      statusBadge: "✓ Ya",
      isComplete: true,
      image: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=160&h=160&fit=crop",
      imageBadge: "GPS Terverifikasi",
      quote: "Meja bar bersih siap melayani shift pagi",
      subInfo: "1 Foto terlampir",
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

  const completedCount = items.filter((i) => i.isComplete).length;
  const totalCount = items.length;
  const incompleteCount = totalCount - completedCount;
  const isAllComplete = completedCount === totalCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const displayStore = currentUser?.storeName || "Kopi Kenangan";
  const displayLocation = currentUser?.storeLocation || "Mall Kelapa Gading 3";

  // Selesaikan Item 7 (Input Timbangan Kopi)
  const handleSaveItem7 = () => {
    if (!item7Weight || isNaN(Number(item7Weight.replace(",", ".")))) {
      toast.error("Harap masukkan angka berat sisa stok kopi yang valid.");
      return;
    }
    setItems((prev) =>
      prev.map((it) => {
        if (it.id === 7) {
          return {
            ...it,
            statusType: "ya",
            statusBadge: `✓ Ya (${item7Weight} kg)`,
            isComplete: true,
            note: `Timbangan tercatat: ${item7Weight} kg (Toleransi SOP aman)`,
            actionText: undefined,
          };
        }
        return it;
      })
    );
    setShowItem7Modal(false);
    toast.success("Data timbangan biji kopi House Blend berhasil disimpan!");
  };

  // Selesaikan Item 8 (Ambil Foto Bar)
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setItems((prev) =>
          prev.map((it) => {
            if (it.id === 8) {
              return {
                ...it,
                statusType: "ya",
                statusBadge: "✓ Ya",
                isComplete: true,
                image: reader.result as string,
                imageBadge: "GPS Terverifikasi",
                quote: "Area bar bersih siap melayani",
                subInfo: "1 Foto terlampir",
                actionText: undefined,
              };
            }
            return it;
          })
        );
        toast.success("Foto kondisi keseluruhan meja bar berhasil diambil!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Lanjut ke Halaman Konfirmasi & Serahkan
  const handleProceedToConfirmation = () => {
    if (!isAllComplete) {
      toast.error("Masih ada pertanyaan wajib yang belum diisi. Lengkapi terlebih dahulu.");
      return;
    }
    toast.success("Melanjutkan ke Konfirmasi & Serahkan Laporan...");
    router.push("/jadwal-staff/konfirmasi");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center sm:py-6 p-0 sm:px-4 font-sans select-none antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Tampilan Mobile: Tinjau Jawaban
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

        {/* 2. Top Navigation Header matching screenshot */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => router.push("/jadwal-staff/pengerjaan?q=8")}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex-1 text-center min-w-0">
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Tinjau Jawaban
            </h1>
            <p className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5 truncate">
              Hygiene & Sanitasi Meja Bar • Draft #42
            </p>
          </div>

          <button
            onClick={() => setShowHelpModal(true)}
            className="w-8 h-8 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Bantuan"
          >
            <HelpCircle className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5">
          {/* 3. Store Info Banner */}
          <div className="bg-[#eef4ff] border border-blue-100/90 rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 shadow-2xs">
            <div className="w-6 h-6 rounded-lg bg-blue-100 text-[#193f53] flex items-center justify-center shrink-0">
              <StoreIcon className="w-3.5 h-3.5 stroke-[2.2]" />
            </div>
            <p className="text-xs font-semibold text-slate-800 truncate">
              {displayStore} - {displayLocation}
            </p>
          </div>

          {/* 4. Completion Summary Progress Card */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-slate-900">
                  {completedCount} dari {totalCount}
                </span>{" "}
                <span className="text-xs font-medium text-slate-500">Selesai</span>
              </div>

              {incompleteCount > 0 ? (
                <div className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold rounded-full flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  <span>{incompleteCount} Belum Lengkap</span>
                </div>
              ) : (
                <div className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3 stroke-[3]" />
                  <span>Semua Lengkap</span>
                </div>
              )}
            </div>

            {/* Progress Bar Track */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#193f53] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 5. Review Cards List (8 Items) */}
          <div className="space-y-2.5">
            {items.map((item) => {
              const isAlertCard = item.statusType === "wajib-isi" || item.statusType === "foto-wajib";

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.id === 7 && !item.isComplete) {
                      setShowItem7Modal(true);
                    } else if (item.id === 8 && !item.isComplete) {
                      fileInputRef.current?.click();
                    } else {
                      router.push(`/jadwal-staff/pengerjaan?q=${item.number}`);
                    }
                  }}
                  className={`rounded-2xl p-3.5 border transition-all cursor-pointer ${
                    isAlertCard
                      ? "bg-rose-50/30 border-rose-200 border-l-4 border-l-rose-500 shadow-2xs hover:shadow-md"
                      : "bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-200 hover:shadow-sm"
                  }`}
                >
                  {/* Top Row: Number, Title, Status Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      <div
                        className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                          isAlertCard
                            ? "bg-rose-100 text-rose-700"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {item.number}
                      </div>
                      <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {item.statusType === "ya" && (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">
                          {item.statusBadge}
                        </span>
                      )}
                      {item.statusType === "na" && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md">
                          {item.statusBadge}
                        </span>
                      )}
                      {item.statusType === "temuan" && (
                        <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold rounded-md flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{item.statusBadge}</span>
                        </span>
                      )}
                      {(item.statusType === "wajib-isi" || item.statusType === "foto-wajib") && (
                        <span className="px-2 py-0.5 bg-rose-700 text-white text-[10px] font-bold rounded-md flex items-center gap-1">
                          {item.statusType === "wajib-isi" ? (
                            <Clock className="w-2.5 h-2.5" />
                          ) : (
                            <Camera className="w-2.5 h-2.5" />
                          )}
                          <span>{item.statusBadge}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row Details */}
                  <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                    {/* With Image Thumbnail */}
                    {item.image ? (
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                          <img
                            src={item.image}
                            alt="Bukti foto"
                            className="w-full h-full object-cover"
                          />
                          {item.imageBadge && (
                            <span className="absolute bottom-0.5 left-0.5 right-0.5 bg-black/70 text-[9px] font-mono text-white text-center py-0.2 rounded leading-tight truncate">
                              {item.imageBadge}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          {item.quote && (
                            <p
                              className={`text-xs italic truncate font-medium ${
                                item.statusType === "temuan"
                                  ? "text-rose-800 font-semibold"
                                  : "text-slate-700"
                              }`}
                            >
                              {item.quote}
                            </p>
                          )}
                          {item.subInfo && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {item.subInfo}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Without Image Thumbnail */
                      <div className="flex-1 min-w-0">
                        {item.note && (
                          <p
                            className={`text-xs flex items-center gap-1.5 ${
                              isAlertCard
                                ? "text-rose-700 font-semibold"
                                : "text-slate-500 font-medium"
                            }`}
                          >
                            {item.statusType === "wajib-isi" && (
                              <Scale className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            {item.statusType === "foto-wajib" && (
                              <Camera className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            {item.statusType === "na" && (
                              <span className="text-slate-400">ℹ️</span>
                            )}
                            <span className="truncate">{item.note}</span>
                          </p>
                        )}
                        {item.subInfo && (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {item.subInfo}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Right Action / Chevron */}
                    <div className="shrink-0 pl-2">
                      {item.actionText ? (
                        <span className="text-xs font-bold text-slate-800 hover:text-rose-700 flex items-center gap-0.5">
                          <span>{item.actionText}</span>
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 6. Offline Draf Indicator */}
          <div className="py-1 text-center select-none">
            <div className="inline-flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Otomatis tersimpan sebagai draf offline</span>
            </div>
          </div>
        </div>

        {/* 7. Bottom Fixed Action Box matching screenshot */}
        <div className="p-4 pb-6 bg-white/95 backdrop-blur-md border-t border-slate-100 shrink-0 space-y-2.5">
          {/* Warning Banner */}
          {incompleteCount > 0 ? (
            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-2.5 text-xs text-amber-800 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {incompleteCount} pertanyaan wajib belum diisi / foto belum lengkap
              </span>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl p-2.5 text-xs text-emerald-800 font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Semua 8 pertanyaan telah lengkap & siap dikonfirmasi!</span>
            </div>
          )}

          {/* Action Button: Locked or Active */}
          {incompleteCount > 0 ? (
            <button
              disabled
              className="w-full py-3.5 px-4 bg-blue-100/80 text-blue-400 font-semibold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 cursor-not-allowed select-none border border-blue-200/50"
            >
              <Lock className="w-4 h-4" />
              <span>Lanjut ke Konfirmasi</span>
            </button>
          ) : (
            <button
              onClick={handleProceedToConfirmation}
              className="w-full py-3.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <span>Lanjut ke Konfirmasi</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <p className="text-[11px] text-slate-400 text-center select-none">
            {incompleteCount > 0
              ? "Ketuk kartu berwarna merah untuk melengkapi audit"
              : "Audit akan disimpan dan ditandatangani secara digital"}
          </p>
        </div>

        {/* Hidden Camera Input for Item 8 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoCapture}
          className="hidden"
        />
      </div>

      {/* POPUP MODAL: ISI DATA ITEM 7 (TIMBANGAN BIJI KOPI) */}
      {showItem7Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-rose-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  Input Stok Biji Kopi
                </h3>
              </div>
              <button
                onClick={() => setShowItem7Modal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Timbang sisa biji House Blend di hopper/kontainer opening shift dan masukkan hasil timbangan:
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Berat Sisa Stok (Kg)
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={item7Weight}
                  onChange={(e) => setItem7Weight(e.target.value)}
                  placeholder="Contoh: 1.450"
                  className="w-full h-11 px-3 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 outline-none"
                />
                <span className="absolute right-3 text-xs font-semibold text-slate-400">
                  Kilogram
                </span>
              </div>
              <p className="text-[10px] text-emerald-600 font-medium mt-1">
                ✓ Toleransi aman: 1.0 – 2.5 kg
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowItem7Modal(false)}
                className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveItem7}
                className="w-2/3 py-2.5 bg-[#193f53] hover:bg-[#122f3e] text-white font-semibold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                Simpan Timbangan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: HELP DIALOG (?) */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Panduan Tinjau Jawaban
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Halaman ini merangkum seluruh 8 item SOP shift Anda. Kartu bergaris tepi merah menandakan checklist wajib yang belum lengkap. Ketuk kartu tersebut untuk melengkapi data atau mengambil foto.
            </p>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReviewJawabanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Memuat tinjau jawaban audit...</span>
          </div>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}

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
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  X,
  Check,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";

interface QuestionItem {
  id: number;
  taskId?: string;
  sopCode: string;
  isCritical: boolean;
  isPhotoRequired?: boolean;
  category: string;
  title: string;
  instruction: string;
}

interface StoredAudit {
  scheduleId: string;
  scheduleTitle: string;
  storeName: string;
  storeCode: string;
  templateName: string;
  questions: QuestionItem[];
  selectedConditions: Record<number, "standard" | "na">;
  photos: Record<number, string>;
  notes: Record<number, string>;
  startedAt?: string;
}

function ReviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scheduleId = searchParams.get("id") || "";

  const [currentTime, setCurrentTime] = useState<string>("09:41");
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  const [auditData, setAuditData] = useState<StoredAudit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

    // Ambil data audit aktif dari localStorage
    try {
      const stored = localStorage.getItem("staff_active_audit");
      if (stored) {
        const parsed: StoredAudit = JSON.parse(stored);
        if (!scheduleId || parsed.scheduleId === scheduleId) {
          setAuditData(parsed);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Gagal membaca audit dari localStorage:", e);
    }

    // Jika belum ada di localStorage, fetch langsung dari API
    if (scheduleId) {
      fetch(`/api/staff/schedules/${scheduleId}`)
        .then((r) => r.json())
        .then((res) => {
          if (res.status === "success" && res.data) {
            const initialConditions: Record<number, "standard" | "na"> = {};
            (res.data.tasks || []).forEach((t: QuestionItem) => {
              initialConditions[t.id] = "standard";
            });
            const data: StoredAudit = {
              scheduleId: res.data.id,
              scheduleTitle: res.data.title,
              storeName: res.data.store?.name || user?.storeName || "Toko Cabang",
              storeCode: res.data.store?.code || "ST-01",
              templateName: res.data.templateName || "Standar SOP",
              questions: res.data.tasks || [],
              selectedConditions: initialConditions,
              photos: {},
              notes: {},
              startedAt: new Date().toISOString(),
            };
            setAuditData(data);
            localStorage.setItem("staff_active_audit", JSON.stringify(data));
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    return () => clearInterval(timer);
  }, [scheduleId]);

  const questions = auditData?.questions || [];
  const selectedConditions = auditData?.selectedConditions || {};
  const photos = auditData?.photos || {};
  const notes = auditData?.notes || {};

  // Hitung jumlah butir yang lengkap
  const totalCount = questions.length;
  const completedQuestions = questions.filter((q) => {
    const hasCondition = Boolean(selectedConditions[q.id]);
    const photoValid = !q.isPhotoRequired || Boolean(photos[q.id]);
    return hasCondition && photoValid;
  });
  const completedCount = completedQuestions.length;
  const incompleteCount = totalCount - completedCount;
  const isAllComplete = completedCount === totalCount && totalCount > 0;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const displayStore = auditData?.storeName || currentUser?.storeName || "Toko Cabang";
  const displayTitle = auditData?.scheduleTitle || "Tinjau Jawaban Checklist";

  // Lanjut ke Halaman Konfirmasi & Serahkan
  const handleProceedToConfirmation = () => {
    if (!isAllComplete && totalCount > 0) {
      toast.error("Masih ada pertanyaan yang membutuhkan foto bukti wajib. Harap lengkapi terlebih dahulu.");
      return;
    }
    toast.success("Melanjutkan ke Konfirmasi & Serahkan Laporan...");
    router.push(`/jadwal-staff/konfirmasi?id=${auditData?.scheduleId || scheduleId}`);
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
        {/* Dynamic Island on Desktop Frame */}
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

        {/* 2. Top Navigation Header */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => router.push(`/jadwal-staff/pengerjaan?id=${auditData?.scheduleId || scheduleId}`)}
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
              {displayTitle}
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
              {displayStore} • {auditData?.templateName || "Standar SOP"}
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
                  <span>{incompleteCount} Butuh Foto</span>
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

          {/* 5. Review Cards List (Dynamic from Template) */}
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
              <RotateCcw className="w-5 h-5 animate-spin text-[#193f53]" />
              <span>Memuat data checklist...</span>
            </div>
          ) : questions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 bg-white rounded-2xl p-4 border border-slate-100">
              Tidak ada butir checklist untuk jadwal ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {questions.map((q, idx) => {
                const itemNumber = idx + 1;
                const condition = selectedConditions[q.id] || "standard";
                const photo = photos[q.id];
                const note = notes[q.id];
                const isPhotoMissing = q.isPhotoRequired && !photo;

                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      router.push(
                        `/jadwal-staff/pengerjaan?id=${auditData?.scheduleId || scheduleId}&q=${itemNumber}`
                      );
                    }}
                    className={`rounded-2xl p-3.5 border transition-all cursor-pointer ${
                      isPhotoMissing
                        ? "bg-rose-50/30 border-rose-200 border-l-4 border-l-rose-500 shadow-2xs hover:shadow-md"
                        : "bg-white border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-slate-200 hover:shadow-sm"
                    }`}
                  >
                    {/* Top Row: Number, Title, Status Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div
                          className={`w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 ${
                            isPhotoMissing
                              ? "bg-rose-100 text-rose-700"
                              : "bg-blue-50 text-blue-600"
                          }`}
                        >
                          {itemNumber}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            {q.category}
                          </span>
                          <h3 className="text-xs sm:text-[13px] font-bold text-slate-900 leading-snug mt-0.5">
                            {q.title}
                          </h3>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {isPhotoMissing ? (
                          <span className="px-2 py-0.5 bg-rose-700 text-white text-[10px] font-bold rounded-md flex items-center gap-1">
                            <Camera className="w-2.5 h-2.5" />
                            <span>Wajib Foto</span>
                          </span>
                        ) : condition === "standard" ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold rounded-md">
                            ✓ Ya, Sesuai
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md">
                            N/A
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Row Details (Photo, Note, or SubInfo) */}
                    {(photo || note) && (
                      <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-xs">
                        {photo ? (
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                              <img
                                src={photo}
                                alt="Bukti foto"
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-0.5 left-0.5 right-0.5 bg-black/70 text-[9px] font-mono text-white text-center py-0.2 rounded leading-tight truncate">
                                GPS Valid
                              </span>
                            </div>
                            <div className="min-w-0">
                              {note && (
                                <p className="text-xs italic truncate font-medium text-slate-700">
                                  “{note}”
                                </p>
                              )}
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                1 Foto terlampir
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <p className="text-xs italic truncate font-medium text-slate-700">
                              “{note}”
                            </p>
                          </div>
                        )}

                        <span className="text-[11px] font-semibold text-[#193f53] flex items-center gap-0.5 shrink-0 ml-2">
                          <span>Ubah</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 6. Sticky Bottom Action Bar */}
        <div className="p-4 pb-6 bg-white border-t border-slate-100 shrink-0">
          <button
            onClick={handleProceedToConfirmation}
            className="w-full py-3.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Lanjutkan ke Penyerahan</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* POPUP MODAL: PANDUAN (?) */}
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
              Pastikan seluruh butir pemeriksaan telah diverifikasi langsung di lapangan. Anda dapat mengetuk kartu butir kapan saja untuk mengubah jawaban atau foto bukti sebelum diserahkan.
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

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Memuat tinjauan checklist...</span>
          </div>
        </div>
      }
    >
      <ReviewContent />
    </Suspense>
  );
}

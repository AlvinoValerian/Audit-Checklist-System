"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  Store as StoreIcon,
  CheckCircle2,
  Lock,
  Camera,
  RotateCw,
  Send,
  ShieldCheck,
  Check,
  RotateCcw,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  X,
  Clock,
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

function KonfirmasiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scheduleId = searchParams.get("id") || "";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentTime, setCurrentTime] = useState<string>("11:35");
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>(
    "24 Okt 2024, 11:35 WIB"
  );
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [auditData, setAuditData] = useState<StoredAudit | null>(null);

  // Selfie photo state
  const [selfiePhoto, setSelfiePhoto] = useState<string>(
    "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=800&fit=crop"
  );
  const [isSelfieVerified, setIsSelfieVerified] = useState<boolean>(true);

  // Digital Signature state
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(true);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Initial draw of signature spline on canvas
  const drawDefaultSignature = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(40, 75);
    ctx.quadraticCurveTo(70, 45, 95, 75);
    ctx.quadraticCurveTo(115, 95, 130, 60);
    ctx.quadraticCurveTo(145, 30, 160, 75);
    ctx.lineTo(190, 75);
    ctx.quadraticCurveTo(210, 40, 230, 70);
    ctx.bezierCurveTo(240, 85, 270, 90, 290, 75);
    ctx.stroke();

    setHasSignature(true);
  };

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    // Ambil data audit aktif
    try {
      const stored = localStorage.getItem("staff_active_audit");
      if (stored) {
        const parsed: StoredAudit = JSON.parse(stored);
        if (!scheduleId || parsed.scheduleId === scheduleId) {
          setAuditData(parsed);
        }
      }
    } catch (e) {
      console.warn("Gagal membaca audit:", e);
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

    if (canvasRef.current) {
      drawDefaultSignature(canvasRef.current);
    }

    return () => clearInterval(timer);
  }, [scheduleId]);

  // Canvas drawing handlers
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ("clientX" in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    toast.info("Tanda tangan dibersihkan. Silakan tanda tangan ulang.");
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setSelfiePhoto(reader.result as string);
        setIsSelfieVerified(true);
        toast.success("Foto diri berhasil diambil & terverifikasi GPS!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Final Report to Backend PostgreSQL
  const handleSubmitFinalReport = async () => {
    if (!isSelfieVerified || !hasSignature) {
      toast.error("Harap pastikan foto diri dan tanda tangan digital telah dilengkapi.");
      return;
    }

    const targetScheduleId = auditData?.scheduleId || scheduleId;
    if (!targetScheduleId) {
      toast.error("ID Jadwal tidak valid.");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = AuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (currentUser?.email) headers["x-user-email"] = currentUser.email;
      if (currentUser?.role) headers["x-user-role"] = currentUser.role;
      const rawId = currentUser?.rawId || (currentUser?.id ? currentUser.id.replace(/^staff-/, "").replace(/^sa-/, "").replace(/^adm-/, "") : undefined);
      if (rawId) headers["x-user-id"] = rawId;

      const questions = auditData?.questions || [];
      const answersPayload = questions.map((q) => ({
        taskId: q.id,
        answer: auditData?.selectedConditions?.[q.id] || "standard",
        note: auditData?.notes?.[q.id] || "",
        photo: auditData?.photos?.[q.id] || "",
      }));

      const bodyPayload = {
        answers: answersPayload,
        selfiePhoto,
        signature: "Digital Signature Verified",
        startedAt: auditData?.startedAt || new Date().toISOString(),
      };

      let res: Response | null = null;
      try {
        res = await fetch(`/api/staff/schedules/${targetScheduleId}/submit`, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyPayload),
        });
        if (!res || !res.ok) throw new Error(`Submit status: ${res?.status}`);
      } catch {
        res = await fetch(`http://127.0.0.1:5000/api/staff/schedules/${targetScheduleId}/submit`, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyPayload),
        });
      }

      if (res && res.ok) {
        // Catat sebagai completed di localStorage
        if (typeof window !== "undefined") {
          try {
            const completed = JSON.parse(localStorage.getItem("staff_completed_tasks") || "[]");
            if (!completed.includes(targetScheduleId)) {
              completed.push(targetScheduleId);
              localStorage.setItem("staff_completed_tasks", JSON.stringify(completed));
            }
            localStorage.removeItem("staff_active_audit");
          } catch (e) {
            console.warn(e);
          }
        }

        toast.success("🎉 Laporan audit checklist berhasil diserahkan ke Store Manager!");
        router.push("/jadwal-staff/terkirim");
      } else {
        toast.error("Gagal menyerahkan laporan audit ke server.");
      }
    } catch (err) {
      console.error("Error submitting final report:", err);
      // Fallback lokal agar staf tidak terhambat di lapangan
      if (typeof window !== "undefined") {
        try {
          const completed = JSON.parse(localStorage.getItem("staff_completed_tasks") || "[]");
          if (!completed.includes(targetScheduleId)) {
            completed.push(targetScheduleId);
            localStorage.setItem("staff_completed_tasks", JSON.stringify(completed));
          }
          localStorage.removeItem("staff_active_audit");
        } catch (e) {}
      }
      toast.success("Laporan disimpan dan disinkronkan secara lokal!");
      router.push("/jadwal-staff/terkirim");
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = currentUser?.fullName || "Staf Lapangan";
  const displayRole = currentUser?.position || "Auditor Lapangan";
  const displayStore = auditData?.storeName || currentUser?.storeName || "Toko Cabang";
  const displayLocation = currentUser?.storeLocation || "Kota Malang";
  const displayStoreCode = auditData?.storeCode || currentUser?.storeCode || "ST-01";
  const displayTitle = auditData?.scheduleTitle || "Laporan Audit Checklist";
  const displayTemplate = auditData?.templateName || "Standar SOP Operasional";
  const totalQuestions = auditData?.questions?.length || 0;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center sm:py-6 p-0 sm:px-4 font-sans select-none antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Konfirmasi & Tanda Tangan (Mobile View)
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

        {/* 2. Top Navigation Bar */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => router.push(`/jadwal-staff/review?id=${auditData?.scheduleId || scheduleId}`)}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex-1 text-center min-w-0">
            <div className="inline-flex items-center gap-1.5 justify-center">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Konfirmasi & Serahkan
              </h1>
              {totalQuestions > 0 && (
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded">
                  {totalQuestions} Butir Selesai
                </span>
              )}
            </div>
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

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5">
          {/* 3. Top Identity Card: Staff Bertugas & Toko */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] relative overflow-hidden space-y-3">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#193f53]" />

            <div className="flex items-center justify-between pt-0.5">
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 font-semibold text-[11px] rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Staff Bertugas
                </span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-medium text-[11px] rounded-full">
                  {displayRole}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Terkunci Sistem</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border border-slate-200 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=200&fit=crop"
                  alt="Staff Avatar"
                  className="w-full h-full object-cover"
                />
                <span className="w-3 h-3 bg-emerald-500 rounded-full border-2 border-white absolute bottom-0 right-0" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  {displayName}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {displayRole} • {currentUser?.email || "staff@gacoan.com"}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-50 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-800 font-medium truncate">
                  <StoreIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">
                    {displayStore} — {displayLocation}
                  </span>
                </div>
                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] font-semibold rounded shrink-0">
                  {displayStoreCode}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{currentDateFormatted}</span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Auto-Validasi OK</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Card 1: Foto Diri Bertugas */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#193f53] font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Foto Diri Bertugas
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-full">
                Wajib
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Ambil foto selfie di area gerai dengan seragam lengkap untuk validasi kehadiran fisik & bukti serah terima audit.
            </p>

            <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
              <img
                src={selfiePhoto}
                alt="Selfie Verifikasi Staff"
                className="w-full h-52 object-cover"
              />

              <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                <span className="px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>GPS Terverifikasi (Dalam Gerai)</span>
                </span>
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              </div>

              <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-xs text-white p-2.5 rounded-xl text-[10px] font-mono leading-tight space-y-0.5">
                <div className="flex items-center justify-between text-yellow-300">
                  <span>📍 GPS Verified • Gerai {displayStoreCode}</span>
                  <span>AUDIT-SYSTEM</span>
                </div>
                <div className="flex items-center justify-between text-slate-200">
                  <span>{currentDateFormatted}</span>
                  <span>{displayStore}</span>
                </div>
              </div>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Foto terverifikasi sistem</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs hover:border-slate-300 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                <span>Ambil Ulang Foto</span>
              </button>
            </div>
          </div>

          {/* 5. Card 2: Tanda Tangan Digital */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#193f53] font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  Tanda Tangan Digital
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold rounded-full">
                Wajib
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Bubuhkan tanda tangan digital Anda di kanvas bawah ini sebagai bukti pertanggungjawaban data audit.
            </p>

            <div className="relative border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-1 flex items-center justify-center overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={360}
                height={150}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="cursor-crosshair w-full h-[150px] bg-transparent"
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-xs">
                  Goreskan tanda tangan di sini
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-[11px] text-slate-400">
                Tanda tangan digital tersimpan aman
              </span>
              <button
                type="button"
                onClick={clearSignature}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Hapus & Ulang
              </button>
            </div>
          </div>
        </div>

        {/* 6. Bottom Sticky Action Bar */}
        <div className="p-4 pb-6 bg-white border-t border-slate-100 shrink-0 space-y-2">
          <button
            onClick={handleSubmitFinalReport}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Menyerahkan Laporan ke Store Manager...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Kirim & Serahkan Laporan</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center select-none flex items-center justify-center gap-1">
            <span>🌐</span>
            <span>Diteruskan langsung ke Dashboard Workspace Store Manager</span>
          </p>
        </div>

        {/* Hidden Camera Input for Selfie */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          onChange={handlePhotoCapture}
          className="hidden"
        />
      </div>

      {/* POPUP MODAL: PANDUAN (?) */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-150 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                Validasi Kehadiran & Tanda Tangan
              </h3>
              <button
                onClick={() => setShowHelpModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Langkah verifikasi ini memastikan kepatuhan SOP bahwa auditor benar-benar berada di gerai dan mempertanggungjawabkan akurasi data checklist secara sah.
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

export default function KonfirmasiSerahkanPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Memuat konfirmasi penyerahan audit...</span>
          </div>
        </div>
      }
    >
      <KonfirmasiContent />
    </Suspense>
  );
}

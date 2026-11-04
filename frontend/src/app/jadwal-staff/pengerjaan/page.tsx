"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  X,
  Info,
  CheckCircle2,
  MinusCircle,
  Camera,
  MapPin,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowRight,
  Cloud,
  Check,
  RotateCcw,
  Smartphone,
  Maximize2,
  Wifi,
  Battery,
  Signal,
  Trash2,
  Sparkles,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";

interface QuestionItem {
  id: number;
  sopCode: string;
  isCritical: boolean;
  isPhotoRequired?: boolean;
  category: string;
  title: string;
  instruction: string;
  defaultStandard: string;
  defaultStandardSub: string;
  defaultNA: string;
  defaultNASub: string;
}

const AUDIT_QUESTIONS: QuestionItem[] = [
  {
    id: 1,
    sopCode: "ITEM SOP #01",
    isCritical: false,
    category: "Area Bar & Peralatan",
    title: "Apakah seragam barista, celemek, dan name tag lengkap dan bersih?",
    instruction: "Pastikan seluruh barista memakai celemek bersih, hairnet/topi, dan masker bila diperlukan.",
    defaultStandard: "Ya, Sesuai Standar",
    defaultStandardSub: "Barista mengenakan seragam rapi dan bersih",
    defaultNA: "Tidak Relevan / N/A",
    defaultNASub: "Belum pergantian shift barista",
  },
  {
    id: 2,
    sopCode: "ITEM SOP #02",
    isCritical: false,
    category: "Area Bar & Peralatan",
    title: "Apakah kalibrasi mesin espresso dan grinder telah dilakukan sesuai standar rasio?",
    instruction: "Pastikan extraction time antara 25-30 detik dengan berat yield 36-38 gram.",
    defaultStandard: "Ya, Sesuai Standar",
    defaultStandardSub: "Rasio extraction 1:2 tercapai dengan optimal",
    defaultNA: "Tidak Relevan / N/A",
    defaultNASub: "Mesin masih dalam siklus heating/backflush",
  },
  {
    id: 3,
    sopCode: "ITEM SOP #03",
    isCritical: true,
    isPhotoRequired: true,
    category: "Area Bar & Peralatan",
    title: "Apakah suhu chiller susu dan area meja bar telah disterilisasi sebelum shift?",
    instruction: "Pastikan termometer internal chiller menunjukkan antara 1°C – 4°C dan permukaan stainless steel disemprot cairan disinfektan food-grade.",
    defaultStandard: "Ya, Sesuai Standar",
    defaultStandardSub: "Suhu 2.8°C dan meja bar telah higienis",
    defaultNA: "Tidak Relevan / N/A",
    defaultNASub: "Unit bar belum beroperasi penuh",
  },
  {
    id: 4,
    sopCode: "ITEM SOP #04",
    isCritical: false,
    category: "Area Bar & Peralatan",
    title: "Apakah area sink cuci piring bebas dari ampas kopi dan sisa residu susu?",
    instruction: "Cek grease trap dan lubang pembuangan sink agar tidak mampet dan disemprot air hangat.",
    defaultStandard: "Ya, Sesuai Standar",
    defaultStandardSub: "Sink bersih, kering, dan bebas aroma residu",
    defaultNA: "Tidak Relevan / N/A",
    defaultNASub: "Sedang dilakukan perendaman sanitasi berkala",
  },
  {
    id: 5,
    sopCode: "ITEM SOP #05",
    isCritical: true,
    category: "Kebersihan & Sanitasi",
    title: "Apakah knockbox ampas espresso dikosongkan dan disanitasi secara berkala?",
    instruction: "Knockbox tidak boleh menumpuk lebih dari 1/2 kapasitas untuk mencegah kontaminasi jamur.",
    defaultStandard: "Ya, Sesuai Standar",
    defaultStandardSub: "Knockbox bersih dan disemprot alkohol 70%",
    defaultNA: "Tidak Relevan / N/A",
    defaultNASub: "Area bar tutup sementara",
  },
  {
    id: 6,
    sopCode: "ITEM SOP #06",
    isCritical: false,
    category: "Kebersihan & Sanitasi",
    title: "Apakah kain lap microfiber dipisahkan sesuai kode warna (Steam wand, Bar, Chiller)?",
    instruction: "Kain kuning untuk steam wand, biru untuk meja bar, putih untuk chiller makanan.",
    defaultStandard: "Ya, Sesuai Standar",
    defaultStandardSub: "3 warna kain terpisah dalam larutan sanitasi",
    defaultNA: "Tidak Relevan / N/A",
    defaultNASub: "Stok kain dalam siklus laundry",
  },
  {
    id: 7,
    sopCode: "ITEM SOP #07",
    isCritical: false,
    category: "Penyimpanan Bahan Baku",
    title: "Apakah tanggal kadaluarsa (FIFO) susu UHT dan sirup telah dicek dan berlabel?",
    instruction: "Pastikan setiap botol sirup terpasang stiker 'Opened Date' dan tidak melewati toleransi SOP.",
    defaultStandard: "Ya, Sesuai Standar",
    defaultStandardSub: "Label FIFO terpasang rapi dan valid",
    defaultNA: "Tidak Relevan / N/A",
    defaultNASub: "Bahan baku belum unboxing dari storage utama",
  },
  {
    id: 8,
    sopCode: "ITEM SOP #08",
    isCritical: true,
    isPhotoRequired: true,
    category: "Dokumentasi Akhir",
    title: "Apakah foto dokumentasi keseluruhan kebersihan area bar telah diambil dan terverifikasi?",
    instruction: "Ambil foto sudut luas (wide) mencakup meja kasir, grinder, mesin espresso, dan lantai bar.",
    defaultStandard: "Ya, Sesuai Standar",
    defaultStandardSub: "Area bar bersih 100% siap melayani pelanggan",
    defaultNA: "Tidak Relevan / N/A",
    defaultNASub: "Pemeriksaan penutupan khusus",
  },
];

function PengerjaanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Status Bar live clock
  const [currentTime, setCurrentTime] = useState<string>("09:41");
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  // Question navigation state - default start on Question 3 (as seen on the screenshot)
  const initialQIndex = 2; // Question 3 (index 2)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(initialQIndex);

  // User input per question: option selected ("standard", "na"), photo preview URL, note text
  const [selectedConditions, setSelectedConditions] = useState<Record<number, "standard" | "na">>({
    1: "standard",
    2: "standard",
    3: "standard",
  });
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({
    3: "",
  });
  const [isNoteOpen, setIsNoteOpen] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Dynamic Store Info
  const storeName = currentUser?.storeName || "Kopi Kenangan";

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    // Ambil parameter pertanyaan q jika ada (contoh: ?q=7 atau ?q=8)
    const qParam = searchParams.get("q");
    if (qParam) {
      const qNum = parseInt(qParam, 10);
      if (qNum >= 1 && qNum <= AUDIT_QUESTIONS.length) {
        setCurrentQuestionIndex(qNum - 1);
      }
    }

    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, [searchParams]);

  const currentQ = AUDIT_QUESTIONS[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = AUDIT_QUESTIONS.length;
  const progressPercent = Math.round((questionNumber / totalQuestions) * 100);

  // Selected option for current question
  const currentCondition = selectedConditions[currentQ.id] || "standard";
  const currentPhoto = photos[currentQ.id];
  const currentNote = notes[currentQ.id] || "";

  // Handle Photo Capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos((prev) => ({
          ...prev,
          [currentQ.id]: reader.result as string,
        }));
        toast.success("Foto bukti visual berhasil diambil dengan watermark GPS!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPhotos((prev) => {
      const updated = { ...prev };
      delete updated[currentQ.id];
      return updated;
    });
    toast.info("Foto bukti dihapus.");
  };

  // Next Question or Proceed to Review Page
  const handleNextQuestion = () => {
    // Validasi Foto Wajib: jika pertanyaan mewajibkan foto dan belum ada foto
    if (currentQ.isPhotoRequired && !photos[currentQ.id]) {
      toast.error("⚠️ Wajib mengambil foto bukti visual sebelum melanjutkan!");
      return;
    }

    // If not last question, move to next
    if (currentQuestionIndex < totalQuestions - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success(`Draf disimpan. Melanjutkan ke Pertanyaan ${nextIndex + 1}...`);
    } else {
      // Pertanyaan terakhir tercapai -> Arahkan ke Halaman Tinjau Jawaban (Review)
      toast.success("Pertanyaan terakhir selesai. Menuju halaman Tinjau Jawaban...");
      router.push("/jadwal-staff/review");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center sm:py-6 p-0 sm:px-4 font-sans select-none antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Layar Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Form Pengerjaan Audit (Mobile View)
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

        {/* 1. Mobile Status Bar (iOS / Android Style) */}
        <div className="pt-3 px-6 pb-1 flex items-center justify-between text-slate-900 font-semibold text-xs tracking-tight z-20 shrink-0 select-none bg-white/70 backdrop-blur-md border-b border-slate-100/50">
          <span className="text-sm font-bold tracking-tight">{currentTime}</span>
          <div className="flex items-center gap-1.5 text-slate-800">
            <Signal className="w-3.5 h-3.5 stroke-[2.2]" />
            <Wifi className="w-3.5 h-3.5 stroke-[2.2]" />
            <Battery className="w-4 h-4 stroke-[2.2]" />
          </div>
        </div>

        {/* 2. Top Navigation Bar matching the image */}
        <div className="px-4 py-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => router.push("/jadwal-staff")}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex-1 min-w-0 px-1">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none">
              AUDIT OUTLET
            </p>
            <h1 className="text-sm font-bold text-slate-900 truncate leading-tight mt-0.5">
              Hygiene & Sanitasi Meja Bar
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => router.push("/jadwal-staff/review")}
              className="px-2 py-0.5 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
              title="Buka Tinjau Jawaban"
            >
              Draft #42
            </button>
            <button
              onClick={() => router.push("/jadwal-staff")}
              className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* 3. Progress Bar & Step Counter matching the image */}
        <div className="bg-white/80 px-5 pt-3 pb-2.5 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-100/80 font-bold text-[11px]">
              <span className="text-indigo-600">📑</span>
              <span>
                Pertanyaan {questionNumber} dari {totalQuestions}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              • {currentQ.category} {progressPercent}%
            </span>
          </div>

          {/* Progress Bar Line */}
          <div className="h-1.5 w-full bg-indigo-100/70 rounded-full overflow-hidden mt-1">
            <div
              className="h-full bg-indigo-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 4. Question Card */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3.5">
            {/* Badges Row: ITEM SOP & Kritis */}
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px] rounded-lg border border-indigo-100/70">
                {currentQ.sopCode}
              </span>
              {currentQ.isCritical && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 font-bold text-[11px] rounded-lg border border-amber-200/80 flex items-center gap-1">
                  <span>🔥</span>
                  <span>Kritis</span>
                </span>
              )}
            </div>

            {/* Question Title */}
            <h2 className="text-base sm:text-[17px] font-bold text-slate-900 leading-snug">
              {currentQ.title}
            </h2>

            {/* Instruction / Hint Callout Box */}
            <div className="bg-[#f3f7fd] border border-blue-100/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>{currentQ.instruction}</span>
            </div>
          </div>

          {/* 5. Section: PILIH KONDISI LAPANGAN */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                PILIH KONDISI LAPANGAN
              </span>
              <span className="text-xs font-semibold text-indigo-600">
                1 Pilihan Terpilih
              </span>
            </div>

            {/* Option 1: Ya, Sesuai Standar */}
            <div
              onClick={() =>
                setSelectedConditions((prev) => ({ ...prev, [currentQ.id]: "standard" }))
              }
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                currentCondition === "standard"
                  ? "border-[#193f53] bg-blue-50/25 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    currentCondition === "standard"
                      ? "bg-[#193f53] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    {currentQ.defaultStandard}
                  </h3>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">
                    {currentQ.defaultStandardSub}
                  </p>
                </div>
              </div>

              {/* Radio Indicator */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  currentCondition === "standard"
                    ? "bg-[#193f53] text-white"
                    : "border-2 border-slate-300"
                }`}
              >
                {currentCondition === "standard" && (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </div>
            </div>

            {/* Option 2: Tidak Relevan / N/A */}
            <div
              onClick={() =>
                setSelectedConditions((prev) => ({ ...prev, [currentQ.id]: "na" }))
              }
              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                currentCondition === "na"
                  ? "border-[#193f53] bg-blue-50/25 shadow-xs"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    currentCondition === "na"
                      ? "bg-[#193f53] text-white"
                      : "bg-blue-50 text-slate-500"
                  }`}
                >
                  <MinusCircle className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 leading-tight">
                    {currentQ.defaultNA}
                  </h3>
                  <p className="text-xs text-slate-500 leading-tight mt-0.5">
                    {currentQ.defaultNASub}
                  </p>
                </div>
              </div>

              {/* Radio Indicator */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  currentCondition === "na"
                    ? "bg-[#193f53] text-white"
                    : "border-2 border-slate-300"
                }`}
              >
                {currentCondition === "na" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* 6. Section: Bukti Visual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                <Camera className="w-4 h-4 text-slate-700" />
                <span>Bukti Visual</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold rounded-full">
                Wajib 1 Foto
              </span>
            </div>

            {/* Hidden Input for Camera Capture */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoCapture}
              className="hidden"
            />

            {/* Upload / Camera Box */}
            {currentPhoto ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
                <img
                  src={currentPhoto}
                  alt="Bukti Visual Bar"
                  className="w-full h-48 object-cover"
                />
                {/* Watermark Overlay */}
                <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white p-2 rounded-xl text-[10px] font-mono flex items-center justify-between">
                  <span>📍 GPS: -6.2146, 106.8451 • {currentTime} WIB</span>
                  <button
                    onClick={handleRemovePhoto}
                    className="p-1 hover:bg-rose-600 rounded-md transition-colors text-white cursor-pointer"
                    title="Hapus foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 bg-[#f7faff] rounded-2xl p-5 text-center transition-all hover:border-indigo-400 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs group-hover:scale-105 transition-transform">
                  <div className="relative">
                    <Camera className="w-6 h-6 stroke-[2]" />
                    <span className="absolute -top-1 -right-1.5 text-xs font-bold leading-none text-indigo-600">
                      +
                    </span>
                  </div>
                </div>

                <h4 className="font-bold text-sm text-slate-900 mt-2.5">
                  Ambil Foto Bukti (Kamera)
                </h4>
                <p className="text-xs text-slate-500 max-w-[270px] mx-auto mt-1 leading-relaxed">
                  Ambil foto langsung melalui kamera ponsel dengan watermark GPS & cap waktu aktif.
                </p>

                {/* GPS Watermark Capsule & Quick Sample Button */}
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <div className="inline-flex items-center gap-1.5 bg-white border border-indigo-100/80 px-3 py-1.5 rounded-xl shadow-xs text-[11px] font-mono text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>GPS: -6.2146, 106.8451 • Akurasi 3m</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhotos((prev) => ({
                        ...prev,
                        [currentQ.id]:
                          "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&fit=crop",
                      }));
                      toast.success("Foto bukti terverifikasi dengan GPS berhasil dimuat!");
                    }}
                    className="text-[10px] font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
                  >
                    + Foto Otomatis
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 7. Section: Tambah Catatan (Opsional) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
            <button
              type="button"
              onClick={() => setIsNoteOpen(!isNoteOpen)}
              className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span>📝</span>
                <span>+ Tambah Catatan (Opsional)</span>
              </div>
              {isNoteOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isNoteOpen && (
              <div className="px-3.5 pb-3.5 space-y-2">
                <textarea
                  value={currentNote}
                  maxLength={250}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [currentQ.id]: e.target.value }))
                  }
                  placeholder="Ketik catatan tambahan jika ada temuan khusus pada suhu chiller atau kesterilan meja..."
                  rows={3}
                  className="w-full text-xs text-slate-800 placeholder:text-slate-400 bg-slate-50/70 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 resize-none transition-all"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                  <span>Maksimal 250 karakter</span>
                  <span className="font-mono">{currentNote.length} / 250</span>
                </div>
              </div>
            )}
          </div>

          {/* 8. Audit Quality Disclaimer */}
          <div className="pt-1 text-center">
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1.5 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>
                Pemeriksaan teraudit oleh Sistem Manajemen Mutu {storeName}
              </span>
            </p>
          </div>
        </div>

        {/* 9. Bottom Sticky Action Bar matching the image */}
        <div className="p-4 pb-6 bg-white/95 backdrop-blur-md border-t border-slate-100 shrink-0">
          <button
            onClick={handleNextQuestion}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            {questionNumber < totalQuestions ? (
              <>
                <span>Lanjut ke Pertanyaan {questionNumber + 1}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Lanjut ke Tinjau Jawaban</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Subtitle offline sync note */}
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium select-none">
            <Cloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Otomatis menyimpan draf respons offline</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PengerjaanChecklistPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
          <div className="flex items-center gap-2 text-sm">
            <RotateCcw className="w-4 h-4 animate-spin text-blue-400" />
            <span>Memuat lembar pengerjaan audit...</span>
          </div>
        </div>
      }
    >
      <PengerjaanContent />
    </Suspense>
  );
}

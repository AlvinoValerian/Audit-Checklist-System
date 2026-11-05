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
  AlertCircle,
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
  defaultStandard: string;
  defaultStandardSub: string;
  defaultNA: string;
  defaultNASub: string;
}

interface ScheduleDetail {
  id: string;
  title: string;
  timeRange: string;
  templateName: string;
  store: {
    id: string;
    name: string;
    address: string;
    city: string;
    code: string;
  };
  totalQuestions: number;
  tasks: QuestionItem[];
}

function PengerjaanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [currentTime, setCurrentTime] = useState<string>("09:41");
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const scheduleId = searchParams.get("id") || "";
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scheduleData, setScheduleData] = useState<ScheduleDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // User responses
  const [selectedConditions, setSelectedConditions] = useState<Record<number, "standard" | "na">>({});
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [isNoteOpen, setIsNoteOpen] = useState<boolean>(false);
  const [startedAt, setStartedAt] = useState<string>(new Date().toISOString());

  // Status Bar live clock
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

  // Fetch Schedule & Template Tasks from Backend
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    if (!scheduleId) {
      toast.error("ID Jadwal tidak ditemukan");
      setIsLoading(false);
      return;
    }

    const fetchSchedule = async () => {
      setIsLoading(true);
      try {
        const token = AuthService.getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (user?.email) headers["x-user-email"] = user.email;
        if (user?.role) headers["x-user-role"] = user.role;
        const rawId = user?.rawId || (user?.id ? user.id.replace(/^staff-/, "").replace(/^sa-/, "").replace(/^adm-/, "") : undefined);
        if (rawId) headers["x-user-id"] = rawId;

        let res: Response | null = null;
        try {
          res = await fetch(`/api/staff/schedules/${scheduleId}`, { headers, cache: "no-store" });
          if (!res || !res.ok) throw new Error(`Fetch /api/staff/schedules status: ${res?.status}`);
        } catch {
          res = await fetch(`http://127.0.0.1:5000/api/staff/schedules/${scheduleId}`, { headers, cache: "no-store" });
        }

        if (res && res.ok) {
          const json = await res.json();
          if (json.status === "success" && json.data) {
            const data: ScheduleDetail = json.data;
            setScheduleData(data);
            const taskList: QuestionItem[] = Array.isArray(data.tasks) ? data.tasks : [];
            setQuestions(taskList);

            // Cek apakah ada draf audit tersimpan di localStorage
            let initialConditions: Record<number, "standard" | "na"> = {};
            let initialPhotos: Record<number, string> = {};
            let initialNotes: Record<number, string> = {};
            let savedStartTime = new Date().toISOString();

            try {
              const draftStr = localStorage.getItem("staff_active_audit");
              if (draftStr) {
                const draft = JSON.parse(draftStr);
                if (draft.scheduleId === scheduleId) {
                  initialConditions = draft.selectedConditions || {};
                  initialPhotos = draft.photos || {};
                  initialNotes = draft.notes || {};
                  savedStartTime = draft.startedAt || savedStartTime;
                }
              }
            } catch (e) {
              console.warn("Gagal membaca draf lokal:", e);
            }

            // Inisialisasi default jawaban 'standard' untuk item yang belum dijawab
            taskList.forEach((q) => {
              if (!initialConditions[q.id]) {
                initialConditions[q.id] = "standard";
              }
            });

            setSelectedConditions(initialConditions);
            setPhotos(initialPhotos);
            setNotes(initialNotes);
            setStartedAt(savedStartTime);

            // Parameter ?q=
            const qParam = searchParams.get("q");
            if (qParam) {
              const qNum = parseInt(qParam, 10);
              if (qNum >= 1 && qNum <= taskList.length) {
                setCurrentQuestionIndex(qNum - 1);
              }
            } else {
              setCurrentQuestionIndex(0);
            }
          }
        } else {
          // Fallback data SOP Checklist 18 Butir jika API offline atau menggunakan ID mock sch-2
          const mockTasks: QuestionItem[] = [
            { id: 1, sopCode: "ITEM SOP #01", isCritical: true, isPhotoRequired: true, category: "Area Depan", title: "Kebersihan dan kerapian display rak depan toko", instruction: "Pastikan rak depan bersih dari debu, tertata rapi sesuai standar visual merchandising.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Display rak depan bersih dan tertata rapi", defaultNA: "Tidak Relevan / N/A", defaultNASub: "Rak depan sedang tidak digunakan" },
            { id: 2, sopCode: "ITEM SOP #02", isCritical: true, isPhotoRequired: false, category: "Area Depan", title: "Kesesuaian label harga promo terbaru", instruction: "Periksa label harga promo terpasang jelas dan sesuai daftar harga aktif.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Label promo aktif dan akurat", defaultNA: "Tidak Relevan / N/A", defaultNASub: "Tidak ada program promo aktif" },
            { id: 3, sopCode: "ITEM SOP #03", isCritical: false, isPhotoRequired: false, category: "Kasir & Transaksi", title: "Kebersihan counter kasir dan area transaksi", instruction: "Lap meja kasir, rapikan kabel mesin, dan kosongkan dari barang pribadi.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Area kasir bersih dan bebas barang tidak perlu", defaultNA: "Tidak Relevan / N/A", defaultNASub: "Counter sedang perbaikan" },
            { id: 4, sopCode: "ITEM SOP #04", isCritical: true, isPhotoRequired: false, category: "Kasir & Transaksi", title: "Fungsi mesin POS kasir, scanner, dan printer struk", instruction: "Uji cetak satu struk test dan pastikan scanner barcode berfungsi lancar.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Semua perangkat POS normal", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 5, sopCode: "ITEM SOP #05", isCritical: false, isPhotoRequired: false, category: "Kasir & Transaksi", title: "Ketersediaan uang modal kasir pecahan kecil", instruction: "Pastikan jumlah modal kasir dan uang kembalian sesuai pembukuan shift.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Modal kasir lengkap di laci", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 6, sopCode: "ITEM SOP #06", isCritical: true, isPhotoRequired: true, category: "Bar & Dapur", title: "Pemeriksaan suhu chiller produk minuman (2 - 6°C)", instruction: "Cek termometer display chiller, pastikan berada di rentang 2°C hingga 6°C.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Suhu chiller stabil pada batas aman SOP", defaultNA: "Tidak Relevan / N/A", defaultNASub: "Chiller sedang defrost terjadwal" },
            { id: 7, sopCode: "ITEM SOP #07", isCritical: true, isPhotoRequired: false, category: "Bar & Dapur", title: "Pemeriksaan masa kedaluwarsa (exp date) bahan baku harian", instruction: "Periksa label FIFO pada susu, sirup, dan topping.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Seluruh bahan baku fresh dan berlabel FIFO", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 8, sopCode: "ITEM SOP #08", isCritical: false, isPhotoRequired: false, category: "Bar & Dapur", title: "Sanitasi area barista, blender, dan coffee grinder", instruction: "Bersihkan sisa bubuk kopi dan sanitasi pitcher susu.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Area barista bersih dan higienis", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 9, sopCode: "ITEM SOP #09", isCritical: false, isPhotoRequired: false, category: "Persediaan", title: "Ketersediaan cup, sedotan ramah lingkungan, dan kantong take-away", instruction: "Pastikan stok cup dan kantong kemasan mencukupi untuk estimasi shift hari ini.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Stok kemasan mencukupi", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 10, sopCode: "ITEM SOP #10", isCritical: false, isPhotoRequired: false, category: "Higienitas & K3", title: "Ketersediaan hand sanitizer di pintu masuk dan kasir", instruction: "Pastikan botol sanitizer terisi minimal 50% dan dispenser berfungsi.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Sanitizer siap digunakan", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 11, sopCode: "ITEM SOP #11", isCritical: false, isPhotoRequired: true, category: "Dine-in Area", title: "Kebersihan lantai area dine-in bebas dari noda", instruction: "Lantai sudah disapu, dipel, dan kering tanpa ada genangan air atau sampah.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Lantai bersih, wangi, dan kering", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 12, sopCode: "ITEM SOP #12", isCritical: false, isPhotoRequired: false, category: "Dine-in Area", title: "Kerapian susunan meja dan kursi pelanggan", instruction: "Atur jarak meja dan kursi agar tertata simetris dan nyaman bagi pengunjung.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Meja dan kursi tersusun rapi", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 13, sopCode: "ITEM SOP #13", isCritical: true, isPhotoRequired: false, category: "Toilet", title: "Kebersihan toilet pelanggan dan ketersediaan sabun cuci tangan", instruction: "Cek aroma toilet, pastikan sabun cuci tangan dan tisu toilet tersedia.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Toilet bersih, kering, dan sabun tersedia", defaultNA: "Tidak Relevan / N/A", defaultNASub: "Toko tidak memiliki toilet internal" },
            { id: 14, sopCode: "ITEM SOP #14", isCritical: false, isPhotoRequired: false, category: "Sanitasi", title: "Kebersihan area cuci piring (dishwashing station)", instruction: "Pastikan spons bersih dan bak cuci tidak mampet.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Area dishwashing bersih dan tertata", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 15, sopCode: "ITEM SOP #15", isCritical: false, isPhotoRequired: false, category: "Sanitasi", title: "Kelayakan tempat sampah dan pemilahan", instruction: "Tempat sampah terlapisi plastik dan tidak melebihi kapasitas 75%.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Tempat sampah rapi dan berplastik", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 16, sopCode: "ITEM SOP #16", isCritical: true, isPhotoRequired: false, category: "Karyawan", title: "Kepatuhan seragam dan kelengkapan atribut kerja staf", instruction: "Staf mengenakan seragam rapi, celemek bersih, name tag, dan hairnet/topi.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Seluruh staf memenuhi standar grooming", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 17, sopCode: "ITEM SOP #17", isCritical: false, isPhotoRequired: false, category: "Persediaan", title: "Kesiapan stok bahan baku utama sebelum peak hours", instruction: "Verifikasi stok biji kopi, sirup rasa, dan susu segar.", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Stok bahan baku siap untuk shift", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" },
            { id: 18, sopCode: "ITEM SOP #18", isCritical: false, isPhotoRequired: false, category: "Fasilitas", title: "Pengecekan lampu penerangan dan AC menyala normal", instruction: "Pastikan seluruh lampu menyala terang dan suhu ruangan terasa sejuk (22 - 24°C).", defaultStandard: "Ya, Sesuai Standar", defaultStandardSub: "Lampu dan pendingin ruangan normal", defaultNA: "Tidak Relevan / N/A", defaultNASub: "N/A" }
          ];

          const fallbackDetail: ScheduleDetail = {
            id: scheduleId || "sch-2",
            title: "Jadwal Audit Operasional Reguler",
            timeRange: "09:00 – 12:00 WIB",
            templateName: "Checklist Operasional Harian",
            store: {
              id: "st-sudirman",
              name: "Cabang Sudirman (Jakarta Pusat)",
              address: "Jl. Jenderal Sudirman Kav. 52-53",
              city: "Jakarta Pusat",
              code: "KK-JKT-15"
            },
            totalQuestions: 18,
            tasks: mockTasks
          };

          setScheduleData(fallbackDetail);
          setQuestions(mockTasks);

          const initialConditions: Record<number, "standard" | "na"> = {};
          mockTasks.forEach((q) => {
            initialConditions[q.id] = "standard";
          });
          setSelectedConditions(initialConditions);
          setCurrentQuestionIndex(0);
        }
      } catch (err) {
        console.error("Error fetching schedule detail:", err);
        // Tetap pasang fallback agar audit tidak blank
        toast.info("Memuat checklist audit dalam mode offline.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, [scheduleId, searchParams]);

  // Simpan draf ke localStorage setiap kali ada perubahan jawaban
  const saveDraftToLocalStorage = (
    updatedConditions = selectedConditions,
    updatedPhotos = photos,
    updatedNotes = notes
  ) => {
    if (!scheduleData || questions.length === 0) return;
    try {
      const draft = {
        scheduleId: scheduleData.id,
        scheduleTitle: scheduleData.title,
        storeName: scheduleData.store?.name || currentUser?.storeName || "Toko Cabang",
        storeCode: scheduleData.store?.code || "ST-01",
        templateName: scheduleData.templateName || "Standar SOP",
        questions,
        selectedConditions: updatedConditions,
        photos: updatedPhotos,
        notes: updatedNotes,
        startedAt,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem("staff_active_audit", JSON.stringify(draft));
    } catch (e) {
      console.warn("Gagal menyimpan draf audit:", e);
    }
  };

  const currentQ = questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const totalQuestions = questions.length;
  const progressPercent = totalQuestions > 0 ? Math.round((questionNumber / totalQuestions) * 100) : 0;

  const currentCondition = currentQ ? selectedConditions[currentQ.id] || "standard" : "standard";
  const currentPhoto = currentQ ? photos[currentQ.id] : undefined;
  const currentNote = currentQ ? notes[currentQ.id] || "" : "";

  // Handle Photo Capture
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentQ) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const newPhotos = {
          ...photos,
          [currentQ.id]: result,
        };
        setPhotos(newPhotos);
        saveDraftToLocalStorage(selectedConditions, newPhotos, notes);
        toast.success("Foto bukti visual berhasil diambil dengan watermark GPS!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentQ) return;
    const newPhotos = { ...photos };
    delete newPhotos[currentQ.id];
    setPhotos(newPhotos);
    saveDraftToLocalStorage(selectedConditions, newPhotos, notes);
    toast.info("Foto bukti dihapus.");
  };

  // Next Question or Proceed to Review Page
  const handleNextQuestion = () => {
    if (!currentQ) return;

    // Validasi Foto Wajib: jika butir mewajibkan foto dan belum ada foto
    if (currentQ.isPhotoRequired && !photos[currentQ.id]) {
      toast.error("⚠️ Wajib mengambil foto bukti visual sebelum melanjutkan!");
      return;
    }

    // Simpan draf
    saveDraftToLocalStorage();

    // If not last question, move to next
    if (currentQuestionIndex < totalQuestions - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setIsNoteOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Pertanyaan terakhir tercapai -> Arahkan ke Halaman Tinjau Jawaban (Review)
      toast.success("Semua butir checklist selesai diisi. Menuju Tinjau Jawaban...");
      router.push(`/jadwal-staff/review?id=${scheduleId}`);
    }
  };

  const storeDisplayName = scheduleData?.store?.name || currentUser?.storeName || "Toko Cabang";

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
        {/* Dynamic Island on Desktop Mockup */}
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
            onClick={() => router.push("/jadwal-staff")}
            className="w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="flex-1 min-w-0 px-1">
            <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none truncate">
              {storeDisplayName}
            </p>
            <h1 className="text-sm font-bold text-slate-900 truncate leading-tight mt-0.5">
              {scheduleData?.title || "Pengerjaan Checklist"}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {totalQuestions > 0 && (
              <button
                onClick={() => router.push(`/jadwal-staff/review?id=${scheduleId}`)}
                className="px-2 py-0.5 bg-[#193f53]/10 hover:bg-[#193f53]/20 text-[#193f53] border border-[#193f53]/20 text-[11px] font-semibold rounded-md transition-colors cursor-pointer"
                title="Buka Tinjau Jawaban"
              >
                Review ({questionNumber}/{totalQuestions})
              </button>
            )}
            <button
              onClick={() => router.push("/jadwal-staff")}
              className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <RotateCcw className="w-7 h-7 animate-spin text-[#193f53]" />
            <p className="text-xs font-semibold text-slate-600">
              Memuat template checklist dari database...
            </p>
          </div>
        )}

        {/* EMPTY STATE: JIKA TEMPLATE MEMILIKI 0 BUTIR TUGAS */}
        {!isLoading && totalQuestions === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-[280px]">
              <h3 className="text-sm font-bold text-slate-900">
                Belum Ada Butir Checklist
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Template <strong>{scheduleData?.templateName || "ini"}</strong> pada jadwal belum memiliki daftar butir tugas pemeriksaan. Silakan hubungi Store Manager / Admin untuk melengkapi template ini.
              </p>
            </div>
            <button
              onClick={() => router.push("/jadwal-staff")}
              className="py-2.5 px-5 bg-[#193f53] hover:bg-[#122f3e] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Kembali ke Jadwal Tugas
            </button>
          </div>
        )}

        {/* MAIN QUESTION VIEW */}
        {!isLoading && totalQuestions > 0 && currentQ && (
          <>
            {/* 3. Progress Bar & Step Counter */}
            <div className="bg-white/80 px-5 pt-3 pb-2.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg border border-slate-200/80 font-bold text-[11px]">
                  <span>📑</span>
                  <span>
                    Pertanyaan {questionNumber} dari {totalQuestions}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[190px]">
                  • {currentQ.category} ({progressPercent}%)
                </span>
              </div>

              {/* Progress Bar Line */}
              <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-[#193f53] rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* 4. Question Card */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-3.5">
                {/* Badges Row: ITEM SOP & Kritis / Wajib Foto */}
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-mono font-bold text-[11px] rounded-lg border border-slate-200/70">
                    {currentQ.sopCode}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {currentQ.isPhotoRequired && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold text-[10px] rounded-md border border-blue-200/80 flex items-center gap-1">
                        <Camera className="w-3 h-3" />
                        <span>Foto Wajib</span>
                      </span>
                    )}
                    {currentQ.isCritical && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold text-[10px] rounded-md border border-amber-200/80 flex items-center gap-1">
                        <span>🔥</span>
                        <span>Kritis</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Question Title */}
                <h2 className="text-base sm:text-[17px] font-bold text-slate-900 leading-snug">
                  {currentQ.title}
                </h2>

                {/* Category & Hint Callout Box */}
                <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-700">Kategori: {currentQ.category}</span>
                    <p className="mt-0.5 text-slate-500">Pastikan pemeriksaan fisik dilakukan langsung di area kerja sebelum menentukan pilihan.</p>
                  </div>
                </div>
              </div>

              {/* 5. Section: PILIH KONDISI LAPANGAN */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                    PILIH KONDISI LAPANGAN
                  </span>
                  <span className="text-xs font-semibold text-[#193f53]">
                    {currentCondition === "standard" ? "Sesuai Standar" : "Tidak Relevan"}
                  </span>
                </div>

                {/* Option 1: Ya, Sesuai Standar */}
                <div
                  onClick={() => {
                    const updated = { ...selectedConditions, [currentQ.id]: "standard" as const };
                    setSelectedConditions(updated);
                    saveDraftToLocalStorage(updated, photos, notes);
                  }}
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
                  onClick={() => {
                    const updated = { ...selectedConditions, [currentQ.id]: "na" as const };
                    setSelectedConditions(updated);
                    saveDraftToLocalStorage(updated, photos, notes);
                  }}
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
                          : "bg-slate-100 text-slate-500"
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
                  {currentQ.isPhotoRequired ? (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-semibold rounded-full">
                      Wajib 1 Foto
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-medium">
                      Opsional
                    </span>
                  )}
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
                      alt="Bukti Visual"
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white p-2 rounded-xl text-[10px] font-mono flex items-center justify-between">
                      <span>📍 GPS Verified • {currentTime} WIB</span>
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
                    className="border-2 border-dashed border-slate-300 bg-[#f8fbff] rounded-2xl p-5 text-center transition-all hover:border-[#193f53]/50 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-[#193f53] flex items-center justify-center mx-auto shadow-xs group-hover:scale-105 transition-transform">
                      <Camera className="w-6 h-6 stroke-[2]" />
                    </div>

                    <h4 className="font-bold text-sm text-slate-900 mt-2.5">
                      Ambil Foto Bukti (Kamera)
                    </h4>
                    <p className="text-xs text-slate-500 max-w-[270px] mx-auto mt-1 leading-relaxed">
                      Ambil foto langsung melalui kamera ponsel dengan watermark GPS & cap waktu aktif.
                    </p>

                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <div className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs text-[11px] font-mono text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>GPS: Terverifikasi di Gerai</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const demoImg = "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&fit=crop";
                          const newPhotos = { ...photos, [currentQ.id]: demoImg };
                          setPhotos(newPhotos);
                          saveDraftToLocalStorage(selectedConditions, newPhotos, notes);
                          toast.success("Foto sampel terverifikasi dimuat!");
                        }}
                        className="text-[10px] font-semibold text-[#193f53] bg-white hover:bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
                      >
                        + Foto Sampel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 7. Section: Tambah Catatan */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsNoteOpen(!isNoteOpen)}
                  className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span>📝</span>
                    <span>{currentNote ? "Edit Catatan Pemeriksaan" : "+ Tambah Catatan (Opsional)"}</span>
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
                      onChange={(e) => {
                        const updated = { ...notes, [currentQ.id]: e.target.value };
                        setNotes(updated);
                        saveDraftToLocalStorage(selectedConditions, photos, updated);
                      }}
                      placeholder="Ketik catatan tambahan jika ada temuan khusus pada kondisi butir pemeriksaan ini..."
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
                    Sistem Manajemen Mutu • {storeDisplayName}
                  </span>
                </p>
              </div>
            </div>

            {/* 9. Bottom Sticky Action Bar */}
            <div className="p-4 pb-6 bg-white/95 backdrop-blur-md border-t border-slate-100 shrink-0">
              <button
                onClick={handleNextQuestion}
                className="w-full py-3.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
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

              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium select-none">
                <Cloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Otomatis menyimpan draf respons checklist</span>
              </div>
            </div>
          </>
        )}
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

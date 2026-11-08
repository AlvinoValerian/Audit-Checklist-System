"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  X,
  Info,
  CheckCircle2,
  Camera,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  ArrowRight,
  Cloud,
  Check,
  RotateCcw,
  Smartphone,
  Maximize2,
  Trash2,
  AlertCircle,
  AlertTriangle,
  SlidersHorizontal,
  ListChecks,
  AlertOctagon,
  RotateCw,
  MapPin,
  FileText,
  Navigation,
  Save,
  Clock,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";
import { optimizeAndResizeImage, encryptImageData } from "@/lib/image-crypto";
import DecryptedImage from "@/components/DecryptedImage";

type ConditionType = "standard" | "issue" | "na";

interface QuestionItem {
  id: number;
  taskId?: string;
  sopCode: string;
  isCritical: boolean;
  isPhotoRequired?: boolean;
  category: string;
  title: string;
  instruction?: string;
  defaultStandard: string;
  defaultStandardSub: string;
  defaultIssue?: string;
  defaultIssueSub?: string;
  defaultNA: string;
  defaultNASub: string;
}

interface PhotoMeta {
  lat: number;
  lon: number;
  accuracy: number;
  distance: number;
  timestamp: string;
  isSimulated?: boolean;
}

interface GpsErrorModalData {
  isOpen: boolean;
  title: string;
  message: string;
  distance: number;
  radius: number;
  accuracy: number;
  isFakeGps: boolean;
  pendingPhotoBlob?: string;
  pendingCoords?: { lat: number; lon: number; accuracy: number };
}

interface ScheduleDetail {
  id: string;
  title: string;
  timeRange: string;
  templateName: string;
  isLate?: boolean;
  isExpired?: boolean;
  isLocked?: boolean;
  canStart?: boolean;
  toleranceTime?: string;
  status?: string;
  statusBadge?: string;
  store: {
    id: string;
    name: string;
    address: string;
    city: string;
    code: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
  };
  totalQuestions: number;
  tasks: QuestionItem[];
}

// Rumus Haversine menghitung jarak dalam satuan meter
function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // radius bumi dalam meter
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function PengerjaanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Kamera Live & Viewfinder Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const scheduleId = searchParams.get("id") || "";
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scheduleData, setScheduleData] = useState<ScheduleDetail | null>(null);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);

  // User responses
  const [selectedConditions, setSelectedConditions] = useState<Record<number, ConditionType>>({});
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [photoMetas, setPhotoMetas] = useState<Record<number, PhotoMeta>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [startedAt, setStartedAt] = useState<string>(new Date().toISOString());

  // Kamera Live States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  // GPS Rejection Modal
  const [gpsErrorModal, setGpsErrorModal] = useState<GpsErrorModalData | null>(null);

  // Live GPS Tracking in Viewfinder
  const [liveGpsInfo, setLiveGpsInfo] = useState<{
    status: "locating" | "locked" | "error";
    lat?: number;
    lon?: number;
    accuracy?: number;
    distance?: number;
  }>({ status: "locating" });

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
        const rawId =
          user?.rawId ||
          (user?.id
            ? user.id.replace(/^staff-/, "").replace(/^sa-/, "").replace(/^adm-/, "")
            : undefined);
        if (rawId) headers["x-user-id"] = rawId;

        let res: Response | null = null;
        try {
          res = await fetch(`/api/staff/schedules/${scheduleId}`, { headers, cache: "no-store" });
          if (!res || !res.ok) throw new Error(`Fetch /api/staff/schedules status: ${res?.status}`);
        } catch {
          res = await fetch(`http://127.0.0.1:5000/api/staff/schedules/${scheduleId}`, {
            headers,
            cache: "no-store",
          });
        }

        if (res && res.ok) {
          const json = await res.json();
          if (json.status === "success" && json.data) {
            const data: ScheduleDetail = json.data;

            // Blokir jika jadwal sudah kedaluwarsa melewati batas toleransi 1 jam
            if (data.canStart === false || data.isExpired || data.status === "Kedaluwarsa" || data.status === "Tidak Dikerjakan") {
              toast.error("Audit Kedaluwarsa: Batas toleransi pengerjaan 1 jam telah habis. Jadwal ditutup otomatis sebagai Tidak Patuh.");
              router.replace("/jadwal-staff");
              return;
            }

            // Peringatan jika pengerjaan dalam masa toleransi keterlambatan
            if (data.isLate) {
              toast.warning(`Peringatan: Jadwal audit ini dikerjakan dalam masa toleransi keterlambatan (hingga ${data.toleranceTime || '1 jam setelah jadwal'} WIB). Status laporan akan tercatat Terlambat.`);
            }

            setScheduleData(data);
            const taskList: QuestionItem[] = Array.isArray(data.tasks) ? data.tasks : [];
            setQuestions(taskList);

            // Cek apakah ada progres audit tersimpan hari ini di localStorage
            const now = new Date();
            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
            let initialConditions: Record<number, ConditionType> = {};
            let initialPhotos: Record<number, string> = {};
            let initialMetas: Record<number, PhotoMeta> = {};
            let initialNotes: Record<number, string> = {};
            let savedStartTime = new Date().toISOString();
            let resumeIndex: number | null = null;

            try {
              const saveKey = `staff_saved_audit_${scheduleId}`;
              const draftStr = localStorage.getItem(saveKey) || localStorage.getItem("staff_active_audit");
              if (draftStr) {
                const draft = JSON.parse(draftStr);
                // Validasi hari: aturan save hanya berlaku untuk hari pengerjaan itu saja
                if (draft.savedDate && draft.savedDate !== todayStr) {
                  localStorage.removeItem(saveKey);
                  localStorage.removeItem("staff_active_audit");
                } else if (!draft.scheduleId || draft.scheduleId === scheduleId) {
                  initialConditions = draft.selectedConditions || {};
                  initialPhotos = draft.photos || {};
                  initialMetas = draft.photoMetas || {};
                  initialNotes = draft.notes || {};
                  savedStartTime = draft.startedAt || savedStartTime;
                  if (typeof draft.lastSavedIndex === "number" && draft.lastSavedIndex >= 0) {
                    resumeIndex = draft.lastSavedIndex;
                  }
                }
              }
            } catch (e) {
              console.warn("Gagal membaca progres lokal:", e);
            }

            // Inisialisasi default jawaban 'standard' untuk butir yang belum terisi
            taskList.forEach((q) => {
              if (!initialConditions[q.id]) {
                initialConditions[q.id] = "standard";
              }
            });

            setSelectedConditions(initialConditions);
            setPhotos(initialPhotos);
            setPhotoMetas(initialMetas);
            setNotes(initialNotes);
            setStartedAt(savedStartTime);

            // Parameter ?q= atau resume ke pertanyaan terakhir tersimpan
            const qParam = searchParams.get("q");
            if (qParam) {
              const qNum = parseInt(qParam, 10);
              if (qNum >= 1 && qNum <= taskList.length) {
                setCurrentQuestionIndex(qNum - 1);
              }
            } else if (resumeIndex !== null && resumeIndex < taskList.length) {
              setCurrentQuestionIndex(resumeIndex);
              toast.info(`Melanjutkan progres tersimpan dari Pertanyaan ${resumeIndex + 1}`);
            } else {
              setCurrentQuestionIndex(0);
            }
          }
        } else {
          // Fallback data SOP Checklist 8 Butir persis sesuai screenshot
          const mockTasks: QuestionItem[] = [
            {
              id: 1,
              sopCode: "ITEM SOP #01",
              isCritical: false,
              isPhotoRequired: false,
              category: "Area Bar & Peralatan",
              title: "Pengecekan kebersihan meja bar dan grinder kopi",
              defaultStandard: "Ya, Sesuai Standar",
              defaultStandardSub: "Kondisi area kerja bersih & higienis",
              defaultIssue: "Tidak / Bermasalah",
              defaultIssueSub: "Terdapat sisa bubuk kopi menumpuk di meja bar",
              defaultNA: "Tidak Relevan / N/A",
              defaultNASub: "Meja bar sedang perbaikan",
            },
            {
              id: 2,
              sopCode: "ITEM SOP #02",
              isCritical: true,
              isPhotoRequired: true,
              category: "Area Bar & Peralatan",
              title: "Sanitasi pitcher susu dan steam wand mesin espresso",
              defaultStandard: "Ya, Sesuai Standar",
              defaultStandardSub: "Peralatan steril dan higienis",
              defaultIssue: "Tidak / Bermasalah",
              defaultIssueSub: "Terdapat kerak susu menumpuk atau tidak steril",
              defaultNA: "Tidak Relevan / N/A",
              defaultNASub: "N/A",
            },
            {
              id: 3,
              sopCode: "ITEM SOP #03",
              isCritical: true,
              isPhotoRequired: false,
              category: "Area Bar & Peralatan",
              title: "Kalibrasi rasa espresso dan rasio ekstraksi",
              defaultStandard: "Ya, Sesuai Standar",
              defaultStandardSub: "Rasio ekstraksi dan crema optimal",
              defaultIssue: "Tidak / Bermasalah",
              defaultIssueSub: "Ekstraksi under/over-extracted atau rasa asam/pahit",
              defaultNA: "Tidak Relevan / N/A",
              defaultNASub: "N/A",
            },
            {
              id: 4,
              sopCode: "ITEM SOP #04",
              isCritical: false,
              isPhotoRequired: false,
              category: "Area Bar & Peralatan",
              title: "Pengecekan ketersediaan es batu dan air reverse osmosis",
              defaultStandard: "Ya, Sesuai Standar",
              defaultStandardSub: "Kondisi es higienis dan suplai air normal",
              defaultIssue: "Tidak / Bermasalah",
              defaultIssueSub: "Es terkontaminasi atau tekanan air rendah",
              defaultNA: "Tidak Relevan / N/A",
              defaultNASub: "N/A",
            },
            {
              id: 5,
              sopCode: "ITEM SOP #05",
              isCritical: true,
              isPhotoRequired: false,
              category: "Area Bar & Peralatan",
              title: "Pemeriksaan masa simpan (FIFO) sirup dan susu di chiller",
              defaultStandard: "Ya, Sesuai Standar",
              defaultStandardSub: "Suhu chiller stabil pada batas aman SOP",
              defaultIssue: "Tidak / Bermasalah",
              defaultIssueSub: "Suhu chiller >4°C atau terdapat ketidaksesuaian",
              defaultNA: "Tidak Relevan / N/A",
              defaultNASub: "N/A",
            },
            {
              id: 6,
              sopCode: "ITEM SOP #06",
              isCritical: false,
              isPhotoRequired: false,
              category: "Area Bar & Peralatan",
              title: "Pemeriksaan fungsi blender dan perlengkapan beverage",
              defaultStandard: "Ya, Sesuai Standar",
              defaultStandardSub: "Kondisi area kerja bersih & higienis",
              defaultIssue: "Tidak / Bermasalah",
              defaultIssueSub: "Pisau tumpul atau motor blender overheat",
              defaultNA: "Tidak Relevan / N/A",
              defaultNASub: "N/A",
            },
            {
              id: 7,
              sopCode: "ITEM SOP #07",
              isCritical: false,
              isPhotoRequired: false,
              category: "Area Bar & Peralatan",
              title: "Apakah lantai area bar kering dan tidak licin?",
              defaultStandard: "Ya, Sesuai Standar",
              defaultStandardSub: "Kondisi area kerja bersih & higienis",
              defaultIssue: "Tidak / Bermasalah",
              defaultIssueSub: "Suhu chiller >4°C atau terdapat ketidaksesuaian",
              defaultNA: "Tidak Relevan / N/A",
              defaultNASub: "N/A",
            },
            {
              id: 8,
              sopCode: "ITEM SOP #08",
              isCritical: true,
              isPhotoRequired: true,
              category: "Area Bar & Peralatan",
              title: "Pembersihan sink cuci dan penataan perlengkapan bar",
              defaultStandard: "Ya, Sesuai Standar",
              defaultStandardSub: "Sink bersih dan saluran lancar",
              defaultIssue: "Tidak / Bermasalah",
              defaultIssueSub: "Saluran mampet atau terdapat ampas kopi menumpuk",
              defaultNA: "Tidak Relevan / N/A",
              defaultNASub: "N/A",
            },
          ];

          const fallbackDetail: ScheduleDetail = {
            id: scheduleId || "2",
            title: "Jadwal Audit Operasional Reguler",
            timeRange: "09:00 – 12:00 WIB",
            templateName: "Checklist Quality Control & Kitchen Mid-Day",
            store: {
              id: "st-1",
              name: "Mie Gacoan - Malang Ciliwung",
              address: "Jl. Ciliwung No. 23, Purwantoro, Kec. Blimbing, Kota Malang",
              city: "Kota Malang",
              code: "ST-1",
              latitude: -7.9553,
              longitude: 112.6412,
              radius: 100,
            },
            totalQuestions: 8,
            tasks: mockTasks,
          };

          setScheduleData(fallbackDetail);
          setQuestions(mockTasks);

          const initialConditions: Record<number, ConditionType> = {};
          mockTasks.forEach((q) => {
            initialConditions[q.id] = "standard";
          });
          setSelectedConditions(initialConditions);
          setCurrentQuestionIndex(0);
        }
      } catch (err) {
        console.error("Error fetching schedule detail:", err);
        toast.info("Memuat checklist audit dalam mode offline.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedule();
  }, [scheduleId, searchParams]);

  // Clean-up camera stream saat unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Simpan draf ke localStorage
  const saveDraftToLocalStorage = (
    updatedConditions = selectedConditions,
    updatedPhotos = photos,
    updatedNotes = notes,
    updatedMetas = photoMetas,
    customIndex?: number
  ) => {
    if (!scheduleData || questions.length === 0) return;
    try {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const draft = {
        scheduleId: scheduleData.id,
        scheduleTitle: scheduleData.title,
        storeName: scheduleData.store?.name || currentUser?.storeName || "Toko Cabang",
        storeCode: scheduleData.store?.code || "ST-01",
        storeLat,
        storeLng,
        storeRadius,
        templateName: scheduleData.templateName || "Standar SOP",
        savedDate: todayStr,
        lastSavedIndex: typeof customIndex === "number" ? customIndex : currentQuestionIndex,
        questions,
        selectedConditions: updatedConditions,
        photos: updatedPhotos,
        photoMetas: updatedMetas,
        notes: updatedNotes,
        startedAt,
        lastUpdated: now.toISOString(),
      };
      localStorage.setItem(`staff_saved_audit_${scheduleData.id}`, JSON.stringify(draft));
      localStorage.setItem("staff_active_audit", JSON.stringify(draft));
    } catch (e) {
      console.warn("Gagal menyimpan draf audit:", e);
    }
  };

  const handleSaveDraft = () => {
    saveDraftToLocalStorage();
    toast.success(
      "Progres Berhasil Disimpan!",
      {
        description: `Tersimpan di pertanyaan ${currentQuestionIndex + 1} dari ${questions.length} (${progressPercent}%). Anda dapat melanjutkan kembali hari ini.`,
      }
    );
  };

  const currentQ = questions[currentQuestionIndex];
  const questionNumber = currentQuestionIndex + 1;
  const cleanTitle = currentQ ? currentQ.title.replace(/^\d+[\.\s\-]+/, "").trim() : "";
  const totalQuestions = questions.length;
  const rawPercent = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;
  const progressPercent = Math.round(rawPercent);
  const progressPercentText = rawPercent % 1 === 0 ? `${rawPercent}%` : `${rawPercent.toFixed(1)}%`;

  const currentCondition = currentQ ? selectedConditions[currentQ.id] || "standard" : "standard";
  const currentPhoto = currentQ ? photos[currentQ.id] : undefined;
  const currentMeta = currentQ ? photoMetas[currentQ.id] : undefined;
  const currentNote = currentQ ? notes[currentQ.id] || "" : "";

  // Target koordinat & radius gerai
  const storeLat = scheduleData?.store?.latitude ?? -7.9553;
  const storeLng = scheduleData?.store?.longitude ?? 112.6412;
  const storeRadius = scheduleData?.store?.radius ?? 100;

  // Status kebutuhan wajib
  const isPhotoRequired = Boolean(currentQ?.isPhotoRequired || currentCondition === "issue");
  const isNoteRequired = Boolean(currentCondition === "issue");

  // ================= GPS & ANTI-FAKE GPS HELPERS =================
  const getDevicePosition = (): Promise<{
    latitude: number;
    longitude: number;
    accuracy: number;
    isFakeGps: boolean;
  }> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(new Error("Geolocation API tidak didukung"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const acc = pos.coords.accuracy;

          // Heuristik Deteksi Fake GPS / Mock Location
          // 1. Akurasi anomali: 0m, negatif, atau sangat tidak wajar
          // 2. Browser / Android Mock location flag (isMock / mocked)
          // 3. Timestamp perbedaan > 45 detik
          let isFake = false;
          if (acc <= 0 || acc > 250) {
            isFake = true;
          }
          if ((pos.coords as any).isMock || (pos as any).mocked) {
            isFake = true;
          }
          const timeDiff = Math.abs(Date.now() - pos.timestamp);
          if (timeDiff > 45000) {
            isFake = true;
          }

          resolve({
            latitude: lat,
            longitude: lon,
            accuracy: Math.round(acc),
            isFakeGps: isFake,
          });
        },
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // Watermark generator dengan Canvas
  const stampWatermark = (
    sourceCanvas: HTMLCanvasElement,
    meta: {
      lat: number;
      lon: number;
      accuracy: number;
      distance: number;
      storeName: string;
      storeCode: string;
      auditorName: string;
      sopCode: string;
    }
  ): string => {
    const canvas = document.createElement("canvas");
    canvas.width = sourceCanvas.width || 1280;
    canvas.height = sourceCanvas.height || 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return sourceCanvas.toDataURL("image/jpeg", 0.85);

    // Salin gambar asli
    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

    // Overlay gelap bawah untuk keterbacaan watermark
    const grad = ctx.createLinearGradient(0, canvas.height - 180, 0, canvas.height);
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(0.3, "rgba(0, 0, 0, 0.7)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, canvas.height - 180, canvas.width, 180);

    // Badge status atas
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(24, 24, 380, 44, 12);
    ctx.fill();

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(46, 46, 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText("KAMERA RESMI • GPS TERVERIFIKASI", 64, 52);

    // Stempel Watermark Bawah
    const nowStr = new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(
      `📍 GPS: ${meta.lat.toFixed(6)}, ${meta.lon.toFixed(6)} (Akurasi: ±${meta.accuracy}m)`,
      30,
      canvas.height - 110
    );

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(
      `🏬 ${meta.storeName} (${meta.storeCode}) • Jarak: ${meta.distance}m ke gerai`,
      30,
      canvas.height - 75
    );

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "18px sans-serif";
    ctx.fillText(
      `👤 ${meta.auditorName} • Butir #${questionNumber} • ${nowStr} WIB`,
      30,
      canvas.height - 40
    );

    return canvas.toDataURL("image/jpeg", 0.88);
  };

  // ================= KAMERA LIVE CONTROLS =================
  const startLiveCamera = async () => {
    setIsCameraActive(true);
    setIsCameraLoading(true);
    setLiveGpsInfo({ status: "locating" });

    // Coba dapatkan GPS lebih awal untuk indikator di live kamera
    getDevicePosition()
      .then((pos) => {
        const dist = calculateDistanceMeters(pos.latitude, pos.longitude, storeLat, storeLng);
        setLiveGpsInfo({
          status: "locked",
          lat: pos.latitude,
          lon: pos.longitude,
          accuracy: pos.accuracy,
          distance: dist,
        });
      })
      .catch(() => {
        setLiveGpsInfo({ status: "error" });
      });

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraLoading(false);
    } catch (err) {
      console.warn("Kamera WebRTC getUserMedia gagal, beralih ke input kamera native:", err);
      setIsCameraLoading(false);
      setIsCameraActive(false);
      // Panggil input kamera langsung tanpa lewat galeri
      fileInputRef.current?.click();
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleFlipCamera = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextMode } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.warn("Gagal membalik kamera:", err);
    }
  };

  const captureFromLiveCamera = async () => {
    if (!videoRef.current || !currentQ) return;
    setIsCapturing(true);

    try {
      const gpsPos = await getDevicePosition();
      const { latitude, longitude, accuracy, isFakeGps } = gpsPos;
      const distance = calculateDistanceMeters(latitude, longitude, storeLat, storeLng);

      const video = videoRef.current;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = video.videoWidth || 1280;
      tempCanvas.height = video.videoHeight || 720;
      const tCtx = tempCanvas.getContext("2d");
      if (!tCtx) throw new Error("Gagal menginisialisasi canvas");
      tCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
      const rawPhoto = tempCanvas.toDataURL("image/jpeg", 0.9);

      // 1. Cek Fake GPS
      if (isFakeGps) {
        setIsCapturing(false);
        stopLiveCamera();
        setGpsErrorModal({
          isOpen: true,
          title: "Foto Ditolak: Terdeteksi Fake GPS / Mock Location",
          message:
            "Sistem mendeteksi indikasi aplikasi Fake GPS atau manipulasi koordinat sinyal lokasi. Pengambilan foto audit SOP ditolak demi integritas laporan!",
          distance,
          radius: storeRadius,
          accuracy,
          isFakeGps: true,
          pendingPhotoBlob: rawPhoto,
          pendingCoords: { lat: latitude, lon: longitude, accuracy },
        });
        return;
      }

      // 2. Cek Radius
      if (distance > storeRadius) {
        setIsCapturing(false);
        stopLiveCamera();
        setGpsErrorModal({
          isOpen: true,
          title: "Foto Ditolak: Di Luar Radius Gerai",
          message: `Kamera Anda terdeteksi berjarak ${distance} meter dari gerai. Maksimal batas radius yang diizinkan adalah ${storeRadius} meter. Silakan ambil foto langsung di area outlet!`,
          distance,
          radius: storeRadius,
          accuracy,
          isFakeGps: false,
          pendingPhotoBlob: rawPhoto,
          pendingCoords: { lat: latitude, lon: longitude, accuracy },
        });
        return;
      }

      // 3. Valid: Terapkan Watermark GPS
      const watermarked = stampWatermark(tempCanvas, {
        lat: latitude,
        lon: longitude,
        accuracy,
        distance,
        storeName: scheduleData?.store?.name || currentUser?.storeName || "Toko Cabang",
        storeCode: scheduleData?.store?.code || "ST-01",
        auditorName: currentUser?.fullName || "Staff Lapangan",
        sopCode: currentQ.sopCode,
      });

      // Resize optimal (1024px) & enkripsi AES-256-GCM agar hemat database & aman
      const optimized = await optimizeAndResizeImage(watermarked, 1024, 1024, 0.78);
      const encrypted = await encryptImageData(optimized);

      const newPhotos = { ...photos, [currentQ.id]: encrypted };
      const newMetas = {
        ...photoMetas,
        [currentQ.id]: {
          lat: latitude,
          lon: longitude,
          accuracy,
          distance,
          timestamp: new Date().toISOString(),
        },
      };

      setPhotos(newPhotos);
      setPhotoMetas(newMetas);
      saveDraftToLocalStorage(selectedConditions, newPhotos, notes, newMetas);

      setIsCapturing(false);
      stopLiveCamera();
      toast.success(`Foto bukti terverifikasi di gerai (${distance}m, GPS Valid)!`);
    } catch (err: any) {
      setIsCapturing(false);
      stopLiveCamera();
      toast.error("Gagal mendapatkan koordinat GPS. Pastikan GPS perangkat aktif!");
    }
  };

  // Fallback Camera File Input (capture="environment")
  const handleFallbackPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentQ) {
      const reader = new FileReader();
      reader.onload = async () => {
        const rawPhoto = reader.result as string;
        try {
          const gpsPos = await getDevicePosition();
          const { latitude, longitude, accuracy, isFakeGps } = gpsPos;
          const distance = calculateDistanceMeters(latitude, longitude, storeLat, storeLng);

          // Cek Fake GPS
          if (isFakeGps) {
            setGpsErrorModal({
              isOpen: true,
              title: "Foto Ditolak: Terdeteksi Fake GPS",
              message:
                "Sistem mendeteksi penggunaan Fake GPS atau anomali lokasi pada perangkat. Foto ditolak!",
              distance,
              radius: storeRadius,
              accuracy,
              isFakeGps: true,
              pendingPhotoBlob: rawPhoto,
              pendingCoords: { lat: latitude, lon: longitude, accuracy },
            });
            return;
          }

          // Cek Radius
          if (distance > storeRadius) {
            setGpsErrorModal({
              isOpen: true,
              title: "Foto Ditolak: Di Luar Radius Gerai",
              message: `Posisi pengambilan foto berjarak ${distance} meter dari gerai (Batas radius ${storeRadius} meter). Foto ditolak!`,
              distance,
              radius: storeRadius,
              accuracy,
              isFakeGps: false,
              pendingPhotoBlob: rawPhoto,
              pendingCoords: { lat: latitude, lon: longitude, accuracy },
            });
            return;
          }

          // Stempel Watermark via Gambar
          const img = new Image();
          img.onload = async () => {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = img.width || 1280;
            tempCanvas.height = img.height || 720;
            const ctx = tempCanvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
              const watermarked = stampWatermark(tempCanvas, {
                lat: latitude,
                lon: longitude,
                accuracy,
                distance,
                storeName: scheduleData?.store?.name || currentUser?.storeName || "Toko Cabang",
                storeCode: scheduleData?.store?.code || "ST-01",
                auditorName: currentUser?.fullName || "Staff Lapangan",
                sopCode: currentQ.sopCode,
              });

              // Resize optimal (1024px) & enkripsi AES-256-GCM agar hemat database & aman
              const optimized = await optimizeAndResizeImage(watermarked, 1024, 1024, 0.78);
              const encrypted = await encryptImageData(optimized);

              const newPhotos = { ...photos, [currentQ.id]: encrypted };
              const newMetas = {
                ...photoMetas,
                [currentQ.id]: {
                  lat: latitude,
                  lon: longitude,
                  accuracy,
                  distance,
                  timestamp: new Date().toISOString(),
                },
              };

              setPhotos(newPhotos);
              setPhotoMetas(newMetas);
              saveDraftToLocalStorage(selectedConditions, newPhotos, notes, newMetas);
              toast.success(`Foto bukti terverifikasi (${distance}m dari gerai)!`);
            }
          };
          img.src = rawPhoto;
        } catch (gpsErr) {
          toast.error("Gagal membaca sinyal GPS kamera perangkat. Pastikan izin lokasi aktif!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper Pengujian: Bypass GPS untuk Developer
  const handleBypassGpsTesting = () => {
    if (!gpsErrorModal || !currentQ || !gpsErrorModal.pendingPhotoBlob) {
      setGpsErrorModal(null);
      return;
    }

    const img = new Image();
    img.onload = async () => {
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = img.width || 1280;
      tempCanvas.height = img.height || 720;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        const watermarked = stampWatermark(tempCanvas, {
          lat: storeLat,
          lon: storeLng,
          accuracy: 8,
          distance: 12,
          storeName: scheduleData?.store?.name || currentUser?.storeName || "Toko Cabang",
          storeCode: scheduleData?.store?.code || "ST-01",
          auditorName: currentUser?.fullName || "Staff Lapangan",
          sopCode: currentQ.sopCode,
        });

        const optimized = await optimizeAndResizeImage(watermarked, 1024, 1024, 0.78);
        const encrypted = await encryptImageData(optimized);

        const newPhotos = { ...photos, [currentQ.id]: encrypted };
        const newMetas = {
          ...photoMetas,
          [currentQ.id]: {
            lat: storeLat,
            lon: storeLng,
            accuracy: 8,
            distance: 12,
            timestamp: new Date().toISOString(),
            isSimulated: true,
          },
        };

        setPhotos(newPhotos);
        setPhotoMetas(newMetas);
        saveDraftToLocalStorage(selectedConditions, newPhotos, notes, newMetas);
        setGpsErrorModal(null);
        toast.success("Foto disetujui dalam Mode Uji Coba (Bypass GPS Radius)!");
      }
    };
    img.src = gpsErrorModal.pendingPhotoBlob;
  };

  // Helper Pengujian: Sinkronkan Koordinat Toko ke Posisi Saya
  const handleSyncStoreCoordinates = () => {
    if (!gpsErrorModal?.pendingCoords) {
      setGpsErrorModal(null);
      return;
    }
    const { lat, lon } = gpsErrorModal.pendingCoords;
    if (scheduleData) {
      setScheduleData({
        ...scheduleData,
        store: {
          ...scheduleData.store,
          latitude: lat,
          longitude: lon,
        },
      });
      toast.success(
        `Koordinat gerai disinkronkan ke lokasi saat ini (${lat.toFixed(5)}, ${lon.toFixed(5)})!`
      );
    }
    setGpsErrorModal(null);
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentQ) return;
    const newPhotos = { ...photos };
    delete newPhotos[currentQ.id];
    const newMetas = { ...photoMetas };
    delete newMetas[currentQ.id];

    setPhotos(newPhotos);
    setPhotoMetas(newMetas);
    saveDraftToLocalStorage(selectedConditions, newPhotos, notes, newMetas);
    toast.info("Foto bukti visual dihapus.");
  };

  // Navigasi Kembali ke Pertanyaan Sebelumnya
  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      saveDraftToLocalStorage();
      const prevIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(prevIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Validasi Ketat & Lanjut ke Pertanyaan Berikutnya
  const handleNextQuestion = () => {
    if (!currentQ) return;

    const noteText = (notes[currentQ.id] || "").trim();

    // 1. Validasi Foto Wajib: jika item mewajibkan foto ATAU kondisi dipilih 'Tidak / Bermasalah'
    if (isPhotoRequired && !photos[currentQ.id]) {
      if (currentCondition === "issue") {
        toast.error("⚠️ Kondisi 'Tidak / Bermasalah' mewajibkan pengambilan foto bukti kamera langsung!");
      } else {
        toast.error("⚠️ Butir SOP ini mewajibkan pengambilan foto bukti langsung dari kamera!");
      }
      return;
    }

    // 2. Validasi Catatan Wajib: jika kondisi dipilih 'Tidak / Bermasalah'
    if (isNoteRequired && !noteText) {
      toast.error(
        "⚠️ Kondisi 'Tidak / Bermasalah' mewajibkan catatan temuan diisi!"
      );
      return;
    }

    // Simpan draf
    saveDraftToLocalStorage();

    // Berpindah ke pertanyaan selanjutnya
    if (currentQuestionIndex < totalQuestions - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.success("Semua butir checklist selesai diisi. Menuju Tinjau Jawaban...");
      router.push(`/jadwal-staff/review?id=${scheduleId}`);
    }
  };

  const displayDraftNum = scheduleData?.id ? scheduleData.id.replace(/^sch-/, "") : "42";

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-900 sm:relative sm:inset-auto sm:min-h-screen sm:bg-slate-900 sm:flex sm:items-center sm:justify-center sm:py-6 sm:px-4 font-sans antialiased">
      <Toaster position="top-center" richColors />

      {/* Hidden Fallback Camera Input (Strict: Hanya Kamera, Tanpa Galeri) */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFallbackPhotoCapture}
      />

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
        className={`w-full h-full flex flex-col bg-[#f8fbff] text-slate-900 transition-all duration-300 relative ${
          isFullscreenMode
            ? "max-w-md sm:rounded-none sm:shadow-none sm:h-screen"
            : "sm:h-[844px] sm:max-h-[92vh] sm:max-w-[420px] sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] sm:border-[9px] sm:border-slate-800 sm:ring-1 sm:ring-white/10 overflow-hidden"
        }`}
      >
        {/* Dynamic Island on Desktop Mockup */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 pointer-events-none" />

        {/* 1. Top Navigation Bar (Persis Screenshot) */}
        <div className="px-4 pt-3.5 sm:pt-3 pb-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => router.push("/jadwal-staff")}
              className="w-8 h-8 rounded-xl hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0 -ml-1"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase leading-none">
                AUDIT OUTLET
              </p>
              <h1 className="text-sm font-bold text-slate-900 truncate leading-tight mt-0.5 max-w-[125px] sm:max-w-[155px]">
                {scheduleData?.title || "Jadwal Audit..."}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Tombol Simpan (Save) */}
            <button
              type="button"
              onClick={handleSaveDraft}
              className="px-3 py-1.5 bg-[#eff6ff] hover:bg-blue-100 text-[#193f53] font-bold text-xs rounded-full border border-blue-200/80 flex items-center gap-1.5 transition-all cursor-pointer touch-manipulation active:scale-95 shadow-2xs"
              title="Simpan Progres Pengerjaan"
            >
              <Save className="w-3.5 h-3.5 text-[#193f53]" />
              <span>Simpan</span>
            </button>

            <button
              onClick={() => router.push("/jadwal-staff")}
              className="w-7 h-7 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Tutup"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>
        </div>

        {/* Banner Pengerjaan Terlambat (Masa Toleransi 1 Jam) */}
        {scheduleData?.isLate && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-900 shrink-0">
            <div className="flex items-center gap-1.5 font-semibold">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Pengerjaan Terlambat (Toleransi hingga {scheduleData?.toleranceTime || '1 jam setelah jadwal'} WIB)</span>
            </div>
            <span className="font-bold text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
              Masa Toleransi
            </span>
          </div>
        )}

        {/* LOADING STATE */}
        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3">
            <RotateCcw className="w-7 h-7 animate-spin text-[#193f53]" />
            <p className="text-xs font-semibold text-slate-600">
              Memuat template checklist dari database...
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && totalQuestions === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-xs">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-[280px]">
              <h3 className="text-sm font-bold text-slate-900">Belum Ada Butir Checklist</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Template <strong>{scheduleData?.templateName || "ini"}</strong> pada jadwal belum
                memiliki daftar butir tugas pemeriksaan.
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
            {/* 2. Subheader: Step Counter, Category & Progress Bar (Persis Screenshot) */}
            <div className="bg-white/80 px-4 pt-3 pb-2.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#eff6ff] text-[#2563eb] rounded-lg border border-blue-100 font-semibold text-[11px]">
                  <ListChecks className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>
                    Pertanyaan {questionNumber} dari {totalQuestions}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[150px]">
                  • {currentQ.category}
                </span>
                <span className="text-xs font-bold text-slate-400">{progressPercentText}</span>
              </div>

              {/* Progress Bar Line */}
              <div className="h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#193f53] rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 space-y-3.5">
              {/* 3. Question Card (Judul Bernomor, Tanpa ITEM SOP #02, Tanpa Kotak Panduan) */}
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <h2 className="text-base sm:text-[18px] font-bold text-slate-900 leading-snug">
                  {questionNumber}. {cleanTitle}
                </h2>
              </div>

              {/* 4. Section: PILIH KONDISI LAPANGAN (Persis Screenshot) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                    PILIH KONDISI LAPANGAN
                  </span>
                  <span className="text-[11px] font-semibold text-[#2563eb]">
                    1 Pilihan Terpilih
                  </span>
                </div>

                {/* Option 1: Ya, Sesuai Standar */}
                <div
                  onClick={() => {
                    const updated = { ...selectedConditions, [currentQ.id]: "standard" as const };
                    setSelectedConditions(updated);
                    saveDraftToLocalStorage(updated, photos, notes, photoMetas);
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    currentCondition === "standard"
                      ? "border-[#193f53] bg-white shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center shrink-0 text-[#059669]">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.3]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">
                        {currentQ.defaultStandard || "Ya, Sesuai Standar"}
                      </h3>
                      <p className="text-xs text-slate-400 leading-none mt-1 truncate">
                        {currentQ.defaultStandardSub || "Kondisi area kerja bersih & higienis"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      currentCondition === "standard"
                        ? "bg-[#193f53] text-white shadow-xs"
                        : "border-2 border-slate-300 bg-white"
                    }`}
                  >
                    {currentCondition === "standard" && (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    )}
                  </div>
                </div>

                {/* Option 2: Tidak / Bermasalah */}
                <div
                  onClick={() => {
                    const updated = { ...selectedConditions, [currentQ.id]: "issue" as const };
                    setSelectedConditions(updated);
                    saveDraftToLocalStorage(updated, photos, notes, photoMetas);
                  }}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    currentCondition === "issue"
                      ? "border-[#193f53] bg-rose-50/20 shadow-xs"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#fff1f0] border border-[#ffdcd9] flex items-center justify-center shrink-0 text-[#e11d48]">
                      <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-slate-900 leading-snug">
                        {currentQ.defaultIssue || "Tidak / Bermasalah"}
                      </h3>
                      <p className="text-xs text-slate-400 leading-none mt-1 truncate">
                        {currentQ.defaultIssueSub ||
                          "Suhu chiller >4°C atau terdapat ketidaksesuaian"}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      currentCondition === "issue"
                        ? "bg-[#193f53] text-white shadow-xs"
                        : "border-2 border-slate-300 bg-white"
                    }`}
                  >
                    {currentCondition === "issue" && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </div>
              </div>

              {/* 5. CARD TERPISAH 1: Lampiran Bukti Foto Kamera (GPS) - Wajib Kamera Langsung, Tanpa Galeri */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Camera className="w-4 h-4 text-[#193f53]" />
                    <span>Lampiran Bukti Foto Kamera (GPS)</span>
                  </div>
                  {isPhotoRequired ? (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-500" />
                      <span>Wajib Foto Kamera</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                      Opsional
                    </span>
                  )}
                </div>

                {currentPhoto ? (
                  <div className="space-y-2">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video group">
                      <DecryptedImage
                        src={currentPhoto}
                        alt="Foto bukti kamera"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
                        <p className="text-[10px] font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                          <span>Watermark GPS Terverifikasi</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-md cursor-pointer"
                        title="Hapus foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Metadata GPS Info Badge */}
                    {currentMeta && (
                      <div className="bg-[#f8fafc] rounded-xl p-2.5 border border-slate-200/70 text-[10px] text-slate-600 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin className="w-3 h-3 text-[#193f53]" />
                            <span>Koordinat:</span>
                          </span>
                          <span className="font-semibold text-slate-800">
                            {currentMeta.lat.toFixed(5)}, {currentMeta.lon.toFixed(5)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-slate-500">
                            <Navigation className="w-3 h-3 text-emerald-600" />
                            <span>Jarak ke Gerai:</span>
                          </span>
                          <span className="font-bold text-emerald-600">
                            {currentMeta.distance} meter (Radius Max {storeRadius}m)
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5 border-t border-slate-200/60">
                          <span className="text-slate-400">Verifikasi Anti-Fake GPS:</span>
                          <span className="font-bold text-emerald-600">
                            {currentMeta.isSimulated ? "Mode Uji Coba" : "Asli Terverifikasi"}
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={startLiveCamera}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>Ambil Ulang Foto Kamera</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={startLiveCamera}
                      className="w-full py-4 border-2 border-dashed border-[#193f53]/40 hover:border-[#193f53] bg-blue-50/20 hover:bg-blue-50/50 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-bold text-slate-800 transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="w-10 h-10 rounded-full bg-[#193f53] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Camera className="w-5 h-5 stroke-[2.2]" />
                      </div>
                      <span className="mt-1">Buka Kamera Langsung (GPS Otomatis)</span>
                      <span className="text-[10px] font-normal text-slate-400">
                        Hanya kamera langsung. Foto galeri dilarang & GPS diverifikasi radius gerai.
                      </span>
                    </button>

                    {isPhotoRequired && (
                      <p className="text-[10px] text-rose-600 font-medium flex items-center gap-1 px-1">
                        <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>
                          {currentCondition === "issue"
                            ? "Kondisi 'Tidak / Bermasalah' mewajibkan bukti foto kamera langsung!"
                            : "SOP Butir ini mewajibkan pengambilan foto bukti visual!"}
                        </span>
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* 6. CARD TERPISAH 2: Catatan & Keterangan Lapangan (Dipisah di Bawahnya) */}
              <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <FileText className="w-4 h-4 text-[#193f53]" />
                    <span>Catatan & Keterangan Lapangan</span>
                  </div>
                  {isNoteRequired ? (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      <span>Wajib Diisi</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                      Opsional
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    value={currentNote}
                    maxLength={250}
                    rows={3}
                    onChange={(e) => {
                      const updated = { ...notes, [currentQ.id]: e.target.value };
                      setNotes(updated);
                      saveDraftToLocalStorage(selectedConditions, photos, updated, photoMetas);
                    }}
                    placeholder={
                      isNoteRequired
                        ? "Jelaskan rincian detail temuan / kendala di lapangan (wajib diisi)..."
                        : "Tuliskan catatan kondisi lapangan atau keterangan tambahan bila ada (opsional)..."
                    }
                    className={`w-full text-xs text-slate-800 placeholder:text-slate-400 rounded-2xl p-3 outline-none transition-colors resize-none ${
                      isNoteRequired && !currentNote.trim()
                        ? "bg-rose-50/30 border-2 border-rose-300 focus:border-rose-500"
                        : "bg-slate-50 border border-slate-200 focus:border-[#193f53]"
                    }`}
                  />
                  <div className="flex items-center justify-between mt-1 text-[10px] px-1">
                    {isNoteRequired && !currentNote.trim() ? (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Catatan temuan wajib diisi</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {isNoteRequired
                          ? "Deskripsi temuan tersimpan"
                          : "Catatan opsional untuk auditor"}
                      </span>
                    )}
                    <span className="text-slate-400 font-medium">{currentNote.length}/250</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 7. Bottom Sticky Action Bar (Navigasi Kembali & Lanjut Bersebelahan) */}
            <div className="p-4 pb-3 bg-white border-t border-slate-100 shrink-0 space-y-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
              {/* Button 1: Tinjau Jawaban */}
              <button
                type="button"
                onClick={() => router.push(`/jadwal-staff/review?id=${scheduleId}`)}
                className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Tinjau Jawaban ({questionNumber}/{totalQuestions})</span>
              </button>

              {/* Button Row: Kembali & Lanjut Berdampingan */}
              <div className="flex items-center gap-2.5">
                {/* Tombol Back / Kembali */}
                <button
                  type="button"
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  className={`py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shrink-0 border ${
                    currentQuestionIndex === 0
                      ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
                  }`}
                  title={
                    currentQuestionIndex === 0
                      ? "Ini pertanyaan pertama"
                      : "Kembali ke pertanyaan sebelumnya"
                  }
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
                  <span>Kembali</span>
                </button>

                {/* Tombol Next / Lanjut */}
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  className="flex-1 py-3.5 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] cursor-pointer"
                >
                  <span className="truncate">
                    {questionNumber < totalQuestions
                      ? `Lanjut ke Pertanyaan ${questionNumber + 1}`
                      : "Selesai & Tinjau"}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>
              </div>

              {/* Subtext offline auto-save */}
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium pt-0.5 select-none">
                <Cloud className="w-3.5 h-3.5 text-slate-400" />
                <span>Otomatis menyimpan draf respons offline</span>
              </div>

              {/* Home indicator bar */}
              <div className="pt-1 flex justify-center">
                <div className="w-28 h-1 bg-slate-300/80 rounded-full" />
              </div>
            </div>
          </>
        )}

        {/* ================= MODAL KAMERA LIVE (VIEWFINDER HP) ================= */}
        {isCameraActive && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col animate-in fade-in duration-200 select-none">
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Target Reticle */}
            <div className="absolute inset-x-7 inset-y-24 border border-white/20 rounded-3xl pointer-events-none flex flex-col justify-between p-3.5">
              <div className="flex justify-between items-start">
                <div className="w-6 h-6 border-t-2 border-l-2 border-white/90 rounded-tl-lg shadow-sm" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-white/90 rounded-tr-lg shadow-sm" />
              </div>
              <div className="text-center">
                <span className="text-[11px] font-semibold text-white/80 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 shadow-md">
                  Posisikan Bukti Butir #{questionNumber} di Bingkai
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div className="w-6 h-6 border-b-2 border-l-2 border-white/90 rounded-bl-lg shadow-sm" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-white/90 rounded-br-lg shadow-sm" />
              </div>
            </div>

            {/* Top Bar Controls: Tutup, Live GPS Badge, Flip */}
            <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10">
              <button
                type="button"
                onClick={stopLiveCamera}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                aria-label="Tutup kamera"
              >
                <X className="w-5 h-5 stroke-[2.2]" />
              </button>

              {/* Status GPS di Kamera */}
              <div className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/20 rounded-full flex items-center gap-1.5 text-white text-[11px] font-semibold shadow-md">
                {liveGpsInfo.status === "locating" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>Mencari GPS...</span>
                  </>
                )}
                {liveGpsInfo.status === "locked" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>GPS Siap • {liveGpsInfo.distance}m</span>
                  </>
                )}
                {liveGpsInfo.status === "error" && (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>GPS Lemah</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleFlipCamera}
                className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                title="Putar Kamera"
              >
                <RotateCw className="w-4 h-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Bottom Shutter Controls */}
            <div className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-2 z-10">
              <button
                type="button"
                disabled={isCapturing}
                onClick={captureFromLiveCamera}
                className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center bg-white/20 hover:bg-white/30 active:scale-95 transition-all cursor-pointer shadow-2xl disabled:opacity-50"
                aria-label="Ambil foto"
              >
                <div className="w-13 h-13 rounded-full bg-white shadow-inner flex items-center justify-center">
                  {isCapturing && <RotateCcw className="w-5 h-5 animate-spin text-slate-800" />}
                </div>
              </button>
              <p className="text-[10px] text-white/70 font-medium">
                Sentuh tombol untuk membidik foto
              </p>
            </div>
          </div>
        )}

        {/* ================= MODAL PENOLAKAN GPS / FAKE GPS ================= */}
        {gpsErrorModal && gpsErrorModal.isOpen && (
          <div className="absolute inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xl w-full max-w-xs space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-xs">
                <AlertOctagon className="w-7 h-7 stroke-[2.2]" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {gpsErrorModal.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {gpsErrorModal.message}
                </p>
              </div>

              {/* Rincian Verifikasi */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 text-[11px] text-left space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Jarak ke Gerai:</span>
                  <span className="font-bold text-rose-600">{gpsErrorModal.distance} meter</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Radius Maksimal:</span>
                  <span className="font-bold text-slate-800">{gpsErrorModal.radius} meter</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Akurasi GPS:</span>
                  <span className="font-semibold text-slate-700">
                    ±{gpsErrorModal.accuracy} meter
                  </span>
                </div>
                {gpsErrorModal.isFakeGps && (
                  <div className="pt-1.5 border-t border-slate-200 text-rose-600 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Terindikasi Fake GPS / Mock Location!</span>
                  </div>
                )}
              </div>

              {/* Tombol Aksi */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setGpsErrorModal(null)}
                  className="w-full py-2.5 bg-[#193f53] hover:bg-[#122f3e] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                >
                  Coba Lagi di Lokasi Gerai
                </button>

                {/* Tombol Khusus Uji Coba Developer */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Alat Pengujian / Dev Mode
                  </p>
                  <button
                    type="button"
                    onClick={handleBypassGpsTesting}
                    className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Bypass & Setujui untuk Uji Coba
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncStoreCoordinates}
                    className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Sinkronkan Gerai ke Lokasi Saya
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PengerjaanChecklistPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-slate-900 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
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

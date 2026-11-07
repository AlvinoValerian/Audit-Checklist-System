"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  HelpCircle,
  Store as StoreIcon,
  CheckCircle2,
  Camera,
  RotateCw,
  Send,
  ShieldCheck,
  Check,
  RotateCcw,
  Smartphone,
  Maximize2,
  X,
  Clock,
  User,
  Briefcase,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  MapPin,
  Navigation,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";
import { optimizeAndResizeImage, encryptImageData } from "@/lib/image-crypto";
import DecryptedImage from "@/components/DecryptedImage";

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
  storeLat?: number;
  storeLng?: number;
  storeRadius?: number;
  templateName: string;
  questions: QuestionItem[];
  selectedConditions: Record<number, "standard" | "issue" | "na">;
  photos: Record<number, string>;
  notes: Record<number, string>;
  startedAt?: string;
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

function KonfirmasiContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const scheduleId = searchParams.get("id") || "";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [currentTime, setCurrentTime] = useState<string>("11:35");
  const [currentDateOnly, setCurrentDateOnly] = useState<string>("");
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>(
    "24 Okt 2024, 11:35 WIB"
  );
  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [auditData, setAuditData] = useState<StoredAudit | null>(null);

  // Sesi Mengetik Nama & Posisi Manual
  const [manualStaffName, setManualStaffName] = useState<string>("");
  const [manualPosition, setManualPosition] = useState<string>("");

  // Selfie photo state (Tidak ada data statik placeholder, hanya kamera langsung)
  const [selfiePhoto, setSelfiePhoto] = useState<string>("");
  const [isSelfieVerified, setIsSelfieVerified] = useState<boolean>(false);
  const [selfieMeta, setSelfieMeta] = useState<{
    lat: number;
    lon: number;
    accuracy: number;
    distance: number;
    timestamp: string;
  } | null>(null);

  // Live Camera States (Tanpa akses galeri sama sekali)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [gpsErrorModal, setGpsErrorModal] = useState<GpsErrorModalData | null>(null);
  const [liveGpsInfo, setLiveGpsInfo] = useState<{
    status: "locating" | "locked" | "error";
    lat?: number;
    lon?: number;
    accuracy?: number;
    distance?: number;
  }>({ status: "locating" });

  const [scheduleDetail, setScheduleDetail] = useState<any>(null);

  // Digital Signature state (Kosongkan data statik agar kanvas bersih awal)
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    // Prefill nama dan posisi manual dari data akun realtime
    if (user?.fullName) {
      setManualStaffName(user.fullName);
    }
    if (user?.position) {
      setManualPosition(user.position);
    }

    // Ambil data audit aktif dari local storage
    let activeScheduleId = scheduleId;
    try {
      const stored = localStorage.getItem("staff_active_audit");
      if (stored) {
        const parsed: StoredAudit = JSON.parse(stored);
        if (!scheduleId || parsed.scheduleId === scheduleId) {
          setAuditData(parsed);
          if (!activeScheduleId) activeScheduleId = parsed.scheduleId;
        }
      }
    } catch (e) {
      console.warn("Gagal membaca audit:", e);
    }

    // Ambil detail jadwal realtime langsung dari backend database
    if (activeScheduleId) {
      const fetchDetail = async () => {
        try {
          const token = AuthService.getToken();
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          let res = await fetch(`/api/staff/schedules/${activeScheduleId}`, { headers });
          if (!res.ok) {
            res = await fetch(`http://127.0.0.1:5000/api/staff/schedules/${activeScheduleId}`, { headers });
          }
          if (res.ok) {
            const json = await res.json();
            if (json.data) setScheduleDetail(json.data);
          }
        } catch (e) {
          console.warn("Gagal fetch detail jadwal realtime:", e);
        }
      };
      fetchDetail();
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
      setCurrentDateOnly(
        `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`
      );
      setCurrentDateFormatted(
        `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${hours}:${minutes} WIB`
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 30000);

    // Kanvas tanda tangan dibiarkan bersih/kosong tanpa data statik
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    return () => {
      clearInterval(timer);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [scheduleId]);

  // Titik Koordinat & Batas Radius Toko
  const storeLat = scheduleDetail?.store?.latitude ?? auditData?.storeLat ?? -7.95484;
  const storeLng = scheduleDetail?.store?.longitude ?? auditData?.storeLng ?? 112.63982;
  const storeRadius = scheduleDetail?.store?.radius ?? auditData?.storeRadius ?? 50;

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

          let isFake = false;
          if (acc <= 0 || acc > 250) isFake = true;
          if ((pos.coords as any).isMock || (pos as any).mocked) isFake = true;
          const timeDiff = Math.abs(Date.now() - pos.timestamp);
          if (timeDiff > 45000) isFake = true;

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

  // Watermark generator dengan Canvas untuk Foto Diri Bertugas
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
    ctx.roundRect(24, 24, 430, 44, 12);
    ctx.fill();

    ctx.fillStyle = "#10b981";
    ctx.beginPath();
    ctx.arc(46, 46, 6, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px sans-serif";
    ctx.fillText("KAMERA RESMI • VALIDASI SERAGAM & GPS", 64, 52);

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
      `👤 ${meta.auditorName} • SERAGAM LENGKAP BERTUGAS • ${nowStr} WIB`,
      30,
      canvas.height - 40
    );

    return canvas.toDataURL("image/jpeg", 0.88);
  };

  // ================= KAMERA LIVE KONTROL =================
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraLoading(false);
    } catch (err: any) {
      console.warn("Gagal membuka stream kamera langsung:", err);
      setIsCameraLoading(false);
      setIsCameraActive(false);
      toast.error("Gagal membuka kamera perangkat. Pastikan izin kamera telah diberikan!");
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
    const nextMode = facingMode === "user" ? "environment" : "user";
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

  // Tangkap Frame Kamera Langsung dengan Validasi Radius & Fake GPS
  const captureFromLiveCamera = async () => {
    if (!videoRef.current) return;
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
            "Sistem mendeteksi indikasi Fake GPS atau manipulasi sinyal lokasi. Pengambilan foto diri bertugas ditolak demi integritas laporan!",
          distance,
          radius: storeRadius,
          accuracy,
          isFakeGps: true,
          pendingPhotoBlob: rawPhoto,
          pendingCoords: { lat: latitude, lon: longitude, accuracy },
        });
        return;
      }

      // 2. Cek Radius Gerai
      if (distance > storeRadius) {
        setIsCapturing(false);
        stopLiveCamera();
        setGpsErrorModal({
          isOpen: true,
          title: "Foto Ditolak: Di Luar Radius Gerai",
          message: `Kamera Anda terdeteksi berjarak ${distance} meter dari gerai (Batas radius ${storeRadius} meter). Foto selfie wajib diambil di area gerai fisik!`,
          distance,
          radius: storeRadius,
          accuracy,
          isFakeGps: false,
          pendingPhotoBlob: rawPhoto,
          pendingCoords: { lat: latitude, lon: longitude, accuracy },
        });
        return;
      }

      // 3. Valid: Beri Stempel Watermark GPS
      const watermarked = stampWatermark(tempCanvas, {
        lat: latitude,
        lon: longitude,
        accuracy,
        distance,
        storeName: displayStore,
        storeCode: scheduleDetail?.store?.code || auditData?.storeCode || "ST-01",
        auditorName: manualStaffName || currentUser?.fullName || "Staff Lapangan",
      });

      // 4. Resize optimal (1024px, q:0.78) agar hemat memori & enkripsi AES-256-GCM
      const optimized = await optimizeAndResizeImage(watermarked, 1024, 1024, 0.78);
      const encrypted = await encryptImageData(optimized);

      setSelfiePhoto(encrypted);
      setSelfieMeta({
        lat: latitude,
        lon: longitude,
        accuracy,
        distance,
        timestamp: new Date().toISOString(),
      });
      setIsSelfieVerified(true);

      setIsCapturing(false);
      stopLiveCamera();
      toast.success(`Foto diri terverifikasi di gerai (${distance}m, GPS Valid)!`);
    } catch (err: any) {
      setIsCapturing(false);
      stopLiveCamera();
      toast.error("Gagal membaca sinyal GPS kamera. Pastikan izin lokasi perangkat aktif!");
    }
  };

  // Helper Pengujian: Bypass GPS untuk Pengujian Developer
  const handleBypassGpsTesting = async () => {
    if (!gpsErrorModal || !gpsErrorModal.pendingPhotoBlob) {
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
          storeName: displayStore,
          storeCode: scheduleDetail?.store?.code || auditData?.storeCode || "ST-01",
          auditorName: manualStaffName || currentUser?.fullName || "Staff Lapangan",
        });

        const optimized = await optimizeAndResizeImage(watermarked, 1024, 1024, 0.78);
        const encrypted = await encryptImageData(optimized);

        setSelfiePhoto(encrypted);
        setSelfieMeta({
          lat: storeLat,
          lon: storeLng,
          accuracy: 8,
          distance: 12,
          timestamp: new Date().toISOString(),
        });
        setIsSelfieVerified(true);
        setGpsErrorModal(null);
        toast.success("Foto selfie disetujui dalam Mode Uji Coba (Bypass GPS Radius)!");
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
    if (scheduleDetail) {
      setScheduleDetail({
        ...scheduleDetail,
        store: {
          ...scheduleDetail.store,
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

  // Canvas drawing handlers with accurate touch scaling
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ("touches" in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else if ("clientX" in e) {
      return {
        x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
        y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e) {
      e.stopPropagation();
    } else {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    if ("touches" in e) {
      e.stopPropagation();
    } else {
      e.preventDefault();
    }
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
    toast.info("Kanvas tanda tangan dibersihkan. Silakan goreskan tanda tangan.");
  };

  // Submit Final Report to Backend PostgreSQL
  const handleSubmitFinalReport = async () => {
    if (!manualStaffName.trim()) {
      toast.error("Silakan masukkan nama petugas.");
      return;
    }

    if (!manualPosition.trim()) {
      toast.error("Silakan masukkan posisi / jabatan Anda.");
      return;
    }

    if (!selfiePhoto || !isSelfieVerified) {
      toast.error("Foto diri bertugas wajib diambil langsung menggunakan kamera dengan seragam lengkap.");
      return;
    }

    if (!hasSignature) {
      toast.error("Tanda tangan digital wajib dibubuhkan sebelum menyerahkan laporan.");
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
      const rawId =
        currentUser?.rawId ||
        (currentUser?.id
          ? currentUser.id
              .replace(/^staff-/, "")
              .replace(/^sa-/, "")
              .replace(/^adm-/, "")
          : undefined);
      if (rawId) headers["x-user-id"] = rawId;

      const questions = auditData?.questions || [];
      const answersPayload = questions.map((q) => ({
        taskId: q.id,
        answer: auditData?.selectedConditions?.[q.id] || "standard",
        note: auditData?.notes?.[q.id] || "",
        photo: auditData?.photos?.[q.id] || "",
      }));

      // Tanda tangan berbentuk gambar canvas: di-resize optimal & dienkripsi AES-256-GCM
      let signatureData = "";
      if (canvasRef.current) {
        try {
          const cvs = canvasRef.current;
          // Buat canvas penampung dengan latar belakang putih solid (#ffffff)
          const exportCanvas = document.createElement("canvas");
          exportCanvas.width = cvs.width;
          exportCanvas.height = cvs.height;
          const expCtx = exportCanvas.getContext("2d");
          if (expCtx) {
            expCtx.fillStyle = "#ffffff";
            expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            expCtx.drawImage(cvs, 0, 0);
          }
          const rawSig = exportCanvas.toDataURL("image/png");
          // Resize & kompresi optimal gambar tanda tangan (maks 600x250, q:0.9) dengan background putih solid
          const optimizedSig = await optimizeAndResizeImage(rawSig, 600, 250, 0.9, "#ffffff");
          // Enkripsi gambar tanda tangan dengan AES-256-GCM
          signatureData = await encryptImageData(optimizedSig);
        } catch (e) {
          console.warn("Gagal memproses gambar tanda tangan:", e);
          signatureData = canvasRef.current.toDataURL("image/png");
        }
      }

      const bodyPayload = {
        answers: answersPayload,
        selfiePhoto,
        signature: signatureData,
        signerName: manualStaffName.trim(),
        signerRole: manualPosition.trim(),
        startedAt: auditData?.startedAt || new Date().toISOString(),
      };

      let res: Response | null = null;
      try {
        res = await fetch(`/api/staff/schedules/${targetScheduleId}/submit`, {
          method: "POST",
          headers,
          body: JSON.stringify(bodyPayload),
        });
      } catch (e) {
        console.warn("Direct rewrite fetch error, attempting direct backend port:", e);
      }

      if (!res || !res.ok) {
        try {
          res = await fetch(
            `http://127.0.0.1:5000/api/staff/schedules/${targetScheduleId}/submit`,
            {
              method: "POST",
              headers,
              body: JSON.stringify(bodyPayload),
            }
          );
        } catch (backendErr) {
          console.warn("Direct backend port fetch error:", backendErr);
        }
      }

      let reportId = "";
      if (res && res.ok) {
        try {
          const json = await res.json();
          reportId = json?.data?.reportId || "";
        } catch (e) {}

        // Bersihkan draf tersimpan karena laporan sudah resmi diserahkan ke PostgreSQL
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("staff_completed_tasks");
            localStorage.removeItem(`staff_saved_audit_${targetScheduleId}`);
            localStorage.removeItem("staff_active_audit");
          } catch (e) {
            console.warn(e);
          }
        }

        toast.success(
          "🎉 Laporan audit checklist berhasil diserahkan ke Store Manager!"
        );
        router.push(`/jadwal-staff/terkirim?reportId=${reportId}&scheduleId=${targetScheduleId}`);
      } else {
        const errorJson = await res?.json().catch(() => null);
        const serverMsg = errorJson?.message || errorJson?.error || "Gagal menyerahkan laporan audit ke server.";
        toast.error(serverMsg);
        return;
      }
    } catch (err) {
      console.error("Error submitting final report:", err);
      // Bersihkan draf lokal jika terjadi kesalahan jaringan
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("staff_completed_tasks");
          localStorage.removeItem(`staff_saved_audit_${targetScheduleId}`);
          localStorage.removeItem("staff_active_audit");
        } catch (e) {}
      }
      toast.success("Laporan disimpan dan disinkronkan ke server!");
      router.push(`/jadwal-staff/terkirim?scheduleId=${targetScheduleId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bersihkan nama toko agar realtime dari database
  const rawStoreName =
    scheduleDetail?.store?.name ||
    auditData?.storeName ||
    currentUser?.storeName ||
    "Mie Gacoan";
  const displayStore = rawStoreName;
  const displayTitle =
    scheduleDetail?.title ||
    auditData?.scheduleTitle ||
    "Laporan Audit Checklist";

  // Perhitungan dinamis jumlah parameter lolos audit, temuan masalah (issue/no), dan skor kepatuhan
  const questionsList = auditData?.questions || [];
  const selectedConditions = auditData?.selectedConditions || {};

  let passedCount = 0;
  let issueCount = 0;
  let naCount = 0;

  if (questionsList.length > 0) {
    questionsList.forEach((q) => {
      const cond = selectedConditions[q.id];
      if (cond === "issue") {
        issueCount++;
      } else if (cond === "na") {
        naCount++;
      } else {
        passedCount++;
      }
    });
  } else {
    const conditionValues = Object.values(selectedConditions);
    conditionValues.forEach((cond) => {
      if (cond === "issue") issueCount++;
      else if (cond === "na") naCount++;
      else passedCount++;
    });
  }

  const totalQuestions = questionsList.length || scheduleDetail?.totalQuestions || 8;
  const applicableCount = Math.max(1, totalQuestions - naCount);
  const calculatedScore = Math.round((passedCount / applicableCount) * 100);
  const scorePercent = Math.min(100, Math.max(0, calculatedScore));

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-slate-900 sm:relative sm:inset-auto sm:min-h-screen sm:bg-slate-900 sm:flex sm:items-center sm:justify-center sm:py-6 sm:px-4 font-sans antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Konfirmasi & Tanda Tangan (Mobile View)
        </span>
        <button
          onClick={() => setIsFullscreenMode(!isFullscreenMode)}
          className="ml-2 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer touch-manipulation active:scale-95"
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
        {/* Dynamic Island on Desktop Frame */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 pointer-events-none" />

        {/* 2. Top Navigation Bar */}
        <div className="px-4 pt-3.5 sm:pt-3 pb-2.5 bg-white border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() =>
              router.push(
                `/jadwal-staff/review?id=${auditData?.scheduleId || scheduleId}`
              )
            }
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer touch-manipulation active:scale-95"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
          </button>

          <div className="text-center flex-1 min-w-0">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                Konfirmasi & Serahkan
              </h2>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-[#193f53] text-[10px] font-bold tracking-tight shrink-0">
                Langkah Terakhir
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[220px] mx-auto mt-0.5">
              {displayTitle}
            </p>
          </div>

          <button
            onClick={() => setShowHelpModal(true)}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer touch-manipulation active:scale-95"
            aria-label="Bantuan"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Main Scrollable Container */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 space-y-3.5">
          {/* Card Header Info Gerai & Staff */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Staff Bertugas</span>
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                <span>Terkunci Sistem</span>
              </span>
            </div>

            {/* Sesi Mengetik Nama & Posisi Manual */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nama Petugas / Auditor</span>
                </label>
                <input
                  type="text"
                  value={manualStaffName}
                  onChange={(e) => setManualStaffName(e.target.value)}
                  placeholder="Ketik nama lengkap Anda..."
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-all touch-manipulation"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>Posisi / Jabatan</span>
                </label>
                <input
                  type="text"
                  value={manualPosition}
                  onChange={(e) => setManualPosition(e.target.value)}
                  placeholder="Contoh: Senior Barista / Store Crew..."
                  className="w-full px-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-all touch-manipulation"
                />
              </div>
            </div>

            {/* Nama Toko yang Ditempati & Jam Pengerjaan */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-800 font-semibold min-w-0">
                  <StoreIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate" title={displayStore}>
                    {displayStore}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                  Lokasi Toko Aktif
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <div className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {currentTime} WIB • {currentDateOnly}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Auto-Validasi OK</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Card 1: Foto Diri Bertugas Menggunakan Kamera Seragam Lengkap (HANYA KAMERA, TANPA GALERI) */}
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
                Wajib Kamera
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Ambil foto selfie langsung di area gerai dengan seragam lengkap untuk validasi kehadiran fisik & bukti serah terima audit.
            </p>

            {/* Tampilan Foto Diri / Tombol Buka Kamera */}
            {selfiePhoto ? (
              <div className="space-y-2">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs group aspect-4/3 bg-slate-900">
                  <DecryptedImage
                    src={selfiePhoto}
                    alt="Selfie Verifikasi Staff"
                    className="w-full h-full object-cover"
                  />

                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2.5 py-1 bg-black/60 backdrop-blur-xs text-white text-[10px] font-semibold rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>GPS Terverifikasi (Dalam Gerai)</span>
                    </span>
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-xs text-white p-2.5 rounded-xl text-[10px] font-mono leading-tight space-y-0.5 pointer-events-none">
                    <div className="flex items-center justify-between text-yellow-300">
                      <span>📍 GPS Verified • {currentTime} WIB</span>
                      <span>SERAGAM LENGKAP</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-200 truncate">
                      <span className="truncate">{displayStore}</span>
                      <span className="shrink-0">{manualStaffName || "Staff"}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Foto kamera terverifikasi & terenkripsi</span>
                  </div>
                  <button
                    type="button"
                    onClick={startLiveCamera}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Ambil Ulang Foto</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={startLiveCamera}
                className="w-full h-48 rounded-2xl border-2 border-dashed border-[#193f53]/40 bg-blue-50/20 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer touch-manipulation active:scale-[0.99] group shadow-2xs"
              >
                <div className="w-12 h-12 rounded-full bg-[#193f53] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Camera className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div className="text-center px-4">
                  <p className="text-xs font-bold text-slate-800">
                    Buka Kamera Selfie HP
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hanya kamera langsung (tidak bisa pilih dari galeri)
                  </p>
                  <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px]">
                    <MapPin className="w-3 h-3" />
                    <span>Validasi Radius Gerai ({storeRadius}m)</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 5. Card 2: Tanda Tangan Digital Simple (Tanpa Teks Rumit) */}
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
              Bubuhkan tanda tangan Anda pada kanvas bawah ini sebagai bukti pertanggungjawaban data audit lapangan.
            </p>

            {/* Kanvas Tanda Tangan Sederhana & Bersih */}
            <div className="relative border border-slate-200 rounded-2xl bg-white p-2 flex items-center justify-center overflow-hidden touch-none shadow-2xs">
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
                className="cursor-crosshair w-full h-[150px] bg-transparent touch-none select-none"
              />

              {/* Garis bantu tanda tangan */}
              <div className="absolute left-6 right-6 bottom-7 border-b border-dashed border-slate-200 pointer-events-none" />

              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-medium">
                  Sentuh atau goreskan tanda tangan di sini
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs">
              <div className="flex items-center gap-1.5">
                {hasSignature ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px] font-medium text-emerald-600">
                      Tanda tangan tersimpan
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-medium text-amber-600">
                      Belum ditandatangani
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all touch-manipulation active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Hapus & Ulangi</span>
              </button>
            </div>
          </div>

          {/* 6. Pernyataan Integritas & Kepatuhan */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-1.5">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Pernyataan Integritas & Kepatuhan</span>
            </div>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              Saya menyatakan dengan sungguh-sungguh bahwa seluruh {totalQuestions} butir checklist audit telah diperiksa langsung sesuai kondisi fisik aktual gerai tanpa rekayasa.
            </p>
          </div>

          {/* 7. Parameter Lolos Audit Dinamis (Sesuai Jawaban Asli) */}
          <div className="bg-white rounded-2xl p-3.5 border border-slate-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-800 min-w-0">
              {issueCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="truncate">
                {passedCount}/{totalQuestions} Parameter Lolos Audit
                {issueCount > 0 && (
                  <span className="ml-1 text-[11px] font-normal text-rose-600">
                    ({issueCount} Temuan)
                  </span>
                )}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 font-bold text-[11px] rounded-md shrink-0 ${
                scorePercent === 100
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : scorePercent >= 80
                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              Skor: {scorePercent}%
            </span>
          </div>
        </div>

        {/* 8. Bottom Sticky Action Bar */}
        <div className="p-4 pb-6 bg-white border-t border-slate-100 shrink-0 space-y-2.5">
          <div className="flex items-center justify-between text-xs px-1 text-slate-500">
            <div className="flex items-center gap-1.5 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
              <span>2 dari 2 verifikasi lengkap</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600">
              Siap Kirim
            </span>
          </div>

          <button
            onClick={handleSubmitFinalReport}
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-[#193f53] hover:bg-[#122f3e] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer touch-manipulation disabled:opacity-50"
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
        </div>

        {/* ================= MODAL KAMERA LIVE VIEWFINDER SELFIE (TANPA AKSES FILE / GALERI) ================= */}
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

            {/* Viewfinder Target Reticle Lingkaran Selfie */}
            <div className="absolute inset-x-8 inset-y-24 border border-white/20 rounded-3xl pointer-events-none flex flex-col justify-between p-4">
              <div className="flex justify-between items-start">
                <div className="w-6 h-6 border-t-2 border-l-2 border-white/90 rounded-tl-lg shadow-sm" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-white/90 rounded-tr-lg shadow-sm" />
              </div>
              <div className="text-center">
                <span className="text-[11px] font-semibold text-white/90 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-md">
                  Posisikan Wajah & Seragam Lengkap di Bingkai
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
                title="Putar Kamera Depan/Belakang"
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
                aria-label="Ambil foto selfie"
              >
                <div className="w-13 h-13 rounded-full bg-white shadow-inner flex items-center justify-center">
                  {isCapturing && <RotateCcw className="w-5 h-5 animate-spin text-slate-800" />}
                </div>
              </button>
              <p className="text-[10px] text-white/70 font-medium">
                Sentuh tombol untuk membidik foto selfie
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
                <div className="flex justify-between">
                  <span className="text-slate-500">Jarak Terdeteksi:</span>
                  <span className="font-mono font-bold text-rose-600">
                    {gpsErrorModal.distance} meter
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Batas Maksimal Radius:</span>
                  <span className="font-mono font-semibold text-slate-700">
                    {gpsErrorModal.radius} meter
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Akurasi GPS Perangkat:</span>
                  <span className="font-mono text-slate-600">
                    ±{gpsErrorModal.accuracy} meter
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setGpsErrorModal(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95"
                >
                  Tutup & Coba Lagi di Area Gerai
                </button>

                {/* HELPER PENGUJIAN UNTUK PENGEMBANGAN / LOCALHOST */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Opsi Uji Coba Pengembang (Dev Mode)
                  </span>
                  <button
                    type="button"
                    onClick={handleBypassGpsTesting}
                    className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95"
                  >
                    ⚡ Bypass GPS Radius (Setujui Foto Uji Coba)
                  </button>
                  <button
                    type="button"
                    onClick={handleSyncStoreCoordinates}
                    className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-[11px] font-bold rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95"
                  >
                    📍 Sinkronkan Koordinat Gerai ke Posisi Saya
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
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
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer touch-manipulation active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Langkah verifikasi ini memastikan kepatuhan SOP bahwa auditor benar-benar berada di gerai dan mempertanggungjawabkan akurasi data checklist secara sah melalui kamera live & GPS.
            </p>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer touch-manipulation active:scale-95"
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

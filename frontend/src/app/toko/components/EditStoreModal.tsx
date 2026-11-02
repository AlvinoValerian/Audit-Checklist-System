"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  X,
  Search,
  Clock,
  Compass,
  UploadCloud,
  Check,
  Navigation,
  Trash2,
  Loader2,
} from "lucide-react";
import { StoreItem, StoreTimezone } from "@/types/toko";
import { toast } from "sonner";

// Dynamic import Leaflet component to prevent SSR 'window is not defined' error
const AuditPointPickerMap = dynamic(
  () => import("./AuditPointPickerMap"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[270px] sm:h-[290px] rounded-xl flex flex-col items-center justify-center bg-slate-50 border border-slate-200 text-slate-400 gap-2">
        <Compass className="w-6 h-6 animate-spin text-sky-600" />
        <span className="text-xs font-medium">Memuat peta audit...</span>
      </div>
    ),
  }
);

interface EditStoreModalProps {
  isOpen: boolean;
  store: StoreItem | null;
  onClose: () => void;
  onSubmit: (updatedData: Partial<StoreItem>) => Promise<void> | void;
}

const TIMEZONE_OPTIONS = [
  { value: "WIB (UTC+7)", label: "WIB (UTC+7) - Waktu Indonesia Barat" },
  { value: "WITA (UTC+8)", label: "WITA (UTC+8) - Waktu Indonesia Tengah" },
  { value: "WIT (UTC+9)", label: "WIT (UTC+9) - Waktu Indonesia Timur" },
];

const RADIUS_PRESETS = [100, 150, 200];

export default function EditStoreModal({
  isOpen,
  store,
  onClose,
  onSubmit,
}: EditStoreModalProps) {
  // Form States
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState<StoreTimezone>("WIB (UTC+7)");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [geofenceRadius, setGeofenceRadius] = useState<number>(100);
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Map Coordinates
  const [latitude, setLatitude] = useState<number>(-6.183418);
  const [longitude, setLongitude] = useState<number>(106.823456);

  // Photo State
  const [photoInfo, setPhotoInfo] = useState<{
    fileName: string;
    fileSize: string;
    previewUrl: string;
  } | null>(null);
  const [isPhotoDeleted, setIsPhotoDeleted] = useState<boolean>(false);

  // Submitting state for loading animation
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Locating State
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const latestGeocodeCoords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (store && isOpen) {
      setName(store.name || "");
      setTimezone(store.timezone || "WIB (UTC+7)");
      setAddress(store.address || "");
      setCity(store.city || "Jakarta Pusat");
      setGeofenceRadius(store.geofenceRadius ?? 100);
      setDescription(
        store.description ||
          "Gerai utama di lantai ground floor, akses lobi barat. Operasional setiap hari 10:00 - 22:00 WIB."
      );
      setIsActive(store.status === "Aktif");
      setLatitude(store.latitude ?? -6.183418);
      setLongitude(store.longitude ?? 106.823456);
      setIsSubmitting(false);
      setIsPhotoDeleted(false);

      if (store.storePicture) {
        const cleanName = store.name.toLowerCase().replace(/\s+/g, "_");
        setPhotoInfo({
          fileName: `foto_outlet_${cleanName}.jpg`,
          fileSize: "Foto Gerai Aktif",
          previewUrl: store.storePicture,
        });
      } else {
        setPhotoInfo(null);
      }
    }
  }, [store, isOpen]);

  if (!isOpen || !store) return null;

  // Reverse Geocoding Helper: updates address & city from coordinates
  const reverseGeocode = async (lat: number, lng: number, showToast = false) => {
    latestGeocodeCoords.current = { lat, lng };

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "id,en",
          },
        }
      );
      if (res.ok) {
        // Prevent race conditions: ensure response belongs to latest dragged pin
        if (
          latestGeocodeCoords.current?.lat !== lat ||
          latestGeocodeCoords.current?.lng !== lng
        ) {
          return;
        }

        const data = await res.json();
        if (data.display_name) {
          setAddress(data.display_name);
        }
        const detectedCity =
          data.address?.city ||
          data.address?.town ||
          data.address?.city_district ||
          data.address?.municipality ||
          data.address?.county;
        if (detectedCity) {
          setCity(detectedCity);
        }

        if (showToast) {
          toast.success("Alamat dan kota berhasil disesuaikan dengan posisi pin!");
        }
      }
    } catch (err) {
      console.error("Gagal reverse geocode:", err);
    }
  };

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    reverseGeocode(lat, lng, false);
  };

  // HTML5 Browser Geolocation GPS Checkin
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Browser Anda tidak mendukung deteksi lokasi otomatis (Geolocation).");
      return;
    }

    setIsLocating(true);
    const toastId = toast.loading("Mendeteksi koordinat GPS perangkat Anda...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = parseFloat(position.coords.latitude.toFixed(6));
        const userLng = parseFloat(position.coords.longitude.toFixed(6));

        setLatitude(userLat);
        setLongitude(userLng);
        setIsLocating(false);
        toast.dismiss(toastId);
        toast.success(`Lokasi GPS berhasil dikunci: ${userLat}, ${userLng}`);

        reverseGeocode(userLat, userLng, true);
      },
      (error) => {
        setIsLocating(false);
        toast.dismiss(toastId);
        let errorMsg = "Gagal mengambil lokasi GPS saat ini.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Izin akses lokasi ditolak oleh pengguna/browser.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Sinyal GPS / informasi lokasi tidak tersedia.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "Waktu permintaan lokasi GPS habis (timeout).";
        }
        toast.error(errorMsg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Ukuran file foto maksimal 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        setPhotoInfo({
          fileName: file.name,
          fileSize: `${sizeMb} MB • Terunggah`,
          previewUrl: reader.result as string,
        });
        setIsPhotoDeleted(false);
        toast.success(`Foto ${file.name} berhasil diunggah.`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoInfo(null);
    setIsPhotoDeleted(true);
    toast.info("Foto toko telah dihapus. Klik 'Simpan Perubahan' untuk mengonfirmasi.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Nama toko wajib diisi.");
      return;
    }

    if (!address.trim()) {
      toast.error("Alamat lengkap toko wajib diisi.");
      return;
    }

    if (!city.trim()) {
      toast.error("Kota / Kabupaten wajib diisi.");
      return;
    }

    const matchedTz = TIMEZONE_OPTIONS.find((t) => t.value === timezone);

    // Jika user menghapus foto: kirim explicit null. Jika ada foto baru/lama: kirim previewUrl.
    const finalStorePicture = isPhotoDeleted
      ? null
      : photoInfo
      ? photoInfo.previewUrl
      : undefined;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        city: city.trim(),
        address: address.trim(),
        timezone,
        timezoneLabel: matchedTz?.label || `${timezone} - Waktu Indonesia Barat`,
        geofenceRadius,
        latitude,
        longitude,
        description: description.trim() || undefined,
        status: isActive ? "Aktif" : "Nonaktif",
        storePicture: finalStorePicture,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan perubahan";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-bold text-slate-900 text-lg leading-tight">
                Edit Data Toko
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isActive
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-rose-50 text-rose-600 border border-rose-200"
                }`}
              >
                {isActive ? "Aktif" : "Nonaktif"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Perbarui rincian outlet, koordinat geofence, dan foto profil toko.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 overflow-y-auto">
          <form id="edit-store-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Two-Column Grid: Form Left (7/12) & Map Right (5/12) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* LEFT COLUMN: Informasi Utama Toko */}
              <div className="lg:col-span-7 bg-[#fbfcfd] rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                    Informasi Utama Toko
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Perbarui identitas dan parameter operasional toko.
                  </p>
                </div>

                {/* Nama Toko */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Toko <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Toko Sudirman"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all"
                  />
                </div>

                {/* Zona Waktu (Timezone) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Zona Waktu (Timezone) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value as StoreTimezone)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all appearance-none cursor-pointer pr-10"
                    >
                      {TIMEZONE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <Clock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Alamat Lengkap */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Alamat Lengkap <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Terhubung otomatis via pin peta
                    </span>
                  </div>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Masukkan alamat lengkap toko beserta nomor, jalan, kelurahan, dan kecamatan..."
                      rows={2}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Kota / Kabupaten */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kota / Wilayah Operasional <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Kota Malang atau Jakarta Pusat"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all"
                  />
                </div>

                {/* Radius Toleransi GPS Geofence (Sama persis dengan CreateStoreModal) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Radius Toleransi GPS Geofence <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[130px]">
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        value={geofenceRadius}
                        onChange={(e) =>
                          setGeofenceRadius(Math.max(10, parseInt(e.target.value) || 100))
                        }
                        className="w-full pl-3.5 pr-14 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all"
                        required
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        meter
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {RADIUS_PRESETS.map((preset) => {
                        const isSelected = geofenceRadius === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setGeofenceRadius(preset)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#eef6ff] text-[#1d4ed8] border border-[#bfdbfe] shadow-2xs"
                                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {preset}m
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                    Jarak toleransi absensi/audit surveyor di lokasi (rekomendasi: 100 - 200m).
                  </p>
                </div>

                {/* Deskripsi / Catatan Operasional */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700">
                      Deskripsi / Catatan Operasional
                    </label>
                    <span className="text-[11px] text-slate-400">Opsional</span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Catatan atau keterangan operasional toko (misal: gerai ada di lantai ground floor, akses lobi barat)..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all resize-none"
                  />
                </div>

                {/* Foto Toko (Tampak Depan) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Foto Toko (Tampak Depan)
                  </label>

                  {photoInfo ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={photoInfo.previewUrl}
                          alt={photoInfo.fileName}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {photoInfo.fileName}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {photoInfo.fileSize}
                          </p>
                          <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Format terverifikasi</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-2xs">
                          <span>Ganti Foto</span>
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="relative border-2 border-dashed border-[#bfdbfe] hover:border-[#60a5fa] rounded-2xl p-4 bg-[#f8fbff] flex flex-col items-center justify-center text-center transition-colors cursor-pointer block">
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <div className="w-10 h-10 rounded-full bg-[#eff6ff] text-[#2563eb] flex items-center justify-center mb-2 shadow-2xs">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        Unggah Foto Toko (Tampak Depan)
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        PNG, JPG atau WEBP hingga 5MB
                      </p>
                    </label>
                  )}
                </div>

                {/* Status Toggle Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">
                      Status Operasional Toko
                    </h5>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {isActive
                        ? "Toko dapat ditugaskan untuk audit & inspeksi rutin"
                        : "Toko nonaktif sementara tidak dapat menerima penugasan baru"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      isActive ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Peta Lokasi & Geofence Interaktif */}
              <div className="lg:col-span-5 bg-[#fbfcfd] border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#193f53]" />
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                      Titik Fisik Audit Toko
                    </h4>
                  </div>

                  {/* HTML5 Geolocation Button */}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f0f7ff] hover:bg-[#e0effe] border border-[#bfdbfe] text-[#1d4ed8] text-xs font-semibold transition-colors cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>{isLocating ? "Mencari Lokasi..." : "Gunakan Lokasi Saya"}</span>
                  </button>
                </div>

                {/* Interactive Leaflet Point Picker Map */}
                <AuditPointPickerMap
                  latitude={latitude}
                  longitude={longitude}
                  radius={geofenceRadius}
                  onChangeLocation={handleLocationChange}
                />

                {/* Instruction Tip */}
                <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
                  <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    i
                  </span>
                  <p>
                    Geser pin atau klik pada area peta untuk mengunci titik audit fisik toko
                    secara presisi.
                  </p>
                </div>

                {/* Latitude and Longitude Input Fields */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#193f53] focus:border-[#193f53]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#193f53] focus:border-[#193f53]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              Terakhir diperbarui: {store.createdAt || "12 Okt 2023"}, 14:30 WIB
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              form="edit-store-form"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-6 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#123040] rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  X,
  Search,
  Clock,
  Compass,
  UploadCloud,
  AlertCircle,
  Check,
  Navigation,
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

interface CreateStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (storeData: Omit<StoreItem, "id">) => void;
}

const TIMEZONE_OPTIONS = [
  { value: "WIB (UTC+7)", label: "WIB (UTC+7) - Jakarta, Sumatera, Barat" },
  { value: "WITA (UTC+8)", label: "WITA (UTC+8) - Bali, Kalimantan, Sulawesi" },
  { value: "WIT (UTC+9)", label: "WIT (UTC+9) - Maluku, Papua" },
];

const RADIUS_PRESETS = [100, 150, 200];

export default function CreateStoreModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateStoreModalProps) {
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

  // Photo Upload State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Locating State
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const latestGeocodeCoords = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName("");
      setTimezone("WIB (UTC+7)");
      setAddress("");
      setCity("");
      setGeofenceRadius(100);
      setDescription("");
      setIsActive(true);
      setLatitude(-6.183418);
      setLongitude(106.823456);
      setPhotoPreview(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
    reverseGeocode(lat, lng, true);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser Anda.");
      return;
    }

    setIsLocating(true);
    toast.info("Mengambil titik lokasi GPS saat ini...");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLatitude(lat);
        setLongitude(lng);

        try {
          await reverseGeocode(lat, lng, false);
          toast.success("Titik GPS dan alamat lengkap toko berhasil diperbarui!");
        } catch {
          toast.success("Titik lokasi GPS berhasil disesuaikan dengan posisi Anda!");
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        toast.error(`Gagal mendapatkan lokasi: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
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
        setPhotoPreview(reader.result as string);
        toast.success(`Foto ${file.name} berhasil diunggah.`);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
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

    onSubmit({
      name: name.trim(),
      city: city.trim(),
      address: address.trim(),
      timezone,
      timezoneLabel: matchedTz?.label || `${timezone} - Asia/Jakarta`,
      geofenceRadius,
      latitude,
      longitude,
      operationalHours: "Setiap hari • 10:00 - 22:00 WIB",
      description: description.trim() || undefined,
      findingsCount: 0,
      status: isActive ? "Aktif" : "Nonaktif",
      workspace: "Workspace A",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-lg leading-tight">
              Tambah Data Toko
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-normal">
              Tambahkan toko baru ke dalam Workspace A beserta titik koordinat audit presisi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 overflow-y-auto">
          <form id="create-store-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Two-Column Grid: Form Left (7/12) & Map Right (5/12) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* LEFT COLUMN: Informasi Utama Toko */}
              <div className="lg:col-span-7 bg-[#fbfcfd] rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                    Informasi Utama Toko
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Lengkapi data identitas dan pengaturan operasional toko.
                  </p>
                </div>

                {/* Nama Toko */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Toko <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Toko Kencana Thamrin"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all"
                    required
                  />
                </div>

                {/* Timezone Toko */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Timezone Toko <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value as StoreTimezone)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all appearance-none cursor-pointer pr-10"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                    <Clock className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Alamat Lengkap */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Alamat Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Jl. M.H. Thamrin No. 28, Gondangdia, Menteng, Jakarta Pusat"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all"
                      required
                    />
                  </div>
                </div>

                {/* Kota / Kabupaten */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kota / Kabupaten <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Contoh: Jakarta Pusat"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all"
                    required
                  />
                </div>

                {/* Radius Toleransi GPS Geofence */}
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
                    placeholder="Catatan atau keterangan operasional toko (misal: gerai ada di lantai 2 samping eskalator)..."
                    rows={2}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all resize-none"
                  />
                </div>

                {/* Foto Toko (Tampak Depan) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Foto Toko (Tampak Depan)
                  </label>
                  <label className="relative border-2 border-dashed border-[#bfdbfe] hover:border-[#60a5fa] rounded-2xl p-4 bg-[#f8fbff] flex flex-col items-center justify-center text-center transition-colors cursor-pointer block">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    {photoPreview ? (
                      <div className="space-y-1.5">
                        <img
                          src={photoPreview}
                          alt="Preview Foto Toko"
                          className="w-28 h-16 object-cover rounded-xl border border-slate-200 mx-auto"
                        />
                        <p className="text-xs text-emerald-600 font-semibold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Foto berhasil dipilih (Klik untuk ganti)
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full bg-[#dbeafe] text-[#1d4ed8] flex items-center justify-center mb-1.5">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          <span className="text-[#1d4ed8] font-bold underline">
                            Klik untuk unggah file
                          </span>{" "}
                          atau seret foto ke sini
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Mendukung format PNG, JPG, JPEG hingga 5MB
                        </p>
                      </>
                    )}
                  </label>
                </div>

                {/* Status Operasional Toko (Toggle Switch) */}
                <div className="pt-1 flex items-center justify-between">
                  <div>
                    <h5 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                      Status Operasional Toko
                    </h5>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Toko langsung aktif dan siap dijadwalkan jadwal checklist audit.
                    </p>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isActive}
                    onClick={() => setIsActive(!isActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isActive ? "bg-[#1d4ed8]" : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isActive ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN: Penetapan Titik Audit */}
              <div className="lg:col-span-5 bg-[#fbfcfd] rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                      Penetapan Titik Audit
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Koordinat akurat lokasi toko fisik
                    </p>
                  </div>

                  {/* Gunakan Lokasi Saya Button */}
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
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Pastikan semua data bertanda bintang (<span className="text-rose-500">*</span>) telah terisi dengan benar sebelum menyimpan.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="create-store-form"
              className="flex items-center gap-1.5 px-6 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#123040] rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Toko</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

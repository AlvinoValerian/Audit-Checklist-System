"use client";

import React from "react";
import dynamic from "next/dynamic";
import {
  X,
  ExternalLink,
  MapPin,
  Clock,
  Compass,
  Store,
  Pencil,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { StoreItem } from "@/types/toko";

// Dynamic import Leaflet component to prevent SSR 'window is not defined' error
const GeofenceMap = dynamic(() => import("./GeofenceMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-52 sm:h-56 rounded-xl flex flex-col items-center justify-center bg-slate-50 border border-slate-200 text-slate-400 gap-2">
      <Compass className="w-6 h-6 animate-spin text-sky-600" />
      <span className="text-xs font-medium">Memuat peta geofence...</span>
    </div>
  ),
});

interface DetailStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  store: StoreItem | null;
  onEdit?: () => void;
}

export default function DetailStoreModal({
  isOpen,
  onClose,
  store,
  onEdit,
}: DetailStoreModalProps) {
  if (!isOpen || !store) return null;

  const initialLetter =
    store.name.replace(/toko\s*/i, "").charAt(0) || store.name.charAt(0);

  const googleMapsUrl =
    store.latitude && store.longitude
      ? `https://www.google.com/maps?q=${store.latitude},${store.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          store.address
        )}`;

  const geofenceRadius = store.geofenceRadius || 100;
  const latitude = store.latitude ?? -6.183418;
  const longitude = store.longitude ?? 106.823456;
  const timezoneText =
    store.timezoneLabel ||
    `${store.timezone}${store.timezone.includes("WIB") ? " - Asia/Jakarta" : store.timezone.includes("WITA") ? " - Asia/Makassar" : " - Asia/Jayapura"}`;
  const operationalHours =
    store.operationalHours || "Setiap hari • 10:00 - 22:00 WIB";
  const description =
    store.description ||
    `Gerai operasional ${store.name}, melayani pelanggan area ${store.city || "sekitar"}. Sesuai standar SOP Audit Pro.`;
  const registeredDate = store.createdAt || "12 Okt 2023";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between px-5 sm:px-6 pt-5 pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-lg leading-tight">
              Detail Toko
            </h3>
            <p className="text-xs text-slate-400 mt-1 font-normal">
              Informasi lengkap toko, koordinat geofence, dan status audit.
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
        <div className="px-5 sm:px-6 py-2 overflow-y-auto space-y-3.5">
          {/* Store Info Banner Card */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#e2ecf3] text-[#193f53] font-bold text-base flex items-center justify-center shrink-0 border border-slate-200">
                {initialLetter.toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                  {store.name}
                </h4>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  {store.city || "Jakarta Pusat"}
                </p>
              </div>
            </div>

            <div>
              {store.status === "Aktif" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Aktif
                </span>
              )}
              {store.status === "Maintenance" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Maintenance
                </span>
              )}
              {store.status === "Nonaktif" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Nonaktif
                </span>
              )}
            </div>
          </div>

          {/* ALAMAT LENGKAP */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
              ALAMAT LENGKAP
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
              {store.address}
            </p>
          </div>

          {/* 2-Columns: TIMEZONE & RADIUS GEOFENCE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* TIMEZONE */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                ZONA WAKTU (TIMEZONE)
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800">
                {timezoneText}
              </p>
            </div>

            {/* RADIUS GEOFENCE */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                RADIUS GEOFENCE
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800">
                <span className="font-bold text-slate-900">{geofenceRadius} meter</span>{" "}
                <span className="text-slate-400 text-xs font-normal">
                  (Auto-checkin radius)
                </span>
              </p>
            </div>
          </div>

          {/* TITIK KOORDINAT GPS */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                TITIK KOORDINAT GPS
              </span>
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-slate-700 hover:text-sky-600 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Lihat di Google Maps</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-800">
              Lat: <span className="font-semibold">{latitude}</span>, Long:{" "}
              <span className="font-semibold">{longitude}</span>
            </p>
          </div>

          {/* 2-Columns: TOTAL TEMUAN AUDIT & JADWAL OPERASIONAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* TOTAL TEMUAN AUDIT */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1.5">
                TOTAL TEMUAN AUDIT
              </div>
              <div className="flex items-center gap-2">
                {store.findingsCount === 0 ? (
                  <>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-600">
                      0 Temuan
                    </span>
                    <span className="text-xs text-slate-400">Kondisi optimal</span>
                  </>
                ) : store.findingsCount <= 5 ? (
                  <>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                      {store.findingsCount} Temuan
                    </span>
                    <span className="text-xs text-slate-400">Perlu tindak lanjut</span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      {store.findingsCount} Temuan
                    </span>
                    <span className="text-xs text-slate-400">Prioritas tinggi</span>
                  </>
                )}
              </div>
            </div>

            {/* JADWAL OPERASIONAL */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                JADWAL OPERASIONAL
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-800">
                {operationalHours}
              </p>
            </div>
          </div>

          {/* CATATAN / DESKRIPSI */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3">
            <div className="text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-1">
              CATATAN / DESKRIPSI
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {description}
            </p>
          </div>

          {/* GEOFENCE VISUALIZER (Powered by Leaflet) */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-slate-400 tracking-wider uppercase">
                <Compass className="w-3.5 h-3.5 text-slate-400" />
                <span>GEOFENCE VISUALIZER</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-400">
                Radius: {geofenceRadius}M
              </span>
            </div>

            {/* Interactive Leaflet Geofence Map */}
            <GeofenceMap
              latitude={latitude}
              longitude={longitude}
              radius={geofenceRadius}
              storeName={store.name}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-t border-slate-100 shrink-0 bg-white">
          <span className="text-xs text-slate-400 font-normal">
            Terdaftar sejak {registeredDate}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#123040] rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Toko</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

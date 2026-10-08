"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Store,
  FileCheck,
  UserCheck,
  ShieldCheck,
  Image as ImageIcon,
} from "lucide-react";
import { AuditGalleryLog, AuditPhoto } from "@/types/gallery";
import { GalleryService } from "@/services/gallery.service";

interface PhotoDetailModalProps {
  isOpen: boolean;
  photo: AuditPhoto | null;
  log: AuditGalleryLog | null;
  onClose: () => void;
  onSelectPhotoIndex?: (index: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalPhotos?: number;
}

export default function PhotoDetailModal({
  isOpen,
  photo,
  log,
  onClose,
  onSelectPhotoIndex,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  currentIndex = 1,
  totalPhotos = 1,
}: PhotoDetailModalProps) {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [photo?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev && onPrev) onPrev();
      if (e.key === "ArrowRight" && hasNext && onNext) onNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onPrev, onNext, onClose]);

  if (!isOpen || !photo || !log) return null;

  const imageSrc = imageError
    ? GalleryService.getFallbackForCategory(photo.category)
    : photo.url;

  // Photo-specific evaluation
  const isCurrentPhotoIssue = photo.hasIssue;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container - Compact Fixed Dimensions */}
      <div className="bg-white rounded-2xl w-full max-w-[760px] h-[88vh] max-h-[550px] md:h-[550px] relative z-10 flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header - Fixed Compact */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${
                isCurrentPhotoIssue
                  ? "bg-rose-50 border-rose-100 text-rose-500"
                  : "bg-emerald-50 border-emerald-100 text-emerald-600"
              }`}
            >
              {isCurrentPhotoIssue ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Detail Bukti Foto Audit
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isCurrentPhotoIssue
                  ? "Dokumentasi ketidaksesuaian checklist operasional toko"
                  : "Dokumentasi bukti verifikasi checklist operasional toko"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Tutup (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body (2 Columns Compact) */}
        <div className="flex-1 overflow-hidden p-3.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3.5 min-h-0 bg-white">
          {/* Left Column: Fixed Photo & Thumbnails */}
          <div className="lg:col-span-6 flex flex-col justify-between h-full min-h-0">
            {/* Main Photo Box */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center shadow-xs shrink-0 max-h-[260px]">
              {/* Photo Image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt={photo.caption}
                onError={() => setImageError(true)}
                className="w-full h-full object-cover transition-all"
              />

              {/* Top Overlay Badges */}
              <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10 pointer-events-none">
                {isCurrentPhotoIssue ? (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600/95 text-white font-extrabold text-[8px] sm:text-[9px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    KETIDAKSESUAIAN OPERASIONAL
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600/95 text-white font-extrabold text-[8px] sm:text-[9px] tracking-wider uppercase flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    SESUAI STANDAR SOP
                  </span>
                )}

                <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-[9px] font-semibold flex items-center gap-1 shadow-sm">
                  <ImageIcon className="w-2.5 h-2.5" />
                  Foto {currentIndex} dari {totalPhotos}
                </span>
              </div>

              {/* Prev Button Overlay */}
              {hasPrev && (
                <button
                  onClick={onPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105"
                  title="Foto Sebelumnya (←)"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Next Button Overlay */}
              {hasNext && (
                <button
                  onClick={onNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center transition-all shadow-md cursor-pointer hover:scale-105"
                  title="Foto Selanjutnya (→)"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Bottom Thumbnails Section */}
            <div className="space-y-1 pt-1.5 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-800 uppercase tracking-wider">
                  DAFTAR FOTO AUDIT ({totalPhotos} FOTO)
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={onPrev}
                    disabled={!hasPrev}
                    className={`w-5 h-5 flex items-center justify-center rounded border border-slate-200 transition-colors ${
                      hasPrev
                        ? "text-slate-700 hover:bg-slate-50 cursor-pointer"
                        : "text-slate-300 border-slate-100 cursor-not-allowed"
                    }`}
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={onNext}
                    disabled={!hasNext}
                    className={`w-5 h-5 flex items-center justify-center rounded border border-slate-200 transition-colors ${
                      hasNext
                        ? "text-slate-700 hover:bg-slate-50 cursor-pointer"
                        : "text-slate-300 border-slate-100 cursor-not-allowed"
                    }`}
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Thumbnails Row */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                {log.photos.map((p, idx) => {
                  const isActive = idx === currentIndex - 1;
                  return (
                    <div
                      key={p.id}
                      onClick={() => onSelectPhotoIndex && onSelectPhotoIndex(idx)}
                      className={`relative w-10 h-10 rounded-md overflow-hidden cursor-pointer shrink-0 transition-all ${
                        isActive
                          ? "ring-2 ring-[#193f53] border border-white shadow-xs scale-105"
                          : "border border-slate-200 opacity-75 hover:opacity-100"
                      }`}
                      title={`${p.caption} ${p.hasIssue ? "(Temuan Issue)" : "(Sesuai)"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.url}
                        alt={p.caption}
                        onError={(e) => {
                          const target = e.currentTarget;
                          const fallback = GalleryService.getFallbackForCategory(p.category);
                          if (target.src !== fallback) target.src = fallback;
                        }}
                        className="w-full h-full object-cover"
                      />
                      {p.hasIssue && (
                        <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-rose-600 ring-1 ring-white" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Scrollable Information Cards */}
          <div className="lg:col-span-6 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar pr-1 space-y-2">
            {/* Dynamic Per-Photo Description Box */}
            {isCurrentPhotoIssue ? (
              <div className="bg-rose-50/25 border border-rose-200 rounded-xl p-3 text-xs transition-all shrink-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-slate-900 text-[11px] sm:text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Deskripsi Issue:
                  </h4>
                  {photo.issueSeverity && (
                    <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                      Prioritas {photo.issueSeverity}
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-700 leading-relaxed font-normal">
                  {photo.issueDescription || photo.description || "-"}
                </p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs transition-all shrink-0">
                <h4 className="font-bold text-slate-900 mb-1 text-[11px] sm:text-xs flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Deskripsi:
                </h4>
                <p className="text-[10px] sm:text-[11px] text-slate-700 leading-relaxed font-normal">
                  {photo.description || photo.notes || "-"}
                </p>
              </div>
            )}

            {/* Nama Toko Card */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-white flex items-center justify-between shrink-0">
              <div>
                <p className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Nama Toko
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 mt-0.5">
                  {log.storeName}
                </p>
                <p className="text-[9.5px] text-slate-500">
                  {log.storeLocation || "Jakarta Pusat"}
                </p>
              </div>
              <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>

            {/* Nama Jadwal Card */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-white flex items-center justify-between shrink-0">
              <div>
                <p className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Nama Jadwal
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 mt-0.5">
                  {log.scheduleTitle}
                </p>
              </div>
              <FileCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>

            {/* Auditor Lapangan Card */}
            <div className="border border-slate-200 rounded-xl p-2.5 bg-white flex items-center justify-between shrink-0">
              <div>
                <p className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Auditor Lapangan / Pelaksana
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 mt-0.5">
                  {photo.auditorName || log.auditor.name}
                </p>
                <p className="text-[9.5px] text-slate-500">
                  {log.auditor.role}
                </p>
              </div>
              <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>

            {/* Split Bottom Row Cards */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              {/* Tanggal & Waktu Audit */}
              <div className="border border-slate-200 rounded-xl p-2.5 bg-white">
                <p className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Tanggal & Waktu Audit
                </p>
                <p className="text-[11px] sm:text-xs font-bold text-slate-900 mt-0.5">
                  {log.dateTimeFull || `${log.date}, 10:30 WIB`}
                </p>
              </div>

              {/* Status Validasi */}
              <div className="border border-slate-200 rounded-xl p-2.5 bg-white">
                <p className="text-[8.5px] font-semibold text-slate-400 uppercase tracking-wider">
                  Status Validasi
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isCurrentPhotoIssue ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                  <span
                    className={`text-[11px] sm:text-xs font-bold ${
                      isCurrentPhotoIssue ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    {isCurrentPhotoIssue ? "Perlu Tindak Lanjut" : "Terverifikasi Sesuai"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed Compact */}
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Tercatat pada log audit sistem</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

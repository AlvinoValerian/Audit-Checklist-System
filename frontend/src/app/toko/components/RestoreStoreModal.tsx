"use client";

import React from "react";
import { X, RotateCcw, Info, Store } from "lucide-react";
import { StoreItem } from "@/types/toko";

interface RestoreStoreModalProps {
  isOpen: boolean;
  store: StoreItem | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RestoreStoreModal({
  isOpen,
  store,
  onClose,
  onConfirm,
}: RestoreStoreModalProps) {
  if (!isOpen || !store) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white rounded-2xl w-full max-w-lg relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-3 relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
              <RotateCcw className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Konfirmasi Pengaktifan Kembali Toko
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-extrabold uppercase tracking-wider">
                  RESTORE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemulihan unit toko agar aktif dan siap menerima penugasan audit checklist.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-3 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin mengaktifkan kembali toko{" "}
            <span className="font-bold text-slate-900">{store.name}</span>? Status
            toko akan kembali menjadi Aktif dan dapat dijadwalkan untuk audit checklist.
          </p>

          {/* Details Table / Box */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
            {/* Row 1: Nama Toko */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Nama Toko</span>
              <span className="font-bold text-slate-900">{store.name}</span>
            </div>

            {/* Row 2: Kota / Wilayah */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Kota / Wilayah</span>
              <span className="font-bold text-slate-900">
                {store.city || "Jakarta Pusat"}
              </span>
            </div>

            {/* Row 3: Alamat Lengkap */}
            <div className="flex justify-between items-start text-xs">
              <span className="text-slate-500 shrink-0 mr-4">Alamat</span>
              <span className="text-right font-medium text-slate-800 line-clamp-2">
                {store.address}
              </span>
            </div>

            {/* Row 4: Zona Waktu */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Zona Waktu</span>
              <span className="font-semibold text-slate-700">
                {store.timezone}
              </span>
            </div>

            {/* Row 5: Status Akun */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Status Toko</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Akan Diaktifkan
              </span>
            </div>
          </div>

          {/* Info Banner */}
          <div className="flex items-start gap-2.5 p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-xl">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Setelah dipulihkan, status toko akan kembali menjadi{" "}
              <span className="font-semibold">Aktif</span> dan dapat menerima penugasan
              jadwal audit operasional.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 flex justify-end items-center gap-2.5 bg-slate-50/50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ya, Aktifkan Kembali Toko</span>
          </button>
        </div>
      </div>
    </div>
  );
}

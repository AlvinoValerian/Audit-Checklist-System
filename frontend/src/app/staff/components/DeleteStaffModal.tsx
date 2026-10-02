"use client";

import React from "react";
import { X, Trash2, AlertCircle } from "lucide-react";
import { StaffUser } from "@/types/staff";

interface DeleteStaffModalProps {
  isOpen: boolean;
  staff: StaffUser | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteStaffModal({
  isOpen,
  staff,
  onClose,
  onConfirm,
}: DeleteStaffModalProps) {
  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white rounded-2xl w-full max-w-md relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6 pb-4">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-start mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Nonaktifkan / Hapus Staff
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfirmasi perubahan status penugasan staf.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed mb-4">
            Apakah Anda yakin ingin menonaktifkan akun staf{" "}
            <span className="font-bold text-slate-900">{staff.fullName}</span>?
            Staf tidak akan dapat mengakses workspace audit sampai diaktifkan kembali.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 mb-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Staff:</span>
              <span className="font-semibold text-slate-900">{staff.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email:</span>
              <span className="font-medium text-slate-700">{staff.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Penempatan:</span>
              <span className="font-medium text-slate-700">
                {staff.storeName} ({staff.storeLocation})
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200/70 rounded-xl">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Anda dapat mengaktifkan kembali status staf ini sewaktu-waktu melalui tombol edit.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 flex justify-end items-center gap-2.5 bg-slate-50/50">
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
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            Nonaktifkan Staff
          </button>
        </div>
      </div>
    </div>
  );
}

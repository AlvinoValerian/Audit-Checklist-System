"use client";

import React from "react";
import { X, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { TeknisUser } from "@/types/teknis";

interface SoftDeleteTeknisModalProps {
  isOpen: boolean;
  user: TeknisUser | null;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export default function SoftDeleteTeknisModal({
  isOpen,
  user,
  onClose,
  onConfirm,
  isSubmitting = false,
}: SoftDeleteTeknisModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Box */}
      <div className="bg-white rounded-3xl w-full max-w-md relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100 shadow-xs">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Nonaktifkan User Teknis
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-extrabold uppercase tracking-wider">
                  SOFT DELETE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfirmasi penonaktifan hak akses personil divisi teknis.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin menonaktifkan akun teknis{" "}
            <strong className="text-slate-900">{user.fullName}</strong> ({user.email})?
          </p>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Spesialisasi:</span>
              <span className="font-bold text-slate-800">{user.specialization}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Workspace:</span>
              <span className="font-semibold text-slate-800">{user.workspaceName || "Pusat"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Status Saat Ini:</span>
              <span className="font-semibold text-emerald-600">Aktif</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-amber-800 text-[11px] leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Akun yang dinonaktifkan tidak akan dapat login ke sistem. Anda dapat mengaktifkannya kembali kapan saja melalui filter status.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menonaktifkan...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Nonaktifkan User</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

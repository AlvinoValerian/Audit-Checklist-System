"use client";

import React from "react";
import { X, RotateCcw, CheckCircle2 } from "lucide-react";
import { TemplateItem } from "@/types/template";

interface RestoreTemplateModalProps {
  isOpen: boolean;
  template: TemplateItem | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RestoreTemplateModal({
  isOpen,
  template,
  onClose,
  onConfirm,
}: RestoreTemplateModalProps) {
  if (!isOpen || !template) return null;

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
                  Aktifkan Kembali Template
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-extrabold uppercase tracking-wider">
                  RESTORE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Template ini akan kembali aktif dan dapat dipilih untuk jadwal penugasan audit.
              </p>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div className="px-6 py-4 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Nama Template:</span>
              <span className="font-bold text-slate-800 text-right truncate max-w-[260px]">
                {template.title}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Kategori:</span>
              <span className="font-semibold text-slate-700">
                {template.category || "Operasional"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Status Sebelumnya:</span>
              <span className="font-semibold text-rose-600">
                {template.status}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/60 text-emerald-800 text-xs leading-relaxed">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Seluruh butir pertanyaan checklist yang tersimpan di dalam template ini akan langsung tersedia untuk auditor toko.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            Ya, Aktifkan Kembali
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { X, Trash2, AlertCircle } from "lucide-react";
import { TemplateItem } from "@/types/template";

interface SoftDeleteModalProps {
  isOpen: boolean;
  template: TemplateItem | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SoftDeleteModal({
  isOpen,
  template,
  onClose,
  onConfirm,
}: SoftDeleteModalProps) {
  if (!isOpen || !template) return null;

  const totalTasks =
    template.itemsCount ||
    (template.categories
      ? template.categories.reduce((acc, c) => acc + c.tasks.length, 0)
      : template.items?.length || 10);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white rounded-3xl w-full max-w-lg relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-2 relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100">
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Konfirmasi Nonaktifkan Template
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[9px] font-extrabold uppercase tracking-wider">
                  SOFT DELETE
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Penonaktifan template SOP dari penugasan audit operasional di Workspace A.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-4 space-y-4 text-xs">
          {/* Confirmation Question Paragraph */}
          <p className="text-slate-600 leading-relaxed">
            Apakah Anda yakin ingin menonaktifkan template{" "}
            <span className="font-bold text-slate-900">
              {template.title}
            </span>
            ? Template yang dinonaktifkan tidak akan dapat dipilih untuk jadwal audit baru, namun riwayat laporan audit sebelumnya tetap tersimpan.
          </p>

          {/* Key-Value Details Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Nama Template:</span>
              <span className="font-bold text-slate-900 text-right truncate max-w-[260px]">
                {template.title}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Dibuat Oleh:</span>
              <span className="font-bold text-slate-800">
                {template.createdBy || "Hendra Wijaya"}{" "}
                <span className="text-slate-400 font-normal">
                  ({template.creatorRole || "Admin"})
                </span>
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Terakhir Revisi:</span>
              <span className="font-bold text-slate-800">
                {template.lastRevision || "24 Oktober 2024"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Total Butir Checklist:</span>
              <span className="font-bold text-slate-800">
                {totalTasks} Tugas
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium">Status Template:</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-rose-600 text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                Akan Dinonaktifkan
              </span>
            </div>
          </div>

          {/* Notice Alert Box */}
          <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-amber-800 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Tindakan ini adalah soft-delete dan dapat dipulihkan atau diaktifkan kembali oleh Admin kapan saja melalui filter status.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/40 flex justify-end items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Ya, Nonaktifkan Template</span>
          </button>
        </div>
      </div>
    </div>
  );
}

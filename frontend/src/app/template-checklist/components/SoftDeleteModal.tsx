"use client";

import React from "react";
import {
  X,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Calendar,
  Store,
  Clock,
  Ban,
  CheckCheck,
} from "lucide-react";
import { TemplateItem } from "@/types/template";
import { AuditSchedule } from "@/types/schedule";
import { isScheduleInProgress } from "@/services/schedule.service";

interface SoftDeleteModalProps {
  isOpen: boolean;
  template: TemplateItem | null;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  connectedSchedules?: AuditSchedule[];
  onDeactivateSchedule?: (schedule: AuditSchedule) => void;
  deactivatingScheduleId?: string | null;
  workspaceName?: string;
}

export default function SoftDeleteModal({
  isOpen,
  template,
  onClose,
  onConfirm,
  isSubmitting = false,
  connectedSchedules = [],
  onDeactivateSchedule,
  deactivatingScheduleId = null,
  workspaceName = "Workspace Ini",
}: SoftDeleteModalProps) {
  if (!isOpen || !template) return null;

  const totalTasks =
    template.itemsCount ||
    (template.categories
      ? template.categories.reduce((acc, c) => acc + c.tasks.length, 0)
      : template.items?.length || 10);

  const hasConnectedSchedules = connectedSchedules.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Card */}
      <div className="bg-white rounded-3xl w-full max-w-xl relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-3 border-b border-slate-100 relative">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-start">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                hasConnectedSchedules
                  ? "bg-amber-50 text-amber-600 border-amber-200"
                  : "bg-rose-50 text-rose-500 border-rose-100"
              }`}
            >
              {hasConnectedSchedules ? (
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>
            <div className="pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {hasConnectedSchedules
                    ? "Wajib Nonaktifkan Jadwal Terkait Terlebih Dahulu"
                    : "Konfirmasi Nonaktifkan Template"}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                    hasConnectedSchedules
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-600 border-rose-200"
                  }`}
                >
                  {hasConnectedSchedules ? "RELASI JADWAL AKTIF" : "SOFT DELETE"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Penonaktifan template SOP operasional pada {workspaceName}.
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-4 space-y-4 text-xs overflow-y-auto">
          {hasConnectedSchedules ? (
            /* Warning Banner & Schedule List Section */
            <>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 leading-relaxed space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Template Masih Terhubung ke Jadwal Audit Aktif</span>
                </div>
                <p className="text-amber-800 text-[11px] pl-6">
                  Template checklist ini tidak dapat dinonaktifkan secara langsung karena masih digunakan oleh{" "}
                  <strong>{connectedSchedules.length} jadwal audit aktif</strong>. Harap nonaktifkan setiap jadwal di bawah ini terlebih dahulu.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    Jadwal Audit yang Masih Aktif ({connectedSchedules.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Klik tombol untuk menonaktifkan
                  </span>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {connectedSchedules.map((sch) => {
                    const isDeactivating = deactivatingScheduleId === sch.id;
                    const isPending = sch.status === "Terjadwal";
                    const inProgress = isScheduleInProgress(sch);

                    return (
                      <div
                        key={sch.id}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs truncate max-w-[220px]">
                              {sch.scheduleName}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                inProgress
                                  ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                                  : isPending
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              }`}
                            >
                              {inProgress ? "Sedang Berjalan (Audit Aktif)" : isPending ? "Belum Selesai (Terjadwal)" : "Selesai"}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Store className="w-3 h-3 text-slate-400" />
                              {sch.storeName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {sch.date} ({sch.timeRange})
                            </span>
                          </div>

                          <p className="text-[10px] text-slate-400 mt-1">
                            {inProgress
                              ? "🚫 Jadwal sedang berlangsung di jam & hari ini. Tidak dapat dinonaktifkan selama sesi audit."
                              : isPending
                              ? "⚠️ Jadwal belum selesai. Wajib menyelesaikan checklist audit terlebih dahulu."
                              : "✅ Audit telah selesai. Dapat langsung dinonaktifkan."}
                          </p>
                        </div>

                        {isPending ? (
                          <button
                            type="button"
                            onClick={() => onDeactivateSchedule && onDeactivateSchedule(sch)}
                            disabled={isDeactivating || isSubmitting}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs"
                            title="Buka form untuk menyelesaikan checklist jadwal ini"
                          >
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selesaikan Checklist</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onDeactivateSchedule && onDeactivateSchedule(sch)}
                            disabled={isDeactivating || isSubmitting}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer shrink-0 disabled:opacity-50 shadow-2xs"
                            title="Nonaktifkan jadwal yang sudah selesai ini"
                          >
                            {isDeactivating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
                                <span>Memproses...</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3.5 h-3.5 text-rose-600" />
                                <span>Nonaktifkan Jadwal</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Clear & Ready to Deactivate Section */
            <>
              <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Semua Jadwal Terkait Telah Dinonaktifkan</span>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Tidak ada jadwal audit aktif yang saat ini menggunakan template ini. Anda kini dapat melanjutkan penonaktifan template.
                  </p>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menonaktifkan template{" "}
                <span className="font-bold text-slate-900">{template.title}</span>? Template yang dinonaktifkan tidak akan dapat dipilih untuk jadwal audit baru, namun riwayat laporan audit sebelumnya tetap tersimpan.
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
                  <span className="font-bold text-slate-800">{totalTasks} Tugas</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-medium">Status Template:</span>
                  <span className="inline-flex items-center gap-1.5 font-bold text-rose-600 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                    Akan Dinonaktifkan
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Notice Alert Box */}
          <div className="flex items-start gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-slate-100/70 border border-slate-200/80 text-slate-600 text-[11px] leading-relaxed">
            <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Tindakan ini adalah soft-delete. Template yang dinonaktifkan dapat diaktifkan kembali kapan saja melalui filter status.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/40 flex justify-between items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Batal
          </button>

          <div className="flex items-center gap-2">
            {hasConnectedSchedules ? (
              <button
                type="button"
                disabled={true}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-400 bg-slate-200/80 border border-slate-300 rounded-xl cursor-not-allowed shadow-2xs"
                title="Harap nonaktifkan seluruh jadwal terkait terlebih dahulu"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Nonaktifkan Seluruh Jadwal Dulu</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onConfirm}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menonaktifkan Template...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Nonaktifkan Template</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

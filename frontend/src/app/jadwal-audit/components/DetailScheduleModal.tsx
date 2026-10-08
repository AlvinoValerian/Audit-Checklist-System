"use client";

import React from "react";
import { X, Calendar, Clock, Store, Repeat, User, Pencil, CheckCircle2, AlertCircle } from "lucide-react";
import { AuditSchedule } from "@/types/schedule";

interface DetailScheduleModalProps {
  isOpen: boolean;
  schedule: AuditSchedule | null;
  onClose: () => void;
  onEdit?: () => void;
}

export default function DetailScheduleModal({
  isOpen,
  schedule,
  onClose,
  onEdit,
}: DetailScheduleModalProps) {
  if (!isOpen || !schedule) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Detail Jadwal Audit
              </h2>
              <p className="text-xs text-slate-500">
                Informasi waktu pelaksanaan dan penugasan cabang toko.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {schedule.scheduleName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {schedule.storeName} — {schedule.storeLocation}
                </p>
              </div>

              {schedule.status === "Terjadwal" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-600 border border-sky-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Terjadwal
                </span>
              )}
              {schedule.status === "Selesai" && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" />
                  Selesai
                </span>
              )}
              {schedule.status === "Dibatalkan" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  Dibatalkan
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{schedule.timeRange}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-slate-400" />
                <span>{schedule.recurrence}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{schedule.auditorName || "Belum ditentukan"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{schedule.date}</span>
              </div>
            </div>
          </div>

          {schedule.notes && (
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                Catatan Instruksi
              </h4>
              <p className="text-xs text-slate-600 p-3 bg-slate-50 border border-slate-200/80 rounded-xl leading-relaxed">
                {schedule.notes}
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#193f53] hover:bg-[#123040] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Jadwal</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

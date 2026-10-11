"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  X,
  AlertTriangle,
  FileCheck2,
  CheckCircle2,
  Store,
  ExternalLink,
  Clock,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { AuditSchedule } from "@/types/schedule";
import { TemplateService } from "@/services/template.service";
import { toast } from "sonner";

interface ChecklistRequiredModalProps {
  isOpen: boolean;
  schedule: AuditSchedule | null;
  onClose: () => void;
  onCompleteAndDeactivate: () => void;
}

export default function ChecklistRequiredModal({
  isOpen,
  schedule,
  onClose,
  onCompleteAndDeactivate,
}: ChecklistRequiredModalProps) {
  const [isChecklistCompleted, setIsChecklistCompleted] = useState(false);
  const [completedItems, setCompletedItems] = useState<number[]>([0, 1]); // initial some checked

  if (!isOpen || !schedule) return null;

  // Find linked template or use representative items
  const allTemplates = TemplateService.getAll();
  const linkedTemplate =
    allTemplates.find(
      (t) =>
        t.title.toLowerCase().includes(schedule.scheduleName.toLowerCase()) ||
        (t.category && schedule.scheduleName.toLowerCase().includes(t.category.toLowerCase()))
    ) || allTemplates[0];

  const sampleTasks = linkedTemplate?.items || [
    { id: "1", question: "Kesiapan mesin POS kasir & printer struk", category: "Kasir", required: true },
    { id: "2", question: "Kerapihan rak gondola dan kesesuaian planogram", category: "Display", required: true },
    { id: "3", question: "Kebersihan lantai, kaca etalase, dan toilet gerai", category: "Kebersihan", required: true },
    { id: "4", question: "Pemeriksaan label harga promo yang masih berlaku", category: "Labeling", required: true },
    { id: "5", question: "Pengecekan fasilitas APAR & jalur evakuasi toko", category: "K3", required: true },
  ];

  const toggleTask = (index: number) => {
    setCompletedItems((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleMarkAllComplete = () => {
    setCompletedItems(sampleTasks.map((_, i) => i));
    setIsChecklistCompleted(true);
    toast.success("Template checklist berhasil diselesaikan!");
  };

  const handleProceedDeactivate = () => {
    onCompleteAndDeactivate();
  };

  const allDone = isChecklistCompleted || completedItems.length === sampleTasks.length;

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
        <div className="p-6 pb-3 relative border-b border-slate-100">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200 shadow-xs">
              <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="pr-6">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Template Checklist Belum Selesai
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold uppercase tracking-wider">
                  WAJIB DISELESAIKAN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Jadwal terhubung dengan modul Template Checklist. Selesaikan butir
                checklist sebelum dapat menonaktifkan jadwal ini.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-4 space-y-4 text-xs overflow-y-auto max-h-[60vh]">
          {/* Card Info Jadwal & Template */}
          <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Jadwal Audit:</span>
              <span className="font-bold text-slate-900 text-right">
                {schedule.scheduleName}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Cabang Toko:</span>
              <span className="font-semibold text-slate-800">
                {schedule.storeName} ({schedule.storeLocation})
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Template Checklist:</span>
              <span className="font-semibold text-sky-700">
                {linkedTemplate?.title || schedule.scheduleName}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200/60">
              <span className="text-slate-500 font-medium">Status Checklist:</span>
              <span
                className={`inline-flex items-center gap-1.5 font-bold text-xs ${
                  allDone ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    allDone ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {allDone
                  ? "Sudah Diselesaikan"
                  : `Dalam Proses (${completedItems.length}/${sampleTasks.length} butir terisi)`}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex justify-between items-center mb-1.5 text-[11px]">
              <span className="text-slate-500 font-medium">Progress Penyelesaian Checklist</span>
              <span className="font-bold text-slate-700">
                {Math.round((completedItems.length / sampleTasks.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  allDone ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{
                  width: `${(completedItems.length / sampleTasks.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Interactive Checklist Tasks Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 text-[11px]">
                Butir Checklist yang Perlu Diselesaikan:
              </span>
              {!allDone && (
                <button
                  type="button"
                  onClick={handleMarkAllComplete}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 cursor-pointer"
                >
                  Tandai Semua Selesai
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {sampleTasks.map((task, idx) => {
                const checked = completedItems.includes(idx);
                return (
                  <label
                    key={task.id || idx}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                      checked
                        ? "bg-emerald-50/40 border-emerald-200 text-slate-700"
                        : "bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTask(idx)}
                      className="mt-0.5 w-3.5 h-3.5 rounded accent-[#193f53] cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${checked ? "line-through text-slate-400" : "font-medium"}`}>
                        {task.question}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Alert Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/70 text-amber-800 text-xs leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Menonaktifkan jadwal tanpa menyelesaikan checklist akan mengakibatkan
              laporan audit menjadi tidak lengkap. Selesaikan seluruh butir di atas atau
              kunjungi halaman <strong>Template Checklist</strong>.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex flex-wrap justify-between items-center gap-2.5">
          <Link
            href="/template-checklist"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800"
          >
            <span>Buka Template Checklist</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Batal
            </button>

            {allDone ? (
              <button
                type="button"
                onClick={handleProceedDeactivate}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <span>Checklist Selesai, Lanjutkan Nonaktifkan</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleMarkAllComplete}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#193f53] hover:bg-[#123040] rounded-xl transition-all shadow-sm cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Selesaikan Checklist Sekarang</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

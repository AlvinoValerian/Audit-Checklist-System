"use client";

import React, { useState } from "react";
import { X, CalendarPlus, Clock, Store, Repeat, User, FileText } from "lucide-react";
import { AuditSchedule, RecurrenceType, ScheduleStatus } from "@/types/schedule";
import { toast } from "sonner";

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<AuditSchedule, "id">) => void;
}

const STORE_OPTIONS = [
  { name: "Cabang Sudirman", location: "Jakarta Pusat" },
  { name: "Cabang Thamrin", location: "Jakarta Pusat" },
  { name: "Cabang Kemang", location: "Jakarta Selatan" },
  { name: "Cabang Senayan", location: "Jakarta Pusat" },
  { name: "Cabang PIK", location: "Jakarta Utara" },
  { name: "Cabang Kelapa Gading", location: "Jakarta Utara" },
  { name: "Cabang Bintaro", location: "Tangerang Selatan" },
  { name: "Cabang Puri Indah", location: "Jakarta Barat" },
];

const TEMPLATE_OPTIONS = [
  "Checklist Operasional Harian",
  "Audit Display & Promosi",
  "Audit Kebersihan & K3",
  "Audit Stok & Inventori",
  "Audit Fasilitas & Keamanan",
  "Audit Kepatuhan Kasir & POS",
  "Inspeksi Cold Storage & Chiller",
];

const AUDITOR_OPTIONS = [
  "Hendra Wijaya",
  "Siti Rahmawati",
  "Budi Santoso",
  "Ahmad Fauzi",
  "Dewi Lestari",
];

export default function CreateScheduleModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateScheduleModalProps) {
  const [selectedStoreIndex, setSelectedStoreIndex] = useState(0);
  const [scheduleName, setScheduleName] = useState(TEMPLATE_OPTIONS[0]);
  const [auditorName, setAuditorName] = useState(AUDITOR_OPTIONS[0]);
  const [date, setDate] = useState("2023-09-04");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("Setiap Hari");
  const [notes, setNotes] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedStore = STORE_OPTIONS[selectedStoreIndex];

    onSubmit({
      storeName: selectedStore.name,
      storeLocation: selectedStore.location,
      scheduleName,
      auditorName,
      date,
      startTime,
      endTime,
      timeRange: `${startTime} - ${endTime}`,
      recurrence,
      status: "Terjadwal" as ScheduleStatus,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString().split("T")[0],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Buat Jadwal Audit Baru
              </h2>
              <p className="text-xs text-slate-500">
                Atur penugasan audit untuk cabang toko dan auditor operasional.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Toko Cabang */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Pilih Toko Cabang <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedStoreIndex}
                onChange={(e) => setSelectedStoreIndex(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all cursor-pointer"
              >
                {STORE_OPTIONS.map((store, idx) => (
                  <option key={store.name} value={idx}>
                    {store.name} — {store.location}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nama Jadwal / Template Checklist */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Template Checklist <span className="text-rose-500">*</span>
            </label>
            <select
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all cursor-pointer"
            >
              {TEMPLATE_OPTIONS.map((tpl) => (
                <option key={tpl} value={tpl}>
                  {tpl}
                </option>
              ))}
            </select>
          </div>

          {/* Grid: Auditor & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Auditor Ditugaskan
              </label>
              <select
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all cursor-pointer"
              >
                {AUDITOR_OPTIONS.map((auditor) => (
                  <option key={auditor} value={auditor}>
                    {auditor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Mulai <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all"
              />
            </div>
          </div>

          {/* Grid: Waktu & Pengulangan */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jam Mulai
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Jam Selesai
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Pengulangan
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] cursor-pointer"
              >
                <option value="Setiap Hari">Setiap Hari</option>
                <option value="Hari Tertentu">Hari Tertentu</option>
              </select>
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan Instruksi (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instruksi khusus kepada auditor cabang..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#193f53] hover:bg-[#123040] rounded-lg transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Simpan Jadwal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

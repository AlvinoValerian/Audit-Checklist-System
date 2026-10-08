"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, Clock, Store, Repeat, User } from "lucide-react";
import { AuditSchedule, RecurrenceType, ScheduleStatus } from "@/types/schedule";

interface EditScheduleModalProps {
  isOpen: boolean;
  schedule: AuditSchedule | null;
  onClose: () => void;
  onSubmit: (data: Partial<AuditSchedule>) => void;
}

const STATUS_OPTIONS: ScheduleStatus[] = ["Terjadwal", "Selesai", "Dibatalkan"];

export default function EditScheduleModal({
  isOpen,
  schedule,
  onClose,
  onSubmit,
}: EditScheduleModalProps) {
  const [storeName, setStoreName] = useState("");
  const [storeLocation, setStoreLocation] = useState("");
  const [scheduleName, setScheduleName] = useState("");
  const [auditorName, setAuditorName] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [recurrence, setRecurrence] = useState<RecurrenceType>("Setiap Hari");
  const [status, setStatus] = useState<ScheduleStatus>("Terjadwal");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (schedule && isOpen) {
      setStoreName(schedule.storeName);
      setStoreLocation(schedule.storeLocation);
      setScheduleName(schedule.scheduleName);
      setAuditorName(schedule.auditorName || "Hendra Wijaya");
      setDate(schedule.date);
      setStartTime(schedule.startTime || "09:00");
      setEndTime(schedule.endTime || "12:00");
      setRecurrence(schedule.recurrence);
      setStatus(schedule.status);
      setNotes(schedule.notes || "");
    }
  }, [schedule, isOpen]);

  if (!isOpen || !schedule) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSubmit({
      storeName,
      storeLocation,
      scheduleName,
      auditorName,
      date,
      startTime,
      endTime,
      timeRange: `${startTime} - ${endTime}`,
      recurrence,
      status,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Edit Jadwal Audit
              </h2>
              <p className="text-xs text-slate-500">
                Perbarui detail penugasan, waktu audit, atau status pelaksanaan.
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Cabang Toko
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Jadwal / Checklist
            </label>
            <input
              type="text"
              required
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Auditor
              </label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ScheduleStatus)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] cursor-pointer"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Catatan Instruksi
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] resize-none"
            />
          </div>

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
              <span>Perbarui Jadwal</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

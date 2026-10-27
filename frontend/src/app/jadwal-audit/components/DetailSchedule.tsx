"use client";

import React from "react";
import {
  X,
  Sparkles,
  Calendar,
  Store,
  FileCheck2,
  Clock,
  CalendarDays,
  Pencil,
} from "lucide-react";
import { AuditSchedule } from "@/types/schedule";

interface DetailScheduleProps {
  schedule: AuditSchedule;
  onBack: () => void;
  onSubmit?: (data: Partial<AuditSchedule>) => void;
  onEdit?: () => void;
}

const ALL_DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

const DAY_MAP_TO_SHORT: Record<string, string> = {
  Senin: "Sen",
  Selasa: "Sel",
  Rabu: "Rab",
  Kamis: "Kam",
  Jumat: "Jum",
  Sabtu: "Sab",
  Minggu: "Min",
  Sen: "Sen",
  Sel: "Sel",
  Rab: "Rab",
  Kam: "Kam",
  Jum: "Jum",
  Sab: "Sab",
  Min: "Min",
};

export default function DetailSchedule({
  schedule,
  onBack,
  onEdit,
}: DetailScheduleProps) {
  const stores = [
    {
      name: schedule.storeName,
      location: schedule.storeLocation || "Jakarta Pusat",
    },
  ];

  // Active days: use schedule selectedDays or all days for Setiap Hari
  const normalizedSelectedDays = (schedule.selectedDays || []).map(
    (d) => DAY_MAP_TO_SHORT[d] || d
  );

  const activeDays =
    normalizedSelectedDays.length > 0
      ? normalizedSelectedDays
      : schedule.recurrence === "Setiap Hari"
      ? ALL_DAYS
      : [];

  // Time formatting
  const startTime = schedule.startTime || "09:00";
  const endTime = schedule.endTime || "12:00";
  const timeDisplay = `${startTime} - ${endTime} WIB`;

  // Calculate duration
  const startHour = parseInt(startTime.split(":")[0], 10) || 9;
  const endHour = parseInt(endTime.split(":")[0], 10) || 12;
  const durationHours = Math.max(1, endHour - startHour);

  // Notes
  const displayNotes =
    schedule.notes ||
    "Fokus inspeksi pada display rak depan, kebersihan area kasir, dan kesesuaian label harga promo.";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onBack();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-detail-title"
        className="w-full max-w-[500px] bg-white h-full flex flex-col shadow-2xl border-l border-slate-100 z-50 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-sky-600 font-bold text-[11px] tracking-wider uppercase">
              <Sparkles className="w-3.5 h-3.5 fill-sky-600" />
              <span>DETAIL JADWAL</span>
            </div>
            <button
              type="button"
              onClick={onBack}
              className="w-8 h-8 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Tutup"
              aria-label="Tutup detail jadwal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h2
            id="schedule-detail-title"
            className="text-xl font-bold text-slate-900 mt-2 tracking-tight"
          >
            Detail Jadwal Audit
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Rincian lengkap informasi jadwal, cakupan toko cabang, template audit, serta
            jadwal pelaksanaan.
          </p>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 bg-white">
          {/* 1. NAMA JADWAL */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              NAMA JADWAL
            </span>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-xs flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <p className="text-sm font-bold text-slate-900 truncate">
                {schedule.scheduleName}
              </p>
            </div>
          </div>

          {/* 2. TOKO / CABANG */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                TOKO / CABANG
              </span>
              <span className="text-xs font-semibold text-sky-600">
                Cabang Toko
              </span>
            </div>

            {/* Vertical Scroller (Pill Rounded) */}
            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {stores.map((store, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-3.5 py-2 rounded-full bg-slate-50 border border-slate-200/90 hover:bg-slate-100/70 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <Store className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-normal text-slate-800 truncate">
                      {store.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal shrink-0 ml-2">
                    {store.location}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. TEMPLATE CHECKLIST */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              TEMPLATE CHECKLIST
            </span>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-xs flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 mt-0.5">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 leading-snug">
                  {schedule.scheduleName.includes("Checklist")
                    ? `${schedule.scheduleName} (18 Butir)`
                    : `Checklist Operasional Harian (18 Butir)`}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Kebersihan, display produk, kepatuhan kasir, dan standar keamanan.
                </p>
              </div>
            </div>
          </div>

          {/* 4. WAKTU PELAKSANAAN */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              WAKTU PELAKSANAAN
            </span>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200/60 text-slate-500 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {timeDisplay}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Waktu Indonesia Barat
                  </p>
                </div>
              </div>
              <div className="px-3 py-1 bg-sky-50 text-sky-600 border border-sky-100 rounded-full text-[11px] font-semibold shrink-0">
                Durasi: {durationHours} jam
              </div>
            </div>
          </div>

          {/* 5. PENGULANGAN JADWAL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                PENGULANGAN JADWAL
              </span>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-sky-600">
                <CalendarDays className="w-3.5 h-3.5" />
                <span>{schedule.recurrence}</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400 mb-2">
              Hari audit mingguan yang aktif:
            </p>

            <div className="flex items-center justify-between gap-2">
              {ALL_DAYS.map((day) => {
                const isActive = activeDays.includes(day);
                return (
                  <div
                    key={day}
                    className={`flex-1 py-2 rounded-xl text-xs flex items-center justify-center transition-all ${
                      isActive
                        ? "bg-[#193f53] text-white font-bold shadow-xs"
                        : "bg-white border border-slate-200/80 text-slate-400 font-medium"
                    }`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 6. CATATAN / INSTRUKSI KHUSUS */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              CATATAN / INSTRUKSI KHUSUS
            </span>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-xs">
              <p className="text-xs text-slate-600 leading-relaxed">
                {displayNotes}
              </p>
            </div>
          </div>

          {/* 7. INFORMASI SISTEM & RIWAYAT */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
              INFORMASI SISTEM & RIWAYAT
            </span>
            <div className="p-3.5 rounded-xl border border-slate-100 bg-white shadow-xs space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Dibuat oleh</span>
                <span className="font-bold text-slate-800">
                  {schedule.auditorName
                    ? `${schedule.auditorName} (Auditor)`
                    : "Admin Utama (Head Auditor)"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Terakhir Diperbarui</span>
                <span className="font-bold text-slate-800">
                  {new Date().toLocaleDateString("id-ID", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}, 16:45 WIB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="px-5 py-2.5 rounded-xl bg-[#193f53] hover:bg-[#123040] text-xs font-semibold text-white flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Jadwal</span>
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
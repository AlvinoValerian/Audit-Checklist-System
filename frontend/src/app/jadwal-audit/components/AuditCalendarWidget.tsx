"use client";

import React, { useState } from "react";
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
} from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { AuditSchedule } from "@/types/schedule";

interface AuditCalendarWidgetProps {
  schedules: AuditSchedule[];
  selectedDate: Date | null;
  isExpanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelectDate: (date: Date | null) => void;
}

export default function AuditCalendarWidget({
  schedules,
  selectedDate,
  isExpanded,
  onExpandedChange,
  onSelectDate,
}: AuditCalendarWidgetProps) {
  // Default dynamically to the current real-time month and date
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Generate every week needed to show the full month.
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday = Min
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  // Aggregate schedule counts
  const totalScheduled = schedules.filter((s) => s.status === "Terjadwal").length;
  const totalCompleted = schedules.filter((s) => s.status === "Selesai").length;
  const totalCancelled = schedules.filter((s) => s.status === "Dibatalkan").length;

  return (
    <div
      className={`shrink-0 bg-[#fefdfa] rounded-xl border border-slate-200 shadow-xs flex flex-col relative overflow-hidden transition-all duration-500 ease-in-out ${
        isExpanded
          ? "w-full lg:w-[340px] xl:w-[380px] max-h-[500px]"
          : "w-12 h-12 cursor-pointer hover:bg-slate-50 hover:border-blue-200"
      }`}
    >
      {isExpanded ? (
        <div className="flex flex-col w-full p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
              <h3 className="text-[13px] font-bold text-slate-900 capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: id })}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Bulan sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-6 h-6 flex items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
                title="Bulan selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onExpandedChange(false)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Sembunyikan kalender"
                aria-label="Sembunyikan kalender"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-y-3 text-center mb-6">
            {weekDayLabels.map((day) => (
              <div key={day} className="text-[11px] font-medium text-slate-700 py-0.5">
                {day}
              </div>
            ))}

            {allDays.map((day, idx) => {
              const isCurrentMonthDay = isSameMonth(day, currentMonth);
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              const dayStr = format(day, "yyyy-MM-dd");
              const daySchedules = schedules.filter((s) => s.date === dayStr);
              const hasScheduled = daySchedules.some((s) => s.status === "Terjadwal");
              const hasCompleted = daySchedules.some((s) => s.status === "Selesai");
              const hasCancelled = daySchedules.some((s) => s.status === "Dibatalkan");

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectDate(isSelected ? null : day)}
                  className={`relative flex flex-col items-center justify-center w-8 h-8 mx-auto rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#193f53] text-white font-bold"
                      : isCurrentMonthDay
                      ? "text-slate-800 hover:bg-slate-100"
                      : "text-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span>{format(day, "d")}</span>
                  {!isSelected && (
                    <div className="absolute bottom-0.5 flex gap-0.5 items-center">
                      {hasCompleted && <span className="w-1 h-1 rounded-full bg-emerald-500" />}
                      {hasScheduled && <span className="w-1 h-1 rounded-full bg-sky-500" />}
                      {hasCancelled && <span className="w-1 h-1 rounded-full bg-rose-500" />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-[10px] font-medium text-slate-600">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
              {totalScheduled} Terjadwal
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              {totalCompleted} Selesai
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              {totalCancelled} Batal
            </span>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onExpandedChange(true)}
          className="absolute inset-0 flex items-center justify-center text-blue-600 cursor-pointer"
          title="Tampilkan kalender"
          aria-label="Tampilkan kalender"
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
        </button>
      )}
    </div>
  );
}

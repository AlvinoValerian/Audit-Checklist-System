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
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { AuditSchedule } from "@/types/schedule";

interface AuditCalendarWidgetProps {
  schedules: AuditSchedule[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

export default function AuditCalendarWidget({
  schedules,
  selectedDate,
  onSelectDate,
}: AuditCalendarWidgetProps) {
  // Default to September 2023 matching mockup or current date
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date(2023, 8, 1)); // Sept 2023

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Generate days in calendar grid (taking 2 active weeks or month)
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday = Min
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const allDays = eachDayOfInterval({ start: startDate, end: endDate });
  // Slice to the top 2 rows (14 days) to keep the widget compact like in the mockup card
  const visibleDays = allDays.slice(0, 14);

  const weekDayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

  // Aggregate schedule counts
  const totalScheduled = schedules.filter((s) => s.status === "Terjadwal").length;
  const totalCompleted = schedules.filter((s) => s.status === "Selesai").length;
  const totalCancelled = schedules.filter((s) => s.status === "Dibatalkan").length;

  return (
    <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col">
      {/* Header: Month Name + Nav Buttons */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-sky-600 shrink-0" />
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 tracking-tight capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: id })}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Bulan sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
            title="Bulan selanjutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Names */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDayLabels.map((day) => (
          <div
            key={day}
            className="text-[10px] font-semibold text-slate-400 uppercase py-0.5"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center my-1">
        {visibleDays.map((day, idx) => {
          const isCurrentMonthDay = isSameMonth(day, currentMonth);
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

          // Day status indicators
          const dayStr = format(day, "yyyy-MM-dd");
          const daySchedules = schedules.filter((s) => s.date === dayStr);
          const hasScheduled = daySchedules.some((s) => s.status === "Terjadwal");
          const hasCompleted = daySchedules.some((s) => s.status === "Selesai");
          const hasCancelled = daySchedules.some((s) => s.status === "Dibatalkan");

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (isSelected) {
                  onSelectDate(null); // Clear filter
                } else {
                  onSelectDate(day);
                }
              }}
              className={`relative flex flex-col items-center justify-center w-7 h-7 mx-auto rounded-full text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "bg-[#193f53] text-white shadow-2xs font-bold"
                  : isCurrentMonthDay
                  ? "text-slate-700 hover:bg-slate-100"
                  : "text-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>{format(day, "d")}</span>

              {/* Status Dot under date */}
              {!isSelected && (
                <div className="absolute bottom-0.5 flex gap-0.5 items-center">
                  {hasCompleted && (
                    <span className="w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                  {hasScheduled && (
                    <span className="w-1 h-1 rounded-full bg-sky-500" />
                  )}
                  {hasCancelled && (
                    <span className="w-1 h-1 rounded-full bg-rose-500" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/*Footer */}
      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        <span className="inline-flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
          <span>{totalScheduled} Terjadwal</span>
        </span>
        <span className="inline-flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span>{totalCompleted} Selesai</span>
        </span>
        <span className="inline-flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
          <span>{totalCancelled} Batal</span>
        </span>
      </div>
    </div>
  );
}

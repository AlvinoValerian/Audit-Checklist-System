"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
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
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentMonth(new Date());
  }, []);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentMonth) {
      setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    }
  };

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const cYear = currentMonth ? currentMonth.getFullYear() : 2024;
  const cMonth = currentMonth ? currentMonth.getMonth() : 7;

  const firstDay = new Date(cYear, cMonth, 1).getDay();
  const daysInMonth = new Date(cYear, cMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(cYear, cMonth, 0).getDate();

  const prevMonthDays = Array.from({ length: firstDay }).map((_, i) => daysInPrevMonth - firstDay + 1 + i);
  const currentMonthDays = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

  // Helper to check if a date has audit schedules
  const getScheduleStatus = (day: number) => {
    const checkDateStr = `${cYear}-${String(cMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const daySchedules = schedules.filter((s) => s.date === checkDateStr);

    if (daySchedules.length === 0) return null;

    // Priority: Terjadwal (purple) > Dibatalkan (rose) > Selesai (emerald)
    if (daySchedules.some((s) => s.status === "Terjadwal")) return "bg-purple-500";
    if (daySchedules.some((s) => s.status === "Dibatalkan")) return "bg-rose-500";
    return "bg-emerald-500";
  };

  // Aggregate schedule counts
  const totalScheduled = schedules.filter((s) => s.status === "Terjadwal").length;
  const totalCancelled = schedules.filter((s) => s.status === "Dibatalkan").length;

  return (
    <div
      suppressHydrationWarning
      className={`shrink-0 bg-[#fefdfa] rounded-xl border border-slate-200 shadow-xs flex flex-col relative overflow-hidden transition-all duration-500 ease-in-out ${
        isExpanded
          ? "max-w-[400px] max-h-[500px] opacity-100"
          : "max-w-[48px] max-h-[48px] opacity-100 cursor-pointer hover:bg-slate-50 hover:border-blue-200"
      }`}
      onClick={() => !isExpanded && onExpandedChange(true)}
      title={!isExpanded ? "Tampilkan Kalender" : undefined}
      style={{
        width: isExpanded
          ? typeof window !== "undefined" && window.innerWidth >= 1280
            ? "380px"
            : typeof window !== "undefined" && window.innerWidth >= 1024
            ? "340px"
            : "100%"
          : "48px",
        height: isExpanded ? "auto" : "48px",
      }}
    >
      {/* Icon State (Visible only when collapsed) */}
      <div
        className={`absolute inset-0 flex items-center justify-center text-blue-600 transition-opacity duration-300 ${
          isExpanded ? "opacity-0 pointer-events-none" : "opacity-100 delay-200"
        }`}
      >
        <CalendarIcon className="w-5 h-5" />
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 border border-white"></div>
      </div>

      {/* Full Calendar State (Visible only when expanded) */}
      <div
        className={`flex flex-col h-full w-[340px] xl:w-[380px] p-5 transition-opacity duration-300 ${
          isExpanded ? "opacity-100 delay-200" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <h3 className="text-[13px] font-bold text-slate-900 whitespace-nowrap">
              {monthNames[cMonth]} {cYear}
            </h3>
          </div>
          <div className="flex gap-1.5 items-center">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 transition-colors cursor-pointer mr-1"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpandedChange(false);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent"
              title="Sembunyikan Kalender"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-y-3 text-center mb-6">
          {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
            <div key={day} className="text-[11px] font-medium text-slate-700">
              {day}
            </div>
          ))}

          {/* Previous month days */}
          {prevMonthDays.map((day, i) => (
            <div key={`prev-${i}`} className="text-[11px] font-medium text-slate-300">
              {day}
            </div>
          ))}

          {/* Current month days */}
          {currentMonthDays.map((day) => {
            const dotColor = getScheduleStatus(day);
            const checkDateStr = `${cYear}-${String(cMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = selectedDate ? format(selectedDate, "yyyy-MM-dd") === checkDateStr : false;

            return (
              <div
                key={`curr-${day}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDate(isSelected ? null : new Date(cYear, cMonth, day));
                }}
                className={`text-[11px] font-medium relative flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  isSelected
                    ? "text-[#193f53] font-bold"
                    : "text-slate-800 hover:text-blue-600"
                }`}
              >
                {day}
                {isSelected && (
                  <div className="absolute -bottom-1.5 w-3 h-0.5 bg-[#193f53] rounded-full"></div>
                )}
                {!isSelected && dotColor && (
                  <div className={`absolute -bottom-2 w-1 h-1 rounded-full ${dotColor}`}></div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-around text-[10px] font-medium text-slate-600 border-t border-slate-100 pt-4 mt-auto px-4">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></div> {totalScheduled} Terjadwal
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div> {totalCancelled} Dibatalkan
          </div>
        </div>
      </div>
    </div>
  );
}

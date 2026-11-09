import React, { useState, useEffect } from "react";
import { X, Store, Calendar, Clock, Info, Pencil, Loader2 } from "lucide-react";
import { Holiday, HolidayStatus } from "@/types/holiday";
import { ScheduleService } from "@/services/schedule.service";
import { AuditSchedule } from "@/types/schedule";

interface DetailHolidayModalProps {
  isOpen: boolean;
  holiday: Holiday | null;
  onClose: () => void;
  onEdit: () => void; 
}

export default function DetailHolidayModal({ isOpen, holiday, onClose, onEdit }: DetailHolidayModalProps) {
  const [storeSchedules, setStoreSchedules] = useState<AuditSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (holiday && isOpen) {
      setIsLoading(true);
      ScheduleService.fetchAll(holiday.workspaceId)
        .then((res) => {
          if (Array.isArray(res)) {
            setStoreSchedules(res.filter((s) => s.storeName === holiday.storeName && s.status !== "Dibatalkan"));
          }
        })
        .catch((e) => console.warn("Gagal memuat jadwal toko:", e))
        .finally(() => setIsLoading(false));
    }
  }, [holiday, isOpen]);

  if (!isOpen || !holiday) return null;

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formattedPeriod = holiday.startDate === holiday.endDate 
    ? formatDate(holiday.startDate)
    : `${formatDate(holiday.startDate)} - ${formatDate(holiday.endDate)}`;

  const isScheduleActiveOnDayName = (schedule: AuditSchedule, dayName: string): boolean => {
    if (schedule.recurrence === "Setiap Hari" || (schedule as any).repeat_time === "daily") {
      if (!schedule.selectedDays || schedule.selectedDays.length === 0 || schedule.selectedDays.length >= 7) {
        return true;
      }
      return schedule.selectedDays.includes(dayName);
    }
    if (Array.isArray(schedule.selectedDays) && schedule.selectedDays.length > 0) {
      return schedule.selectedDays.includes(dayName);
    }
    if (typeof (schedule as any).selectedDays === "string") {
      const arr = ((schedule as any).selectedDays as string).split(",").map((d) => d.trim()).filter(Boolean);
      if (arr.length > 0) return arr.includes(dayName);
    }
    return true;
  };

  const isScheduleActiveInRange = (schedule: AuditSchedule, startStr?: string, endStr?: string): boolean => {
    if (!startStr) return true;
    const eStr = endStr || startStr;
    const startParts = startStr.split("-").map(Number);
    const endParts = eStr.split("-").map(Number);
    const curr = new Date(startParts[0], startParts[1] - 1, startParts[2]);
    const end = new Date(endParts[0], endParts[1] - 1, endParts[2]);
    if (isNaN(curr.getTime()) || isNaN(end.getTime())) return true;

    const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const daysInRange = new Set<string>();
    let safety = 0;
    while (curr <= end && safety < 366) {
      daysInRange.add(dayNames[curr.getDay()]);
      curr.setDate(curr.getDate() + 1);
      safety++;
    }

    return Array.from(daysInRange).some((dayName) => isScheduleActiveOnDayName(schedule, dayName));
  };

  const matchingSchedules = storeSchedules.filter((s) => {
    if (!holiday.startDate) return true;
    return isScheduleActiveInRange(s, holiday.startDate, holiday.endDate);
  });

  const totalJadwal = matchingSchedules.length;
  const isFullLibur = holiday.liburType === "full" || !holiday.liburType;
  const diliburkanCount = isFullLibur
    ? totalJadwal
    : matchingSchedules.filter((s) => holiday.schedules?.includes(s.id)).length;
  const berjalanCount = Math.max(0, totalJadwal - diliburkanCount);

  const getStatusColor = (status: HolidayStatus) => {
    if (status === "Terjadwal") return { bg: "bg-purple-50 text-purple-700", dot: "bg-purple-600" };
    if (status === "Selesai") return { bg: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-600" };
    return { bg: "bg-rose-50 text-rose-700", dot: "bg-rose-600" };
  };
  const colors = getStatusColor(holiday.status);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
        onClick={onClose}
      ></div>
      
      <div className="bg-white rounded-2xl w-full max-w-2xl relative flex flex-col max-h-[90vh] shadow-2xl">
        {/* Header Section */}
        <div className="p-6 pb-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex gap-2">
              <div className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-[11px] font-bold">
                {holiday.liburType === "partial" ? "Libur Sebagian (Partial)" : "Libur Toko Penuh (Full)"}
              </div>
              <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 ${colors.bg}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></div>
                {holiday.status}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <h2 className="text-xl font-bold text-slate-900 mb-1">Detail Libur Toko & Pengecualian</h2>
          <p className="text-xs text-slate-500">Informasi lengkap penetapan hari libur operasional dan status jadwal audit cabang.</p>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {/* Main Info Card */}
          <div className="border border-slate-200 rounded-xl p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Toko</div>
                  <div className="text-sm font-bold text-slate-900">{holiday.storeName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{holiday.storeLocation}</div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Periode Libur</div>
                  <div className="text-sm font-bold text-slate-900">{formattedPeriod}</div>
                  <div className="text-xs text-slate-500 mt-0.5">(Durasi: {holiday.durationDays} Hari Operasional)</div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-slate-100">
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alasan Penetapan Libur</div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium break-words max-h-28 overflow-y-auto pr-1">{holiday.reason}</p>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Dibuat Oleh</div>
                <div className="text-xs font-bold text-slate-900 flex items-baseline gap-1">
                  {holiday.createdBy} <span className="font-normal text-slate-500">({holiday.creatorRole})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Impact Summary */}
          <div className="mb-6">
            <div className="flex justify-between items-end mb-3">
              <h3 className="text-sm font-bold text-slate-900">Ringkasan Dampak Jadwal Toko</h3>
              <div className="text-[11px] text-slate-500">Periode {formattedPeriod}</div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="border border-slate-200 rounded-xl p-4 text-center">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Total Jadwal di Toko</div>
                <div className="text-2xl font-extrabold text-slate-900">{totalJadwal}</div>
              </div>
              <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 text-center">
                <div className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-2">Jadwal Diliburkan</div>
                <div className="text-2xl font-extrabold text-red-600">{diliburkanCount} Libur</div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 text-center">
                <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-2">Tetap Berjalan</div>
                <div className="text-2xl font-extrabold text-emerald-600">{berjalanCount} Berjalan</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50/50 border border-blue-100 rounded-lg">
              <Info className="w-4 h-4 text-blue-500 shrink-0" />
              <p className="text-[11px] text-blue-700 font-medium">
                {holiday.liburType === "partial" 
                  ? "Sebagian jadwal audit dinonaktifkan sesuai pengecualian yang diatur." 
                  : "Semua aktivitas jadwal audit di cabang ini dinonaktifkan sementara selama periode libur."}
              </p>
            </div>
          </div>

          {/* Schedule Status List */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Status Jadwal Audit di Toko Ini</h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-6 text-center flex items-center justify-center gap-2 text-slate-500 text-xs font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-[#193f53]" />
                  <span>Memuat jadwal toko...</span>
                </div>
              ) : matchingSchedules.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  Tidak ada jadwal audit pada hari operasional periode libur ini.
                </div>
              ) : (
                matchingSchedules.map((schedule) => {
                  const isLibur = isFullLibur || holiday.schedules?.includes(schedule.id);
                  return (
                    <div key={schedule.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                          <Clock className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{schedule.scheduleName}</div>
                          <div className="text-[11px] text-slate-500">Waktu: {schedule.timeRange}</div>
                        </div>
                      </div>
                      {isLibur ? (
                        <div className="px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-600 text-[10px] font-bold">
                          Libur
                        </div>
                      ) : (
                        <div className="px-3 py-1 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                          Berjalan
                        </div>
                      )}
                    </div>
                  );
                })
              )}  
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex justify-end items-center gap-3 bg-slate-50 rounded-b-2xl shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tutup
          </button>
          {holiday.status !== "Selesai" && holiday.status !== "Dibatalkan" && (
            <button 
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#193f53] hover:bg-[#143343] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Libur Toko
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

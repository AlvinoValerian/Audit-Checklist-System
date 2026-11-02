import React, { useState, useEffect } from "react";  
import { X, RotateCcw, CalendarDays, Info, Loader2, AlertTriangle } from "lucide-react";
import { Holiday } from "@/types/holiday";

interface RestoreHolidayModalProps {
  isOpen: boolean;
  holiday: Holiday | null;
  conflictHoliday?: Holiday | null;
  onClose: () => void;
  onConfirm: () => void; 
  isSubmitting?: boolean;
}

export default function RestoreHolidayModal({
  isOpen,
  holiday,
  conflictHoliday,
  onClose,
  onConfirm,
  isSubmitting = false,
}: RestoreHolidayModalProps) {
  const [isInternalSubmitting, setIsInternalSubmitting] = useState(false);
  const isLoading = isSubmitting || isInternalSubmitting;

  useEffect(() => {
    if (!isOpen) {
      setIsInternalSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen || !holiday) return null;

  const handleConfirm = async () => {
    if (conflictHoliday) return;
    setIsInternalSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setIsInternalSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const formattedPeriod = holiday.startDate === holiday.endDate 
    ? formatDate(holiday.startDate)
    : `${formatDate(holiday.startDate)} - ${formatDate(holiday.endDate)}`;

  const diliburkanCount = holiday.liburType === "full" || !holiday.liburType 
    ? 4 
    : (holiday.schedules?.length || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
        onClick={isSubmitting ? undefined : onClose}
      ></div>
      
      <div className="bg-white rounded-2xl w-full max-w-lg relative flex flex-col max-h-[90vh] shadow-2xl overflow-hidden my-auto">
        <div className="p-6 pb-4 overflow-y-auto flex-1">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex gap-4 items-start mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
              <RotateCcw className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-slate-900">Konfirmasi Pengaktifan Kembali</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-extrabold uppercase tracking-wider">Restore</span>
              </div>
              <p className="text-xs text-slate-500">Pemulihan penetapan libur operasional cabang toko yang dibatalkan.</p>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed mb-6">
            Apakah Anda yakin ingin memulihkan penetapan libur untuk toko <span className="font-bold text-slate-900">{holiday.storeName}</span>? Jadwal audit akan kembali dinonaktifkan/diliburkan sesuai dengan pengaturan berikut.
          </p>

          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-[120px_1fr] gap-y-3 text-xs">
              <div className="text-slate-500 font-medium">Nama Toko:</div>
              <div className="font-bold text-slate-900 flex items-center gap-1">
                {holiday.storeName} <span className="font-normal text-slate-500 text-[11px]">({holiday.storeLocation})</span>
              </div>
              
              <div className="text-slate-500 font-medium">Periode Libur:</div>
              <div className="font-bold text-slate-900">{formattedPeriod} <span className="font-normal text-slate-500 text-[11px]">({holiday.durationDays} Hari)</span></div>
              
              <div className="text-slate-500 font-medium">Tipe Libur:</div>
              <div className="font-bold text-slate-900">{holiday.liburType === "partial" ? "Libur Sebagian (Partial)" : "Libur Toko Penuh (Full)"}</div>
              
              <div className="text-slate-500 font-medium pt-0.5">Alasan:</div>
              <div className="font-bold text-slate-900 break-words max-h-24 overflow-y-auto pr-1">
                {holiday.reason}
              </div>
              
              <div className="text-slate-500 font-medium mt-1">Dampak Jadwal:</div>
              <div className="font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
                <CalendarDays className="w-4 h-4" /> {diliburkanCount} Jadwal Audit akan kembali diliburkan
              </div>
            </div>
          </div>

          {/* Peringatan Bentrok / Tabrakan Jadwal Libur */}
          {conflictHoliday ? (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-4 text-red-900 animate-in fade-in">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold mb-1 text-red-800">
                  Tidak Dapat Diaktifkan Kembali (Bentrok Jadwal)
                </h4>
                <p className="text-xs text-red-700 leading-relaxed">
                  Cabang <span className="font-semibold">{conflictHoliday.storeName}</span> sudah memiliki jadwal libur aktif pada rentang tanggal{" "}
                  <span className="font-semibold">
                    {conflictHoliday.startDate === conflictHoliday.endDate
                      ? formatDate(conflictHoliday.startDate)
                      : `${formatDate(conflictHoliday.startDate)} - ${formatDate(conflictHoliday.endDate)}`}
                  </span>{" "}
                  ({conflictHoliday.liburType === "partial" ? "Libur Sebagian" : "Libur Penuh"}: &quot;{conflictHoliday.reason}&quot;).
                </p>
                <p className="text-[11px] text-red-600 mt-2 font-medium">
                  Harap batalkan atau ubah libur aktif tersebut terlebih dahulu sebelum mengaktifkan kembali jadwal ini agar tidak terjadi tumpang tindih (dobel libur).
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-4 bg-blue-50/80 border border-blue-200 rounded-xl">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Setelah dipulihkan, status jadwal akan kembali menjadi <span className="font-bold">Terjadwal</span> dan memengaruhi kalender audit cabang.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end items-center gap-3 bg-slate-50 rounded-b-2xl shrink-0">
          <button 
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button 
            type="button"
            onClick={handleConfirm}
            disabled={isLoading || Boolean(conflictHoliday)}
            title={conflictHoliday ? "Tidak dapat mengaktifkan: Bertabrakan dengan libur aktif lain" : undefined}
            className={`flex items-center gap-2 px-5 py-2.5 font-semibold text-xs rounded-lg transition-colors shadow-sm ${
              conflictHoliday
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white cursor-pointer"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memulihkan...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>{conflictHoliday ? "Jadwal Bertabrakan" : "Ya, Aktifkan Kembali"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Search, Filter, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Store, X } from "lucide-react";
import { HolidayService } from "@/services/holiday.service";
import { Holiday, HolidayStatus } from "@/types/holiday";
import { toast } from "sonner";
import CreateHolidayView from "./components/CreateHolidayView";
import DetailHolidayModal from "./components/DetailHolidayModal";
import SoftDeleteModal from "./components/SoftDeleteModal";
import RestoreHolidayModal from "./components/RestoreHolidayModal";
import ActionButtons from "@/components/ui/ActionButtons";

export default function LiburTokoPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, cancelled: 0 });

  const [isCreatingView, setIsCreatingView] = useState(false);
  const [selectedHolidayToEdit, setSelectedHolidayToEdit] = useState<Holiday | null>(null);

  // View Modal States
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedHolidayToView, setSelectedHolidayToView] = useState<Holiday | null>(null);

  // Soft Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetHoliday, setDeleteTargetHoliday] = useState<Holiday | null>(null);

  // Restore Modal States
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreTargetHoliday, setRestoreTargetHoliday] = useState<Holiday | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | "Terjadwal" | "Selesai" | "Dibatalkan">("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const refreshData = () => {
    const list = HolidayService.getAll();
    const now = new Date();
    
    // Sembunyikan jadwal (Selesai/Dibatalkan) yang sudah terlewat lebih dari 15 hari
    const filteredList = list.filter(holiday => {
      if (holiday.status === "Selesai" || holiday.status === "Dibatalkan") {
        const endDate = new Date(holiday.endDate);
        const diffTime = now.getTime() - endDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 15) {
          return false;
        }
      }
      return true;
    });

    setHolidays(filteredList);
    setStats(HolidayService.getStats(filteredList));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const getStatusColor = (status: HolidayStatus) => {
    if (status === "Terjadwal") return { bg: "bg-purple-50 border-purple-200 text-purple-700", dot: "bg-purple-600" };
    if (status === "Selesai") return { bg: "bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]", dot: "bg-[#10b981]" };
    return { bg: "bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]", dot: "bg-[#ef4444]" };
  };

  const formatDuration = (start: string, end: string, days: number) => {
    const s = new Date(start);
    const e = new Date(end);
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };

    if (start === end) {
      return `${s.toLocaleDateString('id-ID', { ...options, year: 'numeric' })} (1 Hari)`;
    }

    const startStr = s.toLocaleDateString('id-ID', options);
    const endStr = e.toLocaleDateString('id-ID', { ...options, year: 'numeric' });
    return `${startStr} - ${endStr} (${days} Hari)`;
  };

  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setCurrentMonth(new Date());
    setIsMounted(true);
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

  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  
  const cYear = currentMonth ? currentMonth.getFullYear() : 2024;
  const cMonth = currentMonth ? currentMonth.getMonth() : 7;
  
  const firstDay = new Date(cYear, cMonth, 1).getDay();
  const daysInMonth = new Date(cYear, cMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(cYear, cMonth, 0).getDate();
  
  const prevMonthDays = Array.from({ length: firstDay }).map((_, i) => daysInPrevMonth - firstDay + 1 + i);
  const currentMonthDays = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

  // Helper to check if a date has holidays
  const getHolidayStatus = (day: number) => {
    const checkDateStr = `${cYear}-${String(cMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayHolidays = holidays.filter(h => {
      const hEnd = h.endDate || h.startDate;
      return checkDateStr >= h.startDate && checkDateStr <= hEnd;
    });
    
    if (dayHolidays.length === 0) return null;
    
    // Priority: Terjadwal (purple) > Dibatalkan (rose) > Selesai (emerald)
    if (dayHolidays.some(h => h.status === "Terjadwal")) return "bg-purple-500";
    if (dayHolidays.some(h => h.status === "Dibatalkan")) return "bg-rose-500";
    return "bg-emerald-500";
  };

  return (
    <DashboardLayout>
      {isCreatingView ? (
        <CreateHolidayView 
          initialData={selectedHolidayToEdit}
          onBack={() => {
            setIsCreatingView(false);
            setSelectedHolidayToEdit(null);
          }} 
          onSave={(data) => { 
            if (selectedHolidayToEdit) {
              HolidayService.update(selectedHolidayToEdit.id, data);
              toast.success(`Jadwal libur untuk ${data.storeName} berhasil diperbarui!`);
            } else {
              HolidayService.create(data); 
              toast.success(`Jadwal libur untuk ${data.storeName} berhasil ditambahkan!`); 
            }
            setIsCreatingView(false); 
            setSelectedHolidayToEdit(null);
            refreshData(); 
          }} 
        />
      ) : (
        <>
          <Header
            title="Libur Toko & Pengecualian"
            subtitle="Kelola dan pantau jadwal operasional khusus dan hari libur untuk semua cabang toko."
          />

      {/* Stats and Calendar Section */}
      <div className="flex flex-col lg:flex-row gap-5 mb-8 items-start">
        {/* Metric Cards (Left Side) */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-5 transition-all duration-500 ease-in-out">
          {/* Card 1 */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">TOTAL LIBUR</h3>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">{stats.total}</div>
              <p className="text-xs text-emerald-500 mt-1">Semua libur tercatat</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">LIBUR AKTIF</h3>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">{stats.active}</div>
              <div className="flex items-center gap-1 mt-1 text-purple-600 text-xs font-medium">
                {stats.total > 0 ? `${Math.round((stats.active / stats.total) * 100)}% dari total` : "0% dari total"}
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">DIBATALKAN</h3>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">{stats.cancelled}</div>
              <p className="text-xs text-red-500 mt-1">Dibatalkan tercatat</p>
            </div>
          </div>
        </div>

        {/* Calendar Widget (Right Side) */}
        <div 
          suppressHydrationWarning
          className={`shrink-0 bg-[#fefdfa] rounded-xl border border-slate-200 shadow-xs flex flex-col relative overflow-hidden transition-all duration-500 ease-in-out ${
            isCalendarExpanded ? 'max-w-[400px] max-h-[500px] opacity-100' : 'max-w-[48px] max-h-[48px] opacity-100 cursor-pointer hover:bg-slate-50 hover:border-blue-200'
          }`}
          onClick={() => !isCalendarExpanded && setIsCalendarExpanded(true)}
          title={!isCalendarExpanded ? "Tampilkan Kalender" : undefined}
          style={{ 
            width: isCalendarExpanded ? (typeof window !== 'undefined' && window.innerWidth >= 1280 ? '380px' : window.innerWidth >= 1024 ? '340px' : '100%') : '48px',
            height: isCalendarExpanded ? 'auto' : '48px'
          }}
        >
          {/* Icon State (Visible only when collapsed) */}
          <div className={`absolute inset-0 flex items-center justify-center text-blue-600 transition-opacity duration-300 ${isCalendarExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100 delay-200'}`}>
            <CalendarIcon className="w-5 h-5" />
            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-emerald-500 border border-white"></div>
          </div>

          {/* Full Calendar State (Visible only when expanded) */}
          <div className={`flex flex-col h-full w-[340px] xl:w-[380px] p-5 transition-opacity duration-300 ${isCalendarExpanded ? 'opacity-100 delay-200' : 'opacity-0 pointer-events-none'}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-[13px] font-bold text-slate-900 whitespace-nowrap">{monthNames[cMonth]} {cYear}</h3>
              </div>
              <div className="flex gap-1.5 items-center">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={handleNextMonth}
                  className="p-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 transition-colors cursor-pointer mr-1"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCalendarExpanded(false);
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
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((day) => (
                <div key={day} className="text-[11px] font-medium text-slate-700">{day}</div>
              ))}

              {/* Previous month days */}
              {prevMonthDays.map((day, i) => (
                <div key={`prev-${i}`} className="text-[11px] font-medium text-slate-300">{day}</div>
              ))}

              {/* Current month days */}
              {currentMonthDays.map((day) => {
                const dotColor = getHolidayStatus(day);
                return (
                  <div key={`curr-${day}`} className="text-[11px] font-medium text-slate-800 relative flex flex-col items-center justify-center">
                    {day}
                    {dotColor && <div className={`absolute -bottom-2 w-1 h-1 rounded-full ${dotColor}`}></div>}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-around text-[10px] font-medium text-slate-600 border-t border-slate-100 pt-4 mt-auto px-4">
              <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></div> {stats.active} Terjadwal</div>
              <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div> {stats.cancelled} Dibatalkan</div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari toko"
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-2 px-3.5 py-2 bg-white border ${filterStatus !== "Semua" ? "border-blue-500 text-blue-600" : "border-slate-200 text-slate-700"} rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer`}
              >
                <Filter className="w-3.5 h-3.5" />
                {filterStatus === "Semua" ? "Filter" : filterStatus}
              </button>
              
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 overflow-hidden">
                    {["Semua", "Terjadwal", "Selesai", "Dibatalkan"].map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setFilterStatus(status as any);
                          setIsFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${filterStatus === status ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedHolidayToEdit(null);
                setIsCreatingView(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#193f53] hover:bg-[#143343] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Libur
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">NAMA TOKO</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">TANGGAL / DURASI LIBUR</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">ALASAN</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">DIBUAT OLEH</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">STATUS</th>
                <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {holidays
                .filter(row => row.storeName.toLowerCase().includes(searchTerm.toLowerCase()))
                .filter(row => filterStatus === "Semua" || row.status === filterStatus)
                .map((row) => {
                const colors = getStatusColor(row.status);
                const isSoftDeleted = row.status === "Dibatalkan";
                return (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className={`px-5 py-3.5 ${isSoftDeleted ? 'opacity-40 grayscale' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900 leading-tight">{row.storeName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{row.storeLocation}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`px-5 py-3.5 ${isSoftDeleted ? 'opacity-40 grayscale' : ''}`}>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 font-bold shadow-2xs">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        {formatDuration(row.startDate, row.endDate, row.durationDays)}
                      </div>
                    </td>
                    <td className={`px-5 py-3.5 ${isSoftDeleted ? 'opacity-40 grayscale' : ''}`}>
                      <p className="text-xs text-slate-700 max-w-[160px] leading-relaxed font-medium">{row.reason}</p>
                    </td>
                    <td className={`px-5 py-3.5 ${isSoftDeleted ? 'opacity-40 grayscale' : ''}`}>
                      <p className="text-[11px] font-bold text-slate-900">{row.createdBy}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{row.creatorRole}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${colors.bg}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></div>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ActionButtons
                        onView={isSoftDeleted ? undefined : () => {
                          setSelectedHolidayToView(row);
                          setIsViewModalOpen(true);
                        }}
                        onEdit={isSoftDeleted ? undefined : () => {
                          setSelectedHolidayToEdit(row);
                          setIsCreatingView(true);
                        }}
                        onDelete={isSoftDeleted ? undefined : () => {
                          setDeleteTargetHoliday(row);
                          setIsDeleteModalOpen(true);
                        }}
                        onRestore={isSoftDeleted ? () => {
                          setRestoreTargetHoliday(row);
                          setIsRestoreModalOpen(true);
                        } : undefined}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Menampilkan <span className="font-bold text-slate-900">1-{Math.min(5, holidays.length)}</span> dari <span className="font-bold text-slate-900">{holidays.length}</span> jadwal libur
          </p>
          <div className="flex gap-1 text-[11px]">
            <button className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="w-7 h-7 rounded-md bg-[#193f53] text-white flex items-center justify-center font-bold shadow-2xs">1</button>
            <button className="px-3 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-bold ml-1 cursor-pointer">
              Selanjutnya <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}

      <SoftDeleteModal
        isOpen={isDeleteModalOpen}
        holiday={deleteTargetHoliday}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (deleteTargetHoliday) {
            HolidayService.update(deleteTargetHoliday.id, { status: "Dibatalkan" });
            toast.success(`Libur toko untuk ${deleteTargetHoliday.storeName} berhasil dibatalkan.`);
            setIsDeleteModalOpen(false);
            setDeleteTargetHoliday(null);
            refreshData();
          }
        }}
      />

      <DetailHolidayModal
        isOpen={isViewModalOpen}
        holiday={selectedHolidayToView}
        onClose={() => setIsViewModalOpen(false)}
        onEdit={() => {
          setSelectedHolidayToEdit(selectedHolidayToView);
          setIsCreatingView(true);
        }}
      />

      <RestoreHolidayModal
        isOpen={isRestoreModalOpen}
        holiday={restoreTargetHoliday}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={() => {
          if (restoreTargetHoliday) {
            const endDate = new Date(restoreTargetHoliday.endDate);
            endDate.setHours(23, 59, 59, 999);
            
            // Jika tanggal libur sudah lewat, status otomatis Selesai, bukan Terjadwal
            const newStatus = new Date().getTime() > endDate.getTime() ? "Selesai" : "Terjadwal";
            
            HolidayService.update(restoreTargetHoliday.id, { status: newStatus });
            toast.success(`Libur toko untuk ${restoreTargetHoliday.storeName} berhasil dipulihkan.`);
            setIsRestoreModalOpen(false);
            setRestoreTargetHoliday(null);
            refreshData();
          }
        }}
      />
    </DashboardLayout>
  );
}

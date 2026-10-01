"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Search, Filter, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Store, X } from "lucide-react";
import { HolidayService } from "@/services/holiday.service";
import { Holiday, HolidayStatus } from "@/types/holiday";
import { toast } from "sonner";
import CreateHolidayModal from "./components/CreateHolidayModal";
import EditHolidayModal from "./components/EditHolidayModal";
import DeleteHolidayModal from "./components/DeleteHolidayModal";
import ActionButtons from "@/components/ui/ActionButtons";

export default function LiburTokoPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, cancelled: 0 });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedHolidayToEdit, setSelectedHolidayToEdit] = useState<Holiday | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetHoliday, setDeleteTargetHoliday] = useState<Holiday | null>(null);

  const refreshData = () => {
    const list = HolidayService.getAll();
    setHolidays(list);
    setStats(HolidayService.getStats(list));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCreateSubmit = (data: Omit<Holiday, "id">) => {
    HolidayService.create(data);
    toast.success(`Jadwal libur untuk ${data.storeName} berhasil ditambahkan!`);
    setIsCreateModalOpen(false);
    refreshData();
  };

  const handleEditSubmit = (data: Partial<Holiday>) => {
    if (!selectedHolidayToEdit) return;
    HolidayService.update(selectedHolidayToEdit.id, data);
    toast.success(`Jadwal libur untuk ${data.storeName} berhasil diperbarui!`);
    setIsEditModalOpen(false);
    setSelectedHolidayToEdit(null);
    refreshData();
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetHoliday) return;
    HolidayService.delete(deleteTargetHoliday.id);
    toast.success(`Jadwal libur untuk ${deleteTargetHoliday.storeName} berhasil dihapus.`);
    setIsDeleteModalOpen(false);
    setDeleteTargetHoliday(null);
    refreshData();
  };

  const getStatusColor = (status: HolidayStatus) => {
    if (status === "Terjadwal") return { bg: "bg-[#f0f5ff] border-[#d6e4ff] text-[#1e4ed8]", dot: "bg-[#2563eb]" };
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

  return (
    <DashboardLayout>
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
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">{stats.total}</div>
              <p className="text-xs text-slate-500 mt-1">Semua libur tercatat</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">LIBUR AKTIF</h3>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900">{stats.active}</div>
              <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-medium">
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
                <h3 className="text-[13px] font-bold text-slate-900 whitespace-nowrap">Agustus 2024</h3>
              </div>
              <div className="flex gap-1.5 items-center">
                <button 
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={(e) => e.stopPropagation()}
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
              <div className="text-[11px] font-medium text-slate-300">28</div>
              <div className="text-[11px] font-medium text-slate-300">29</div>
              <div className="text-[11px] font-medium text-slate-300">30</div>
              <div className="text-[11px] font-medium text-slate-300">31</div>

              {/* Current month days */}
              {[...Array(31)].map((_, i) => {
                const day = i + 1;
                const hasDot = day === 25; // green dot

                return (
                  <div key={day} className="text-[11px] font-medium text-slate-800 relative flex flex-col items-center justify-center">
                    {day}
                    {hasDot && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-emerald-500"></div>}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 border-t border-slate-100 pt-4 mt-auto">
              <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></div> 12 Terjadwal</div>
              <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div> 10 Libur Aktif</div>
              <div className="flex items-center gap-1.5 whitespace-nowrap"><div className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></div> 2 Dibatalkan</div>
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
              placeholder="Cari toko atau auditor..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2.5">
            <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer">
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
            <button
              onClick={() => setIsCreateModalOpen(true)}
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
              {holidays.map((row) => {
                const colors = getStatusColor(row.status);
                return (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3.5">
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
                    <td className="px-5 py-3.5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-[11px] text-slate-700 font-bold shadow-2xs">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        {formatDuration(row.startDate, row.endDate, row.durationDays)}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-700 max-w-[160px] leading-relaxed font-medium">{row.reason}</p>
                    </td>
                    <td className="px-5 py-3.5">
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
                        onView={() => { }} // Placeholder
                        onEdit={() => {
                          setSelectedHolidayToEdit(row);
                          setIsEditModalOpen(true);
                        }}
                        onDelete={() => {
                          setDeleteTargetHoliday(row);
                          setIsDeleteModalOpen(true);
                        }}
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

      <CreateHolidayModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      <EditHolidayModal
        isOpen={isEditModalOpen}
        holiday={selectedHolidayToEdit}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
      />

      <DeleteHolidayModal
        isOpen={isDeleteModalOpen}
        holiday={deleteTargetHoliday}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </DashboardLayout>
  );
}

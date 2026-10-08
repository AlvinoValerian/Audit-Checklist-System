"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import {
  Calendar as CalendarIcon,
  Check,
  Ban,
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Store,
  Clock,
  Repeat,
  CalendarDays,
  FileCheck2,
} from "lucide-react";
import { ScheduleService, defaultSchedules } from "@/services/schedule.service";
import { AuditSchedule, ScheduleStats, ScheduleStatus } from "@/types/schedule";
import { toast } from "sonner";
import ActionButtons from "@/components/ui/ActionButtons";
import AuditCalendarWidget from "./components/AuditCalendarWidget";
import CreateScheduleModal from "./components/CreateScheduleModal";
import EditScheduleModal from "./components/EditScheduleModal";
import DetailScheduleModal from "./components/DetailScheduleModal";
import DeleteScheduleModal from "./components/DeleteScheduleModal";
import { format, isSameDay } from "date-fns";

export default function JadwalAuditPage() {
  const [schedules, setSchedules] = useState<AuditSchedule[]>(defaultSchedules);
  const [stats, setStats] = useState<ScheduleStats>(
    ScheduleService.getStats(defaultSchedules)
  );

  // Calendar Date Filter (null shows all 12 schedules, clicking date filters)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<AuditSchedule | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedScheduleToView, setSelectedScheduleToView] = useState<AuditSchedule | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<AuditSchedule | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | ScheduleStatus>("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const refreshData = useCallback(() => {
    const list = ScheduleService.getAll();
    setSchedules(list);
    setStats(ScheduleService.getStats(list));
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Handlers
  const handleCreateSchedule = (newScheduleData: Omit<AuditSchedule, "id">) => {
    ScheduleService.create(newScheduleData);
    toast.success(`Jadwal audit untuk "${newScheduleData.storeName}" berhasil dibuat!`);
    setIsCreateModalOpen(false);
    refreshData();
  };

  const handleUpdateSchedule = (updatedData: Partial<AuditSchedule>) => {
    if (scheduleToEdit) {
      ScheduleService.update(scheduleToEdit.id, updatedData);
      toast.success("Jadwal audit berhasil diperbarui!");
      setIsEditModalOpen(false);
      setScheduleToEdit(null);
      refreshData();
    }
  };

  const handleConfirmDelete = () => {
    if (scheduleToDelete) {
      ScheduleService.update(scheduleToDelete.id, { status: "Dibatalkan" });
      toast.success(`Jadwal untuk "${scheduleToDelete.storeName}" telah dibatalkan.`);
      setIsDeleteModalOpen(false);
      setScheduleToDelete(null);
      refreshData();
    }
  };

  // Filter Logic
  const filteredSchedules = useMemo(() => {
    return schedules.filter((schedule) => {
      const matchesSearch =
        schedule.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.storeLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.scheduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (schedule.auditorName && schedule.auditorName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        filterStatus === "Semua" ? true : schedule.status === filterStatus;

      // Date match if selectedDate is set
      const matchesDate = selectedDate
        ? schedule.date === format(selectedDate, "yyyy-MM-dd") ||
          schedule.recurrence === "Setiap Hari"
        : true;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [schedules, searchTerm, filterStatus, selectedDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage) || 1;
  const paginatedSchedules = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchedules.slice(start, start + itemsPerPage);
  }, [filteredSchedules, currentPage]);

  const startIndex = filteredSchedules.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredSchedules.length);

  return (
    <DashboardLayout>
      <Header
        title="Jadwal Audit"
        subtitle="Kelola dan pantau jadwal audit untuk semua cabang."
      />

      {/* Top Section: 3 Compact Metric Cards (Left, ~58%) + Mini Calendar Widget (Right, ~42%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 mb-5 sm:mb-6 items-start">
        {/* 3 Metric Cards Container */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 lg:col-span-7 items-start">
          {/* Card 1: TOTAL JADWAL */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                TOTAL JADWAL
              </h3>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.total}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Semua jadwal bulan ini
              </p>
            </div>
          </div>

          {/* Card 2: JADWAL AKTIF */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                JADWAL AKTIF
              </h3>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.active}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                <TrendingUp className="w-3 h-3" />
                <span>{stats.activePercentage}% dari total</span>
              </div>
            </div>
          </div>

          {/* Card 3: JADWAL NONAKTIF */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[10px] sm:text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                JADWAL NONAKTIF
              </h3>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2">
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.inactive}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Dibatalkan / Ditunda
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: CALENDAR WIDGET CONTAINER */}
        <div className="lg:col-span-5">
          <AuditCalendarWidget
            schedules={schedules}
            selectedDate={selectedDate}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Main Table Container Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Toolbar: Search, Filter & Add Schedule */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari toko atau auditor..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white border ${
                  filterStatus !== "Semua" || selectedDate
                    ? "border-sky-500 text-sky-600"
                    : "border-slate-200 text-slate-700"
                } rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>
                  {filterStatus === "Semua"
                    ? selectedDate
                      ? format(selectedDate, "d MMM")
                      : "Filter"
                    : filterStatus}
                </span>
              </button>

              {isFilterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 overflow-hidden">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Status Jadwal
                    </div>
                    {(["Semua", "Terjadwal", "Selesai", "Dibatalkan"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setFilterStatus(status);
                          setIsFilterOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          filterStatus === status
                            ? "bg-sky-50 text-sky-600 font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {status}
                      </button>
                    ))}

                    {selectedDate && (
                      <div className="pt-1 mt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDate(null);
                            setIsFilterOpen(false);
                          }}
                          className="w-full text-left px-3.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                        >
                          Hapus Filter Tanggal
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Tambah Jadwal Button */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193f53] hover:bg-[#123040] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Jadwal Audit</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6">NAMA TOKO</th>
                <th className="py-3 px-4">NAMA JADWAL</th>
                <th className="py-3 px-4">WAKTU</th>
                <th className="py-3 px-4">PENGULANGAN</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 sm:px-6 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {paginatedSchedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">Tidak ada jadwal ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coba sesuaikan kata kunci pencarian, filter status, atau tanggal terpilih.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedSchedules.map((schedule) => {
                  const isCancelled = schedule.status === "Dibatalkan";

                  return (
                    <tr
                      key={schedule.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* NAMA TOKO */}
                      <td className={`py-3.5 px-4 sm:px-6 ${isCancelled ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">
                              {schedule.storeName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal">
                              {schedule.storeLocation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* NAMA JADWAL */}
                      <td className={`py-3.5 px-4 ${isCancelled ? "opacity-60" : ""}`}>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50/60 text-sky-700 border border-sky-100 text-xs font-medium">
                          <FileCheck2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-xs">{schedule.scheduleName}</span>
                        </span>
                      </td>

                      {/* WAKTU */}
                      <td className={`py-3.5 px-4 whitespace-nowrap text-slate-600 ${isCancelled ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{schedule.timeRange}</span>
                        </div>
                      </td>

                      {/* PENGULANGAN */}
                      <td className={`py-3.5 px-4 whitespace-nowrap ${isCancelled ? "opacity-60" : ""}`}>
                        {schedule.recurrence === "Setiap Hari" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                            <Repeat className="w-3 h-3 text-slate-400" />
                            <span>Setiap Hari</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-600 text-xs font-medium border border-sky-100">
                            <CalendarDays className="w-3 h-3 text-sky-500" />
                            <span>Hari Tertentu</span>
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {schedule.status === "Terjadwal" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-600 border border-sky-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                            Terjadwal
                          </span>
                        )}
                        {schedule.status === "Selesai" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            Selesai
                          </span>
                        )}
                        {schedule.status === "Dibatalkan" && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                            <Ban className="w-3 h-3" />
                            Dibatalkan
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">
                        <ActionButtons
                          onView={() => {
                            setSelectedScheduleToView(schedule);
                            setIsDetailModalOpen(true);
                          }}
                          onEdit={() => {
                            setScheduleToEdit(schedule);
                            setIsEditModalOpen(true);
                          }}
                          onDelete={
                            isCancelled
                              ? undefined
                              : () => {
                                  setScheduleToDelete(schedule);
                                  setIsDeleteModalOpen(true);
                                }
                          }
                          onRestore={
                            isCancelled
                              ? () => {
                                  ScheduleService.update(schedule.id, { status: "Terjadwal" });
                                  toast.success(`Jadwal untuk "${schedule.storeName}" diaktifkan kembali.`);
                                  refreshData();
                                }
                              : undefined
                          }
                          viewTitle="Lihat Detail Jadwal"
                          editTitle="Edit Jadwal"
                          deleteTitle="Batalkan Jadwal"
                          restoreTitle="Aktifkan Kembali Jadwal"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-700">{startIndex}-{endIndex}</span> dari{" "}
            <span className="font-semibold text-slate-700">{filteredSchedules.length}</span> jadwal
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-[#193f53] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100 border border-transparent"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs font-medium"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateScheduleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSchedule}
      />

      <EditScheduleModal
        isOpen={isEditModalOpen}
        schedule={scheduleToEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setScheduleToEdit(null);
        }}
        onSubmit={handleUpdateSchedule}
      />

      <DetailScheduleModal
        isOpen={isDetailModalOpen}
        schedule={selectedScheduleToView}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedScheduleToView(null);
        }}
        onEdit={() => {
          if (selectedScheduleToView) {
            setScheduleToEdit(selectedScheduleToView);
            setIsDetailModalOpen(false);
            setIsEditModalOpen(true);
          }
        }}
      />

      <DeleteScheduleModal
        isOpen={isDeleteModalOpen}
        schedule={scheduleToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setScheduleToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </DashboardLayout>
  );
}

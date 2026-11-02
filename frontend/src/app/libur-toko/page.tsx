"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Search, Filter, Plus, Store, X, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { HolidayService } from "@/services/holiday.service";
import { Holiday, HolidayStatus } from "@/types/holiday";
import { toast } from "sonner";
import { format } from "date-fns";
import { AuthService } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { Workspace } from "@/types/workspace";
import CreateHolidayView from "./components/CreateHolidayView";
import DetailHolidayModal from "./components/DetailHolidayModal";
import SoftDeleteModal from "./components/SoftDeleteModal";
import RestoreHolidayModal from "./components/RestoreHolidayModal";
import ActionButtons from "@/components/ui/ActionButtons";
import HolidayCalendarWidget from "./components/HolidayCalendarWidget";
 
export default function LiburTokoPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, cancelled: 0 });

  // Calendar Date Filter
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

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
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [isSubmittingRestore, setIsSubmittingRestore] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | "Terjadwal" | "Selesai" | "Dibatalkan">("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Workspace Switcher States
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [currentWorkspaceName, setCurrentWorkspaceName] = useState<string>("Workspace");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshData = async (customWsId?: string) => {
    try {
      const activeWs = AuthService.getActiveWorkspace();
      const wsId = customWsId !== undefined ? customWsId : (selectedWorkspaceId || activeWs?.id);
      const list = await HolidayService.fetchAll(wsId);
      const now = new Date();
      
      // Sembunyikan jadwal (Selesai/Dibatalkan) yang sudah terlewat lebih dari 5 hari (diperbarui dari 15 hari)
      const filteredList = list.filter((holiday) => {
        if (holiday.status === "Selesai" || holiday.status === "Dibatalkan") {
          const endDate = new Date(holiday.endDate || holiday.startDate);
          const diffTime = now.getTime() - endDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > 5) {
            return false;
          }
        }
        return true;
      });

      setHolidays(filteredList);
      setStats(HolidayService.getStats(filteredList));
    } catch (err) {
      console.error("Gagal refresh data libur:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const user = AuthService.getCurrentUser();
      const activeWs = AuthService.getActiveWorkspace();
      const isSA = user?.role === "Super Admin";
      setIsSuperAdmin(isSA);

      let targetWsId = activeWs?.id || user?.workspaceId || "";
      let targetWsName = activeWs?.name || user?.workspaceName || "Workspace";

      if (isSA) {
        try {
          const wsList = await WorkspaceService.fetchAll();
          setWorkspaces(wsList);
          if (wsList.length > 0) {
            const matched = wsList.find((w) => w.id === targetWsId && w.status !== "Nonaktif");
            if (matched) {
              targetWsId = matched.id;
              targetWsName = matched.companyName || matched.name;
            } else {
              const firstActive = wsList.find((w) => w.status !== "Nonaktif") || wsList[0];
              targetWsId = firstActive.id;
              targetWsName = firstActive.companyName || firstActive.name;
              AuthService.setActiveWorkspace({
                id: firstActive.id,
                name: targetWsName,
              });
            }
          }
        } catch (err) {
          console.warn("Gagal memuat daftar workspace:", err);
        }
      }

      setSelectedWorkspaceId(targetWsId);
      setCurrentWorkspaceName(targetWsName);
      await refreshData(targetWsId);
    };

    init();
  }, []);

  const handleWorkspaceChange = async (newWsId: string) => {
    const chosen = workspaces.find((w) => w.id === newWsId);
    if (chosen?.status === "Nonaktif") {
      toast.error(`Workspace "${chosen.companyName || chosen.name}" sedang nonaktif dan tidak dapat dipilih.`);
      return;
    }

    setSelectedWorkspaceId(newWsId);
    if (chosen) {
      const name = chosen.companyName || chosen.name;
      setCurrentWorkspaceName(name);
      AuthService.setActiveWorkspace({ id: chosen.id, name });
      toast.info(`Menampilkan libur toko untuk workspace "${name}"`);
    }
    await refreshData(newWsId);
  };

  const getStatusColor = (status: HolidayStatus) => {
    if (status === "Terjadwal") return { bg: "bg-purple-50 border-purple-200 text-purple-700", dot: "bg-purple-600" };
    if (status === "Selesai") return { bg: "bg-[#ecfdf5] border-[#a7f3d0] text-[#047857]", dot: "bg-[#10b981]" };
    return { bg: "bg-[#fef2f2] border-[#fecaca] text-[#b91c1c]", dot: "bg-[#ef4444]" };
  };

  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

    if (start === end) {
      return s.toLocaleDateString('id-ID', { ...options, year: 'numeric' });
    }

    const startStr = s.toLocaleDateString('id-ID', options);
    const endStr = e.toLocaleDateString('id-ID', { ...options, year: 'numeric' });
    return `${startStr} - ${endStr}`;
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

  // Filter Logic: Search, Status, and Calendar Date
  const filteredHolidays = useMemo(() => {
    return holidays.filter((row) => {
      const matchesSearch =
        row.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.storeLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.reason.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "Semua" ? true : row.status === filterStatus;

      // Date match if selectedDate is set
      const checkDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
      const hEnd = row.endDate || row.startDate;
      const matchesDate = checkDateStr
        ? checkDateStr >= row.startDate && checkDateStr <= hEnd
        : true;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [holidays, searchTerm, filterStatus, selectedDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredHolidays.length / itemsPerPage) || 1;
  const paginatedHolidays = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredHolidays.slice(start, start + itemsPerPage);
  }, [filteredHolidays, currentPage]);

  const startIndex = filteredHolidays.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredHolidays.length);

  // Pengecekan tabrakan / collision jadwal libur saat restore
  const conflictHolidayForRestore = useMemo(() => {
    if (!restoreTargetHoliday) return null;
    const rStart = restoreTargetHoliday.startDate;
    const rEnd = restoreTargetHoliday.endDate || restoreTargetHoliday.startDate;
    const rStore = restoreTargetHoliday.storeName.trim().toLowerCase();
    const rType = restoreTargetHoliday.liburType || "full";
    const rSchedules = restoreTargetHoliday.schedules || [];

    return (
      holidays.find((h) => {
        if (h.id === restoreTargetHoliday.id || h.status === "Dibatalkan") return false;
        if (h.storeName.trim().toLowerCase() !== rStore) return false;
        const hStart = h.startDate;
        const hEnd = h.endDate || h.startDate;
        const dateOverlap = !(hEnd < rStart || hStart > rEnd);
        if (!dateOverlap) return false;

        const hType = h.liburType || "full";
        if (rType === "full" || hType === "full") return true;

        // Kedua libur adalah partial: periksa irisan shift / jadwal audit
        const hSchedules = h.schedules || [];
        const hasOverlap = rSchedules.some((s) => hSchedules.includes(s));
        return hasOverlap || rSchedules.length === 0 || hSchedules.length === 0;
      }) || null
    );
  }, [restoreTargetHoliday, holidays]);

  return (
    <DashboardLayout>
      {isCreatingView ? (
        <CreateHolidayView 
          initialData={selectedHolidayToEdit}
          workspaceId={selectedWorkspaceId}
          workspaceName={currentWorkspaceName}
          onBack={() => {
            setIsCreatingView(false);
            setSelectedHolidayToEdit(null);
          }} 
          onSave={async (data) => { 
            try {
              if (selectedHolidayToEdit) {
                await HolidayService.updateAsync(selectedHolidayToEdit.id, data);
                toast.success(`Jadwal libur untuk ${data.storeName} berhasil diperbarui!`);
              } else if (Array.isArray(data)) {
                await HolidayService.createBatchAsync(data);
                toast.success(`Jadwal libur untuk ${data.length} toko berhasil disimpan ke database!`);
              } else {
                await HolidayService.createAsync(data); 
                toast.success(`Jadwal libur untuk ${data.storeName} berhasil ditambahkan!`); 
              }
              setIsCreatingView(false); 
              setSelectedHolidayToEdit(null);
              await refreshData(); 
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Gagal menyimpan jadwal libur";
              toast.error(msg);
            }
          }} 
        />
      ) : (
        <>
          <Header
            title="Libur Toko & Pengecualian"
            subtitle={`Kelola dan pantau jadwal operasional khusus dan hari libur untuk cabang di ${currentWorkspaceName}.`}
            action={
              isSuperAdmin && workspaces.length > 1 ? (
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                  <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="text-xs font-semibold text-slate-600 shrink-0">Workspace:</span>
                  <select
                    value={selectedWorkspaceId}
                    onChange={(e) => handleWorkspaceChange(e.target.value)}
                    className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer pr-1"
                  >
                    {workspaces.map((w) => {
                      const isInactive = w.status === "Nonaktif";
                      return (
                        <option
                          key={w.id}
                          value={w.id}
                          disabled={isInactive}
                          className={isInactive ? "text-slate-400 bg-slate-100 italic" : "text-slate-800"}
                        >
                          {w.companyName || w.name} {isInactive ? "(Nonaktif)" : `(${w.storeCount} Toko)`}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : undefined
            }
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

        {/* Calendar Widget Container (Right Side) */}
        <HolidayCalendarWidget
          holidays={holidays}
          selectedDate={selectedDate}
          isExpanded={isCalendarExpanded}
          onExpandedChange={(expanded) => {
            setIsCalendarExpanded(expanded);
            if (!expanded) {
              setSelectedDate(null);
              setCurrentPage(1);
            }
          }}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setCurrentPage(1);
          }}
        />
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari toko atau alasan libur..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-all placeholder:text-slate-400"
            />
          </div>
          <div className="flex items-center gap-2.5">
            {/* Filter Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1.5 px-3.5 py-2 bg-white border ${
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
                  <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 overflow-hidden">
                    <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      Status Libur
                    </div>
                    {(["Semua", "Terjadwal", "Selesai", "Dibatalkan"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => {
                          setFilterStatus(status);
                          setIsFilterOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs font-medium transition-colors ${
                          filterStatus === status ? "bg-sky-50 text-sky-600 font-semibold" : "text-slate-600 hover:bg-slate-50"
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
                            setCurrentPage(1);
                          }}
                          className="w-full text-left px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          Hapus Filter Tanggal
                        </button>
                      </div>
                    )}
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

        {/* Active Date Filter Pill */}
        {selectedDate && (
          <div className="px-4 py-2.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-sky-800">
              <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>
                Menampilkan jadwal libur pada:{" "}
                <span className="font-bold text-sky-900">{format(selectedDate, "d MMMM yyyy")}</span>
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedDate(null);
                setCurrentPage(1);
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-rose-600 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filter Tanggal
            </button>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-[21%] px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">NAMA TOKO</th>
                <th className="w-[16%] px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">TANGGAL / DURASI LIBUR</th>
                <th className="w-[20%] px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">ALASAN</th>
                <th className="w-[13%] px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">DIBUAT OLEH</th>
                <th className="w-[10%] px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">STATUS</th>
                <th className="w-[13%] px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedHolidays.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">Tidak ada jadwal libur ditemukan di {currentWorkspaceName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedDate
                        ? `Tidak ada jadwal libur toko pada tanggal ${format(selectedDate, "d MMMM yyyy")}.`
                        : "Coba sesuaikan kata kunci pencarian atau filter status."}
                    </p> 
                    {selectedDate && (
                      <button
                        onClick={() => {
                          setSelectedDate(null);
                          setCurrentPage(1);
                        }}
                        className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Tampilkan Semua Jadwal
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedHolidays.map((row) => {
                  const colors = getStatusColor(row.status);
                  const isSoftDeleted = row.status === "Dibatalkan";
                  const isCompleted = row.status === "Selesai";
                  const isGrayedOut = isSoftDeleted || isCompleted;

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className={`px-4 py-3.5 ${isGrayedOut ? 'opacity-40 grayscale' : ''}`}>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 leading-tight line-clamp-2 break-words" title={row.storeName}>
                            {row.storeName}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{row.storeLocation}</p>
                        </div>
                      </td>
                      <td className={`px-4 py-3.5 ${isGrayedOut ? 'opacity-40 grayscale' : ''}`}>
                        <div className="min-w-0 whitespace-nowrap">
                          <p className="text-xs font-bold text-slate-900 leading-tight">
                            {formatDateRange(row.startDate, row.endDate)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            Durasi: {row.durationDays} Hari
                          </p>
                        </div>
                      </td>
                      <td className={`px-4 py-3.5 ${isGrayedOut ? 'opacity-40 grayscale' : ''}`}>
                        <p
                          className="text-xs text-slate-700 leading-relaxed font-medium break-words line-clamp-2"
                          title={row.reason}
                        >
                          {row.reason}
                        </p>
                      </td>
                      <td className={`px-4 py-3.5 ${isGrayedOut ? 'opacity-40 grayscale' : ''}`}>
                        <p className="text-[11px] font-bold text-slate-900 truncate">{row.createdBy}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{row.creatorRole}</p>
                      </td>
                      <td className="px-2 py-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${colors.bg}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${colors.dot}`}></div>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-2 py-3.5 text-center whitespace-nowrap">
                        {isCompleted ? null : (
                          <ActionButtons
                            align="center"
                            alignRestoreWithDelete={true}
                            hasViewSlot={true}
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
                            restoreTitle="Aktifkan Kembali Libur Toko"
                            deleteTitle="Batalkan Libur Toko"
                          />
                        )}
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
            <span className="font-semibold text-slate-700">{filteredHolidays.length}</span> jadwal libur
          </div>

          <div className="flex items-center gap-1.5 self-center sm:self-auto">
            {/* Previous Button */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Number Buttons */}
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

            {/* Next Button */}
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
        </div>
      </div>
        </>
      )}

      <SoftDeleteModal
        isOpen={isDeleteModalOpen}
        holiday={deleteTargetHoliday}
        isSubmitting={isSubmittingDelete}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={async () => {
          if (deleteTargetHoliday) {
            setIsSubmittingDelete(true);
            try {
              await Promise.all([
                HolidayService.deleteAsync(deleteTargetHoliday.id),
                new Promise((r) => setTimeout(r, 450)),
              ]);
              toast.success(`Libur toko untuk ${deleteTargetHoliday.storeName} berhasil dibatalkan.`);
              setIsDeleteModalOpen(false);
              setDeleteTargetHoliday(null);
              await refreshData();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Gagal membatalkan libur toko";
              toast.error(msg);
            } finally {
              setIsSubmittingDelete(false);
            }
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
        conflictHoliday={conflictHolidayForRestore}
        isSubmitting={isSubmittingRestore}
        onClose={() => setIsRestoreModalOpen(false)}
        onConfirm={async () => {
          if (restoreTargetHoliday) {
            if (conflictHolidayForRestore) {
              toast.error(
                `Tidak dapat mengaktifkan kembali: Jadwal libur bertabrakan dengan libur aktif yang sudah ada pada tanggal tersebut.`
              );
              return;
            }
            setIsSubmittingRestore(true);
            try {
              await Promise.all([
                HolidayService.restoreAsync(restoreTargetHoliday.id),
                new Promise((r) => setTimeout(r, 450)),
              ]);
              toast.success(`Libur toko untuk ${restoreTargetHoliday.storeName} berhasil dipulihkan.`);
              setIsRestoreModalOpen(false);
              setRestoreTargetHoliday(null);
              await refreshData();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : "Gagal memulihkan libur toko";
              toast.error(msg);
            } finally {
              setIsSubmittingRestore(false);
            }
          }
        }}
      />
    </DashboardLayout>
  );
}

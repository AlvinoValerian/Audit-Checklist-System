"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import {
  Loader2,
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
  X,
  Building2,
} from "lucide-react";
import { ScheduleService, defaultSchedules, isScheduleInProgress, to24HourString, calculateDuration } from "@/services/schedule.service";
import { AuditSchedule, ScheduleStats, ScheduleStatus } from "@/types/schedule";
import { toast } from "sonner";
import ActionButtons from "@/components/ui/ActionButtons";
import AuditCalendarWidget from "./components/AuditCalendarWidget";
import CreateSchedulePanel from "./components/CreateSchedulePanel";
import DetailSchedule from "./components/DetailSchedule";
import DeleteScheduleModal from "./components/DeleteScheduleModal";
import ChecklistRequiredModal from "./components/ChecklistRequiredModal";
import RestoreScheduleModal from "./components/RestoreScheduleModal";
import { format, isSameDay } from "date-fns";
import { AuthService } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { Workspace } from "@/types/workspace";

export default function JadwalAuditPage() {
  const [schedules, setSchedules] = useState<AuditSchedule[]>([]);
  const [stats, setStats] = useState<ScheduleStats>(ScheduleService.getStats([]));
  const [isLoading, setIsLoading] = useState(true);

  // Workspace Switcher States
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [currentWorkspaceName, setCurrentWorkspaceName] = useState<string>("Workspace");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Calendar Date Filter (null shows all 12 schedules, clicking date filters)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

  // Modal & Panel States
  const [isSchedulePanelOpen, setIsSchedulePanelOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<AuditSchedule | null>(null);

  const [selectedScheduleToView, setSelectedScheduleToView] = useState<AuditSchedule | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<AuditSchedule | null>(null);

  // Pop up Relasi: Template Checklist Wajib Selesai Sebelum Nonaktifkan Jadwal
  const [isChecklistRequiredOpen, setIsChecklistRequiredOpen] = useState(false);
  const [scheduleForChecklist, setScheduleForChecklist] = useState<AuditSchedule | null>(null);

  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [isSubmittingChecklist, setIsSubmittingChecklist] = useState(false);

  // Restore Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [scheduleToRestore, setScheduleToRestore] = useState<AuditSchedule | null>(null);
  const [isSubmittingRestore, setIsSubmittingRestore] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | ScheduleStatus>("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const refreshData = useCallback(async (showLoading = false, customWsId?: string) => {
    if (showLoading) setIsLoading(true);
    try {
      const activeWs = AuthService.getActiveWorkspace();
      const wsId = customWsId !== undefined ? customWsId : (selectedWorkspaceId || activeWs?.id);
      const liveList = await ScheduleService.fetchAll(wsId);
      if (Array.isArray(liveList)) {
        setSchedules(liveList);
        setStats(ScheduleService.getStats(liveList));
        return;
      }
    } catch (err) {
      console.warn("Gagal memuat jadwal dari backend, menggunakan cache:", err);
    } finally {
      setIsLoading(false);
    }

    const list = ScheduleService.getAll();
    setSchedules(list);
    setStats(ScheduleService.getStats(list));
    setIsLoading(false);
  }, [selectedWorkspaceId]);

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
      refreshData(true, targetWsId);
    };

    init();

    // Interval realtime: cek secara berkala agar jadwal otomatis menjadi "Selesai" jika jam selesai terlewati
    const interval = setInterval(() => {
      refreshData(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshData]);

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
      toast.info(`Menampilkan jadwal untuk workspace "${name}"`);
    }
    await refreshData(true, newWsId);
  };

  // Handlers
  const handleOpenCreate = () => {
    setScheduleToEdit(null);
    setIsSchedulePanelOpen(true);
  };

  const handleOpenEdit = (schedule: AuditSchedule) => {
    if (isScheduleInProgress(schedule)) {
      toast.error(
        `Jadwal "${schedule.scheduleName}" sedang berlangsung saat ini (${schedule.timeRange || ""}). Tidak dapat diedit selama audit sedang berjalan.`
      );
      return;
    }
    setScheduleToEdit(schedule);
    setIsSchedulePanelOpen(true);
  };

  const handleSaveSchedule = async (
    scheduleData: Omit<AuditSchedule, "id"> | Array<Omit<AuditSchedule, "id">>
  ) => {
    setIsSubmittingSchedule(true);
    try {
      if (scheduleToEdit && !Array.isArray(scheduleData)) {
        await ScheduleService.updateAsync(scheduleToEdit.id, scheduleData);
        toast.success(`Jadwal untuk "${scheduleData.storeName}" berhasil diperbarui!`);
      } else if (Array.isArray(scheduleData)) {
        await ScheduleService.createBatchAsync(scheduleData);
        if (scheduleData.length === 1) {
          toast.success(`Jadwal audit untuk "${scheduleData[0].storeName}" berhasil dibuat!`);
        } else {
          toast.success(`${scheduleData.length} jadwal audit cabang berhasil dibuat!`);
        }
      } else {
        await ScheduleService.createAsync(scheduleData);
        toast.success(`Jadwal audit untuk "${scheduleData.storeName}" berhasil dibuat!`);
      }
      // Berikan durasi loading minimal 500ms agar animasi spinner terlihat jelas dan halus
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsSchedulePanelOpen(false);
      setScheduleToEdit(null);
      refreshData(false);
    } catch (err: unknown) {
      console.warn("Backend save failed, using local fallback:", err);
      if (scheduleToEdit && !Array.isArray(scheduleData)) {
        ScheduleService.update(scheduleToEdit.id, scheduleData);
      } else if (Array.isArray(scheduleData)) {
        ScheduleService.createBatch(scheduleData);
      } else {
        ScheduleService.create(scheduleData);
      }
      toast.success("Jadwal audit berhasil disimpan!");
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsSchedulePanelOpen(false);
      setScheduleToEdit(null);
      refreshData(false);
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleUpdateSchedule = async (scheduleId: string, updatedData: Partial<AuditSchedule>) => {
    try {
      await ScheduleService.updateAsync(scheduleId, updatedData);
    } catch {
      ScheduleService.update(scheduleId, updatedData);
    }
    toast.success("Jadwal audit berhasil diperbarui!");
    setSelectedScheduleToView(null);
    refreshData(false);
  };

  const handleConfirmDelete = async () => {
    if (scheduleToDelete) {
      setIsSubmittingDelete(true);
      const todayStr = format(new Date(), "yyyy-MM-dd");
      try {
        try {
          await ScheduleService.updateAsync(scheduleToDelete.id, {
            status: "Dibatalkan",
            deletedAt: todayStr,
          });
        } catch {
          ScheduleService.update(scheduleToDelete.id, {
            status: "Dibatalkan",
            deletedAt: todayStr,
          });
        }
        toast.success(`Jadwal untuk "${scheduleToDelete.storeName}" telah dibatalkan.`);
        setIsDeleteModalOpen(false);
        setScheduleToDelete(null);
        refreshData(false);
      } finally {
        setIsSubmittingDelete(false);
      }
    }
  };

  const handleCompleteAndDeactivate = async () => {
    if (scheduleForChecklist) {
      setIsSubmittingChecklist(true);
      const todayStr = format(new Date(), "yyyy-MM-dd");
      try {
        try {
          await ScheduleService.updateAsync(scheduleForChecklist.id, {
            status: "Dibatalkan",
            deletedAt: todayStr,
          });
        } catch {
          ScheduleService.update(scheduleForChecklist.id, {
            status: "Dibatalkan",
            deletedAt: todayStr,
          });
        }
        toast.success(
          `Template checklist telah diselesaikan & jadwal "${scheduleForChecklist.storeName}" berhasil dinonaktifkan!`
        );
        setIsChecklistRequiredOpen(false);
        setScheduleForChecklist(null);
        refreshData(false);
      } finally {
        setIsSubmittingChecklist(false);
      }
    }
  };

  const handleConfirmRestore = async () => {
    if (scheduleToRestore) {
      setIsSubmittingRestore(true);
      try {
        try {
          await ScheduleService.updateAsync(scheduleToRestore.id, {
            status: "Terjadwal",
            deletedAt: undefined,
          });
        } catch {
          ScheduleService.update(scheduleToRestore.id, {
            status: "Terjadwal",
            deletedAt: undefined,
          });
        }
        toast.success(`Jadwal untuk "${scheduleToRestore.storeName}" diaktifkan kembali.`);
        setIsRestoreModalOpen(false);
        setScheduleToRestore(null);
        refreshData(false);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal mengaktifkan kembali jadwal";
        toast.error(msg);
      } finally {
        setIsSubmittingRestore(false);
      }
    }
  };

  // Contextual schedules based on selectedDate filter:
  // Jika memfilter tanggal masa depan (besok dsb), jadwal berulang aktif berstatus "Terjadwal".
  // Jika memfilter tanggal masa lalu, jadwal berstatus "Selesai".
  const contextualSchedules = useMemo(() => {
    if (!selectedDate) return schedules;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);

    const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return schedules.map((s) => {
      if (s.status === "Dibatalkan") return s;

      if (diffDays > 0) {
        // Masa Depan (Besok s/d 7 hari ke depan): status otomatis "Terjadwal"
        return { ...s, status: "Terjadwal" as const };
      } else if (diffDays < 0) {
        // Masa Lalu: status otomatis "Selesai"
        return { ...s, status: "Selesai" as const };
      }
      return s; // Hari ini: gunakan status realtime hari ini
    });
  }, [schedules, selectedDate]);

  // Filter Logic
  const filteredSchedules = useMemo(() => {
    return contextualSchedules.filter((schedule) => {
      const matchesSearch =
        schedule.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.storeLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        schedule.scheduleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (Array.isArray(schedule.selectedStores) &&
          schedule.selectedStores.some((s) =>
            s.toLowerCase().includes(searchTerm.toLowerCase())
          )) ||
        (schedule.auditorName && schedule.auditorName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus =
        filterStatus === "Semua" ? true : schedule.status === filterStatus;

      // Date match if selectedDate is set
      let matchesDate = true;
      if (selectedDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const targetDate = new Date(selectedDate);
        targetDate.setHours(0, 0, 0, 0);

        const diffDays = Math.round((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // BATASAN 1 MINGGU: Jika tanggal lebih dari 1 minggu ke depan (> 7 hari), tidak ada jadwal
        if (diffDays > 7) {
          return false;
        }

        const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
        const dayOfWeekShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][selectedDate.getDay()];

        if (diffDays < 0) {
          // Masa lalu: hanya tampilkan jadwal yang memang tercatat pada tanggal tersebut
          matchesDate = schedule.date === selectedDateStr;
        } else {
          // Hari ini (0) s/d 7 hari ke depan (dalam batas 1 minggu):
          matchesDate =
            schedule.date === selectedDateStr ||
            schedule.recurrence === "Setiap Hari" ||
            (schedule.recurrence === "Hari Tertentu" &&
              Array.isArray(schedule.selectedDays) &&
              schedule.selectedDays.includes(dayOfWeekShort));
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [contextualSchedules, searchTerm, filterStatus, selectedDate]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage) || 1;
  const paginatedSchedules = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSchedules.slice(start, start + itemsPerPage);
  }, [filteredSchedules, currentPage]);

  const startIndex = filteredSchedules.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredSchedules.length);

  // Helper: Cek apakah jadwal terjadwal pada hari ini (tanggal tersebut)
  const isScheduleRunningToday = (schedule: AuditSchedule) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const todayStr = `${y}-${m}-${d}`;
    const dayOfWeekShort = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][now.getDay()];

    if (schedule.recurrence === "Setiap Hari") {
      return (schedule.date || todayStr) <= todayStr;
    }
    if (schedule.recurrence === "Hari Tertentu" && Array.isArray(schedule.selectedDays)) {
      return (schedule.date || todayStr) <= todayStr && schedule.selectedDays.includes(dayOfWeekShort);
    }
    return schedule.date === todayStr;
  };

  return (
    <DashboardLayout>
      <Header
        title="Jadwal Audit"
        subtitle={`Kelola dan pantau jadwal audit untuk cabang di ${currentWorkspaceName}.`}
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
        {/* 3 Metric Cards Container */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-3 gap-5 transition-all duration-500 ease-in-out">
          {/* Card 1: TOTAL JADWAL */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                TOTAL JADWAL
              </h3>
              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.total}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Semua jadwal bulan ini
              </p>
            </div>
          </div>

          {/* Card 2: JADWAL AKTIF */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                JADWAL AKTIF
              </h3>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.active}
              </div>
              <div className="flex items-center gap-1 mt-1 text-emerald-600 text-xs font-medium">
                <TrendingUp className="w-3 h-3" />
                <span>{stats.activePercentage}% dari total</span>
              </div>
            </div>
          </div>

          {/* Card 3: JADWAL NONAKTIF */}
          <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col">
            <div className="flex justify-between items-start">
              <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                JADWAL NONAKTIF
              </h3>
              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {stats.inactive}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Dibatalkan / Ditunda
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: CALENDAR WIDGET CONTAINER */}
        <AuditCalendarWidget
          schedules={schedules}
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
                  filterStatus === "Terjadwal"
                    ? "border-purple-400 text-purple-700 bg-purple-50/30"
                    : filterStatus !== "Semua" || selectedDate
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
                    {(["Semua", "Terjadwal", "Sedang Berjalan", "Selesai", "Dibatalkan"] as const).map((status) => (
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
                            ? status === "Terjadwal"
                              ? "bg-purple-50 text-purple-700 font-semibold"
                              : status === "Sedang Berjalan"
                              ? "bg-amber-50 text-amber-700 font-semibold"
                              : "bg-sky-50 text-sky-600 font-semibold"
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
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193f53] hover:bg-[#123040] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Jadwal Audit</span>
            </button>
          </div>
        </div>

        {/* Active Date Filter Banner */}
        {selectedDate && (
          <div className="px-4 py-2.5 bg-sky-50/70 border-b border-sky-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-sky-800">
              <CalendarIcon className="w-3.5 h-3.5 text-sky-600" />
              <span>
                Menampilkan jadwal audit pada:{" "}
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
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 sm:px-6 w-[28%] min-w-[190px]">NAMA TOKO</th>
                <th className="py-3 px-4 w-[28%] min-w-[190px]">NAMA JADWAL</th>
                <th className="py-3 px-4 w-[14%] whitespace-nowrap">WAKTU</th>
                <th className="py-3 px-4 w-[14%] whitespace-nowrap">PENGULANGAN</th>
                <th className="py-3 px-4 text-center w-[10%] whitespace-nowrap">STATUS</th>
                <th className="py-3 px-4 sm:px-6 text-center w-[6%] whitespace-nowrap">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-[#193f53] animate-spin" />
                      <span className="text-xs font-semibold text-slate-700">
                        Memuat data jadwal audit...
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Menghubungkan ke database
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedSchedules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">Tidak ada jadwal ditemukan di {currentWorkspaceName}</p>
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
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 leading-snug">
                              {schedule.storeName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-normal leading-snug mt-0.5">
                              {schedule.storeLocation}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* NAMA JADWAL */}
                      <td className={`py-3.5 px-4 ${isCancelled ? "opacity-60" : ""}`}>
                        <div className="inline-flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50/60 text-sky-700 border border-sky-100 text-xs font-medium max-w-[260px] sm:max-w-[300px]">
                          <FileCheck2 className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed break-words font-semibold">{schedule.scheduleName}</span>
                        </div>
                      </td>

                      {/* WAKTU (Format 24 Jam & Durasi) */}
                      <td className={`py-3.5 px-4 whitespace-nowrap text-slate-600 ${isCancelled ? "opacity-60" : ""}`}>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {to24HourString(schedule.startTime)} - {to24HourString(schedule.endTime)} WIB
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium pl-5">
                            Durasi: {schedule.duration || calculateDuration(schedule.startTime, schedule.endTime, schedule.timeRange)}
                          </span>
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
                        {schedule.status === "Sedang Berjalan" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse" title="Audit sedang berlangsung atau belum selesai dikerjakan staf">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Sedang Berjalan
                          </span>
                        ) : schedule.status === "Terjadwal" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Terjadwal
                          </span>
                        ) : schedule.status === "Selesai" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            Selesai
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                            <Ban className="w-3 h-3" />
                            Dibatalkan
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="py-3.5 px-4 sm:px-6 text-center whitespace-nowrap">
                        <ActionButtons
                          align="center"
                          alignRestoreWithDelete={true}
                          hasViewSlot={true}
                          onView={
                            isCancelled
                              ? undefined
                              : () => {
                                  setSelectedScheduleToView(schedule);
                                }
                          }
                          onEdit={
                            isCancelled
                              ? undefined
                              : () => {
                                  handleOpenEdit(schedule);
                                }
                          }
                          onDelete={
                            isCancelled
                              ? undefined
                              : () => {
                                  if (isScheduleInProgress(schedule)) {
                                    toast.error(
                                      `Jadwal "${schedule.scheduleName}" sedang berlangsung saat ini (${schedule.timeRange || ""}). Tidak dapat dibatalkan atau dinonaktifkan selama audit sedang berjalan.`
                                    );
                                    return;
                                  }
                                  // Aturan Soft Delete:
                                  // Jadwal status "Terjadwal" yang jatuh pada hari ini (tanggal tersebut)
                                  // dan belum selesai wajib diselesaikan terlebih dahulu (ChecklistRequiredModal).
                                  // Namun jika di luar tanggal tersebut (misal jadwal masa depan atau bukan hari ini),
                                  // maka diperbolehkan langsung di-soft delete (DeleteScheduleModal).
                                  const runningToday = isScheduleRunningToday(schedule);
                                  if (schedule.status === "Terjadwal" && runningToday) {
                                    setScheduleForChecklist(schedule);
                                    setIsChecklistRequiredOpen(true);
                                  } else {
                                    setScheduleToDelete(schedule);
                                    setIsDeleteModalOpen(true);
                                  }
                                }
                          }
                          onRestore={
                            isCancelled
                              ? () => {
                                  setScheduleToRestore(schedule);
                                  setIsRestoreModalOpen(true);
                                }
                              : undefined
                          }
                          viewTitle="Lihat Detail Jadwal"
                          editTitle="Edit Jadwal"
                          deleteTitle="Batalkan Jadwal"
                          restoreTitle="Aktifkan Kembali Jadwal"
                          editDisabled={!isCancelled && isScheduleInProgress(schedule)}
                          editDisabledTitle="Jadwal sedang berlangsung saat ini. Tidak dapat diedit selama audit berjalan."
                          deleteDisabled={!isCancelled && isScheduleInProgress(schedule)}
                          deleteDisabledTitle="Jadwal sedang berlangsung saat ini. Tidak dapat dibatalkan atau dinonaktifkan selama audit berjalan."
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
        </div>
      </div>

      {/* Side Panels & Modals */}
      <CreateSchedulePanel
        key={`${selectedWorkspaceId}-${scheduleToEdit?.id || "create"}`}
        isOpen={isSchedulePanelOpen}
        schedule={scheduleToEdit}
        workspaceId={selectedWorkspaceId}
        workspaceName={currentWorkspaceName}
        onClose={() => {
          setIsSchedulePanelOpen(false);
          setScheduleToEdit(null);
        }}
        onSubmit={handleSaveSchedule}
        isSubmitting={isSubmittingSchedule}
      />

      <DeleteScheduleModal
        isOpen={isDeleteModalOpen}
        schedule={scheduleToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setScheduleToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={isSubmittingDelete}
      />

      {/* Pop up Relasi: Template Checklist Wajib Selesai Sebelum Nonaktifkan Jadwal */}
      <ChecklistRequiredModal
        isOpen={isChecklistRequiredOpen}
        schedule={scheduleForChecklist}
        onClose={() => {
          setIsChecklistRequiredOpen(false);
          setScheduleForChecklist(null);
        }}
        onCompleteAndDeactivate={handleCompleteAndDeactivate}
        isSubmitting={isSubmittingChecklist}
      />

      {/* Restore Schedule Modal */}
      <RestoreScheduleModal
        isOpen={isRestoreModalOpen}
        schedule={scheduleToRestore}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setScheduleToRestore(null);
        }}
        onConfirm={handleConfirmRestore}
        isSubmitting={isSubmittingRestore}
      />

      {selectedScheduleToView && (
        <DetailSchedule
          key={selectedScheduleToView.id}
          schedule={selectedScheduleToView}
          onBack={() => {
            setSelectedScheduleToView(null);
          }}
          onEdit={() => {
            const current = selectedScheduleToView;
            setSelectedScheduleToView(null);
            handleOpenEdit(current);
          }}
          onSubmit={(updatedData) => handleUpdateSchedule(selectedScheduleToView.id, updatedData)}
        />
      )}
    </DashboardLayout>
  );
}

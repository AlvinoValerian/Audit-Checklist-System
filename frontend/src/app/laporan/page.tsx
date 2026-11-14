"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Store,
  FileCheck,
  Eye,
  Download,
  X,
  Loader2,
  Building2,
  AlertCircle,
  Check,
} from "lucide-react";
import { ReportService } from "@/services/report.service";
import { TokoService } from "@/services/toko.service";
import { StoreItem } from "@/types/toko";
import DecryptedImage from "@/components/DecryptedImage";
import { AuditReportItem } from "@/types/report";
import DetailLaporanView from "./components/DetailLaporanView";
import { toast } from "sonner";
import { AuthService } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { Workspace } from "@/types/workspace";
import {
  exportReportsToCsv,
  exportSingleReport,
  exportAllFilteredReportsToZip,
} from "@/utils/reportExporter";

const INDONESIAN_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const getCurrentMonthLabel = (): string => {
  const d = new Date();
  return `${INDONESIAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

const AUDIT_STATUS_OPTIONS = [
  {
    id: "Tidak Mengerjakan",
    label: "Tidak Mengerjakan",
    desc: "Lewat batas toleransi tanpa submit",
    badgeClass: "bg-rose-100 border-rose-300 text-rose-800",
    dotClass: "bg-rose-600",
  },
  {
    id: "Masalah",
    label: "Ada Masalah",
    desc: "Ditemukan butir tidak sesuai",
    badgeClass: "bg-amber-100 border-amber-300 text-amber-800",
    dotClass: "bg-amber-500",
  },
  {
    id: "Sesuai",
    label: "Sesuai SOP",
    desc: "Seluruh aspek audit memenuhi standar",
    badgeClass: "bg-emerald-100 border-emerald-300 text-emerald-800",
    dotClass: "bg-emerald-500",
  },
] as const;

export default function LaporanPage() {
  const [reports, setReports] = useState<AuditReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingRowId, setDownloadingRowId] = useState<string | null>(null);
  const [isExportingAll, setIsExportingAll] = useState(false);

  // Workspace Switcher States
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [currentWorkspaceName, setCurrentWorkspaceName] = useState<string>("Workspace");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("Semua Toko");
  const [selectedSchedule, setSelectedSchedule] = useState<string>("Semua Jadwal");
  const [selectedMonth, setSelectedMonth] = useState<string>("Bulan Ini");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "Tidak Mengerjakan",
    "Masalah",
  ]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic filter dropdown options
  const [storeOptions, setStoreOptions] = useState<string[]>(["Semua Toko"]);
  const [scheduleOptions, setScheduleOptions] = useState<string[]>(["Semua Jadwal"]);
  const [monthOptions, setMonthOptions] = useState<string[]>(["Bulan Ini", "Semua Bulan"]);

  // Stores cache for resolving store picture in Toko column
  const [stores, setStores] = useState<StoreItem[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Report for Full Detail View
  const [selectedReportToView, setSelectedReportToView] = useState<AuditReportItem | null>(null);

  // Close Status Dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(e.target as Node)
      ) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Store photo lookup map based on storeName
  const storePhotoMap = useMemo(() => {
    const map = new Map<string, string>();
    stores.forEach((s) => {
      if (s.name && s.storePicture) {
        map.set(s.name.trim().toLowerCase(), s.storePicture);
      }
    });
    return map;
  }, [stores]);

  // Load Data from Backend
  const loadReportsData = useCallback(async (showLoading = true, customWsId?: string) => {
    if (showLoading) setIsLoading(true);

    try {
      const activeWs = AuthService.getActiveWorkspace();
      const wsId = customWsId !== undefined ? customWsId : (selectedWorkspaceId || activeWs?.id);

      const [liveReports, meta] = await Promise.all([
        ReportService.fetchAll({ workspaceId: wsId }),
        ReportService.fetchMeta(wsId),
      ]);

      if (Array.isArray(liveReports)) {
        setReports(liveReports);

        const dynamicStores = Array.from(new Set(["Semua Toko", ...(meta.stores || []), ...liveReports.map((r) => r.storeName)]));
        const dynamicSchedules = Array.from(new Set(["Semua Jadwal", ...(meta.schedules || []), ...liveReports.map((r) => r.scheduleName)]));

        const rawMonths = Array.from(new Set([...(meta.months || []), ...liveReports.map((r) => r.month)].filter(Boolean)));
        const cleanedMonths = rawMonths.filter((m) => m !== "Semua Bulan" && m !== "Bulan Ini");
        setMonthOptions(["Bulan Ini", "Semua Bulan", ...cleanedMonths]);

        setStoreOptions(dynamicStores);
        setScheduleOptions(dynamicSchedules);
      }

      // Load store data for store thumbnail in table
      TokoService.fetchAll(wsId).then(setStores).catch(() => {});
    } catch (err) {
      console.warn("Gagal memuat laporan audit dari backend:", err);
      const fallback = ReportService.getAll();
      setReports(fallback);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWorkspaceId]);

  const loadReportsDataRef = useRef(loadReportsData);
  useEffect(() => {
    loadReportsDataRef.current = loadReportsData;
  }, [loadReportsData]);

  const selectedWsIdRef = useRef(selectedWorkspaceId);
  useEffect(() => {
    selectedWsIdRef.current = selectedWorkspaceId;
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
      loadReportsDataRef.current(true, targetWsId);
    };

    init();

    const handleWsChange = () => {
      const activeWs = AuthService.getActiveWorkspace();
      if (activeWs?.id && activeWs.id !== selectedWsIdRef.current) {
        setSelectedWorkspaceId(activeWs.id);
        setCurrentWorkspaceName(activeWs.name);
        setSelectedStore("Semua Toko");
        setSelectedSchedule("Semua Jadwal");
        setSelectedMonth("Bulan Ini");
        setSelectedStatuses(["Tidak Mengerjakan", "Masalah"]);
        setSearchTerm("");
        setCurrentPage(1);
        loadReportsDataRef.current(true, activeWs.id);
      }
    };

    window.addEventListener("workspace-changed", handleWsChange);
    return () => {
      window.removeEventListener("workspace-changed", handleWsChange);
    };
  }, []);

  const toggleStatus = (statusId: string) => {
    setSelectedStatuses((prev) => {
      const next = prev.includes(statusId)
        ? prev.filter((s) => s !== statusId)
        : [...prev, statusId];
      return next;
    });
    setCurrentPage(1);
  };

  const handleWorkspaceChange = async (newWsId: string) => {
    const chosen = workspaces.find((w) => w.id === newWsId);
    if (chosen?.status === "Nonaktif") {
      toast.error(`Workspace "${chosen.companyName || chosen.name}" sedang nonaktif dan tidak dapat dipilih.`);
      return;
    }

    setSelectedWorkspaceId(newWsId);
    setSelectedStore("Semua Toko");
    setSelectedSchedule("Semua Jadwal");
    setSelectedMonth("Bulan Ini");
    setSelectedStatuses(["Tidak Mengerjakan", "Masalah"]);
    setSearchTerm("");
    setCurrentPage(1);

    if (chosen) {
      const name = chosen.companyName || chosen.name;
      setCurrentWorkspaceName(name);
      AuthService.setActiveWorkspace({ id: chosen.id, name });
      toast.info(`Menampilkan laporan untuk workspace "${name}"`);
    }
    await loadReportsData(true, newWsId);
  };

  // Filtered Reports
  const filteredReports = useMemo(() => {
    const currentMonthLabel = getCurrentMonthLabel().toLowerCase();

    return reports.filter((item) => {
      // 1. Search Query
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match =
          item.storeName.toLowerCase().includes(q) ||
          item.storeLocation.toLowerCase().includes(q) ||
          item.auditorName.toLowerCase().includes(q) ||
          item.scheduleName.toLowerCase().includes(q);
        if (!match) return false;
      }

      // 2. Store Filter
      if (selectedStore !== "Semua Toko" && item.storeName !== selectedStore) {
        return false;
      }

      // 3. Schedule Filter
      if (selectedSchedule !== "Semua Jadwal" && item.scheduleName !== selectedSchedule) {
        return false;
      }

      // 4. Month Filter (Default: "Bulan Ini")
      if (selectedMonth === "Bulan Ini") {
        if (item.month.toLowerCase() !== currentMonthLabel) {
          return false;
        }
      } else if (selectedMonth !== "Semua Bulan" && item.month.toLowerCase() !== selectedMonth.toLowerCase()) {
        return false;
      }

      // 5. Status Filter (Multi-select Checkbox, Default: ["Tidak Mengerjakan", "Masalah"])
      if (selectedStatuses.length > 0 && selectedStatuses.length < AUDIT_STATUS_OPTIONS.length) {
        if (!selectedStatuses.includes(item.status)) {
          return false;
        }
      } else if (selectedStatuses.length === 0) {
        return false;
      }

      return true;
    });
  }, [reports, searchTerm, selectedStore, selectedSchedule, selectedMonth, selectedStatuses]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredReports.length / itemsPerPage) || 1;
  const paginatedReports = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReports.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReports, currentPage, itemsPerPage]);

  const totalFilteredCount = filteredReports.length;
  const startItem = totalFilteredCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalFilteredCount);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedStore("Semua Toko");
    setSelectedSchedule("Semua Jadwal");
    setSelectedMonth("Bulan Ini");
    setSelectedStatuses(["Tidak Mengerjakan", "Masalah"]);
    setCurrentPage(1);
    toast.info("Filter telah direset ke default (Bulan Ini, Tidak Mengerjakan & Masalah).");
  };

  // Export handlers
  const handleExportAll = async () => {
    if (isExportingAll || filteredReports.length === 0) return;
    try {
      setIsExportingAll(true);
      await exportAllFilteredReportsToZip(filteredReports, currentWorkspaceName);
    } finally {
      setIsExportingAll(false);
    }
  };

  const handleExportCsv = () => {
    exportReportsToCsv(filteredReports, currentWorkspaceName);
  };

  const handleExportSingle = async (item: AuditReportItem) => {
    if (downloadingRowId) return;
    try {
      setDownloadingRowId(item.id);
      await exportSingleReport(item);
    } finally {
      setDownloadingRowId(null);
    }
  };

  // Active filter pills determination
  const hasActiveFilters =
    selectedMonth !== "Semua Bulan" ||
    (selectedStatuses.length > 0 && selectedStatuses.length < AUDIT_STATUS_OPTIONS.length) ||
    selectedStatuses.length === 0 ||
    selectedStore !== "Semua Toko" ||
    selectedSchedule !== "Semua Jadwal" ||
    searchTerm !== "";

  return (
    <DashboardLayout>
      {selectedReportToView ? (
        /* Detailed Report View */
        <DetailLaporanView
          report={selectedReportToView}
          onBack={() => setSelectedReportToView(null)}
        />
      ) : (
        /* Report Table List View */
        <>
          {/* Page Header with Workspace Switcher like in Jadwal Audit */}
          <Header
            title="Laporan Audit"
            subtitle={`Rekapitulasi dan evaluasi kepatuhan operasional checklist audit toko di ${currentWorkspaceName}.`}
            action={
              isSuperAdmin && workspaces.length > 0 ? (
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

          {/* Main Container */}
          <div className="space-y-4">
            {/* Filter Toolbar Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Top Controls Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Pencarian */}
                <div className="lg:col-span-1 sm:col-span-2 lg:col-span-1">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Pencarian
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Cari toko, auditor, atau checklist..."
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* 2. Pilih Toko */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Pilih Toko
                  </label>
                  <div className="relative">
                    <select
                      value={selectedStore}
                      onChange={(e) => {
                        setSelectedStore(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] appearance-none cursor-pointer"
                    >
                      {storeOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 3. Nama Jadwal */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Nama Jadwal
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSchedule}
                      onChange={(e) => {
                        setSelectedSchedule(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] appearance-none cursor-pointer"
                    >
                      {scheduleOptions.map((sc) => (
                        <option key={sc} value={sc}>
                          {sc}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 4. Rentang Bulan (Default: Bulan Ini) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Rentang Bulan
                  </label>
                  <div className="relative">
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] appearance-none cursor-pointer"
                    >
                      {monthOptions.map((m) => (
                        <option key={m} value={m}>
                          {m === "Bulan Ini" ? `Bulan Ini (${getCurrentMonthLabel()})` : m}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 5. Status Audit (Multi-Select Checkbox) */}
                <div className="relative" ref={statusDropdownRef}>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1.5">
                    Status Audit
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsStatusDropdownOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53] transition-colors cursor-pointer text-left"
                  >
                    <div className="truncate pr-2">
                      {selectedStatuses.length === AUDIT_STATUS_OPTIONS.length ? (
                        <span className="text-slate-700 font-semibold">Semua Status (3)</span>
                      ) : selectedStatuses.length === 0 ? (
                        <span className="text-rose-500 font-semibold italic">0 Status Dipilih</span>
                      ) : (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#193f53] text-[10px] font-bold text-white shrink-0">
                            {selectedStatuses.length}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">
                            {selectedStatuses.join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                        isStatusDropdownOpen ? "rotate-180 text-[#193f53]" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Popover (Geser otomatis ke kiri agar tidak terpotong layar/wadah) */}
                  {isStatusDropdownOpen && (
                    <div className="absolute right-0 mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-2.5rem)] bg-white rounded-xl shadow-xl border border-slate-200 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 px-1">
                        <span className="text-[11px] font-bold text-slate-700">Filter Status Audit</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStatuses(["Tidak Mengerjakan", "Masalah", "Sesuai"]);
                              setCurrentPage(1);
                            }}
                            className="text-[10px] font-semibold text-[#193f53] hover:underline cursor-pointer"
                          >
                            Pilih Semua
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStatuses([]);
                              setCurrentPage(1);
                            }}
                            className="text-[10px] font-semibold text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            Kosongkan
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {AUDIT_STATUS_OPTIONS.map((st) => {
                          const isChecked = selectedStatuses.includes(st.id);
                          return (
                            <div
                              key={st.id}
                              onClick={() => toggleStatus(st.id)}
                              className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                                isChecked
                                  ? "bg-slate-50 hover:bg-slate-100/70"
                                  : "hover:bg-slate-50/50 opacity-60 hover:opacity-100"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors shrink-0 ${
                                  isChecked
                                    ? "bg-[#193f53] border-[#193f53] text-white"
                                    : "border-slate-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                                    {st.label}
                                  </span>
                                  <span
                                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${st.dotClass}`}
                                    title={st.label}
                                  />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                                  {st.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 px-1 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="text-[10px] italic">Bisa pilih lebih dari 1</span>
                        <button
                          type="button"
                          onClick={() => setIsStatusDropdownOpen(false)}
                          className="text-[10px] font-bold text-[#193f53] hover:underline cursor-pointer"
                        >
                          Tutup
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Filter Aktif & Action Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                {/* Active Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Filter Aktif:</span>

                  {/* Multi-Status Pills */}
                  {selectedStatuses.length > 0 && selectedStatuses.length < AUDIT_STATUS_OPTIONS.length && (
                    selectedStatuses.map((st) => {
                      const cfg = AUDIT_STATUS_OPTIONS.find((c) => c.id === st);
                      return (
                        <span
                          key={st}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${cfg?.badgeClass || "bg-slate-100 border-slate-200 text-slate-700"}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dotClass || "bg-slate-400"}`} />
                          Status: {st === "Masalah" ? "Ada Masalah" : st}
                          <button
                            type="button"
                            onClick={() => toggleStatus(st)}
                            className="ml-0.5 hover:opacity-75 cursor-pointer"
                            title={`Hapus filter status ${st}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })
                  )}

                  {selectedStatuses.length === 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 border border-rose-200 text-rose-700">
                      <AlertCircle className="w-3 h-3 text-rose-600" />
                      Status: 0 status dipilih
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatuses(["Tidak Mengerjakan", "Masalah", "Sesuai"]);
                          setCurrentPage(1);
                        }}
                        className="underline hover:text-rose-900 ml-1 cursor-pointer font-bold"
                      >
                        Pilih Semua
                      </button>
                    </span>
                  )}

                  {/* Month Pill */}
                  {selectedMonth !== "Semua Bulan" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                      Rentang: {selectedMonth === "Bulan Ini" ? `Bulan Ini (${getCurrentMonthLabel()})` : selectedMonth}
                      <button
                        type="button"
                        onClick={() => setSelectedMonth("Semua Bulan")}
                        className="hover:text-slate-900 ml-0.5 cursor-pointer"
                        title="Tampilkan Semua Bulan"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {/* Store Pill */}
                  {selectedStore !== "Semua Toko" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                      Toko: {selectedStore}
                      <button
                        type="button"
                        onClick={() => setSelectedStore("Semua Toko")}
                        className="hover:text-slate-900 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {/* Schedule Pill */}
                  {selectedSchedule !== "Semua Jadwal" && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 border border-slate-200 text-slate-700">
                      Jadwal: {selectedSchedule}
                      <button
                        type="button"
                        onClick={() => setSelectedSchedule("Semua Jadwal")}
                        className="hover:text-slate-900 ml-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}

                  {!hasActiveFilters && (
                    <span className="text-[11px] text-slate-400 italic">Tidak ada filter aktif (menampilkan seluruh data)</span>
                  )}
                </div>

                {/* Right Buttons */}
                <div className="flex items-center gap-3 shrink-0">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}

                  {filteredReports.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleExportAll}
                        disabled={isExportingAll}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#193f53] hover:bg-[#143343] disabled:opacity-70 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                        title="Unduh arsip ZIP berisi file-file PDF individual per gerai dan rekapitulasi CSV standar korporat"
                      >
                        {isExportingAll ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengemas {filteredReports.length} PDF (ZIP)...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Ekspor ZIP ({filteredReports.length} PDF)</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer border border-slate-200"
                        title="Ekspor rekapitulasi seluruh data laporan ke file CSV standar korporat (Microsoft Excel & Google Sheets)"
                      >
                        CSV Korporat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Table Container */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        TOKO
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        NAMA JADWAL
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        STAFF PELAKSANA
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        WAKTU SUBMIT
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        STATUS
                      </th>
                      <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">
                        ACTION
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-6 h-6 text-[#193f53] animate-spin" />
                            <span className="text-xs font-semibold text-slate-700">
                              Memuat data laporan audit...
                            </span>
                            <span className="text-[11px] text-slate-400">
                              Menghubungkan ke database
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : paginatedReports.length > 0 ? (
                      paginatedReports.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Toko */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3 max-w-[220px]">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 overflow-hidden shadow-2xs relative">
                                {storePhotoMap.get(row.storeName.trim().toLowerCase()) ? (
                                  <DecryptedImage
                                    src={storePhotoMap.get(row.storeName.trim().toLowerCase())!}
                                    alt={row.storeName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Store className="w-3.5 h-3.5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 leading-tight">
                                  {row.storeName}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Nama Jadwal */}
                          <td className="px-5 py-3.5">
                            <div className="inline-flex items-start gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-2xs max-w-[200px] leading-snug">
                              <FileCheck className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                              <span className="break-words font-normal text-slate-700">{row.scheduleName}</span>
                            </div>
                          </td>

                          {/* Staff Pelaksana */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {row.status === "Tidak Mengerjakan" || !row.auditorName || row.auditorName === "-" ? (
                              <span className="text-xs font-semibold text-slate-400 italic">-</span>
                            ) : (
                              <>
                                <p className="text-xs font-bold text-slate-900 leading-tight">
                                  {row.auditorName}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {row.auditorRole && row.auditorRole !== "-" ? row.auditorRole : ""}
                                </p>
                              </>
                            )}
                          </td>

                          {/* Waktu Submit */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <p className="text-xs font-bold text-slate-900 leading-tight">
                              {row.submitDate}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {row.submitTime}
                            </p>
                          </td>

                          {/* Status & Priority */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            {row.status === "Tidak Mengerjakan" ? (
                              <div className="flex flex-col gap-0.5 items-start">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-100 border border-rose-300 text-rose-800 whitespace-nowrap">
                                  <AlertCircle className="w-3 h-3 text-rose-700 shrink-0" />
                                  <span>Tidak Mengerjakan</span>
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wider bg-rose-200 text-rose-900 border border-rose-300">
                                  Tidak Patuh
                                </span>
                              </div>
                            ) : row.status === "Masalah" ? (
                              <div className="flex flex-col gap-0.5 items-start">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-50 border border-rose-200 text-rose-600 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  <span>Masalah ({row.issueCount})</span>
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                                  Priority High
                                </span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-0.5 items-start">
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 whitespace-nowrap">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span>Sesuai</span>
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[8px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                  Priority Low
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedReportToView(row)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Lihat Detail Laporan"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleExportSingle(row)}
                                disabled={downloadingRowId === row.id}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
                                title="Unduh Laporan PDF"
                              >
                                {downloadingRowId === row.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-[#193f53]" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                            <Search className="w-5 h-5" />
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-800">
                            Tidak Ada Laporan Ditemukan
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                            Tidak ada laporan audit yang cocok dengan filter yang dipilih. Coba atur ulang kata kunci atau filter status.
                          </p>
                          <button
                            onClick={handleResetFilters}
                            className="mt-3.5 px-3.5 py-1.5 bg-[#193f53] text-white rounded-lg text-xs font-semibold hover:bg-[#143343] transition-colors cursor-pointer"
                          >
                            Reset Filter
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Section */}
              {!isLoading && paginatedReports.length > 0 && (
                <div className="p-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
                  <p className="text-[11px] text-slate-500">
                    Menampilkan{" "}
                    <span className="font-bold text-slate-900">
                      {startItem}-{endItem}
                    </span>{" "}
                    dari{" "}
                    <span className="font-bold text-slate-900">
                      {totalFilteredCount} laporan audit
                    </span>
                  </p>

                  <div className="flex gap-1 text-[11px]">
                    {/* Prev Button */}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className={`w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 transition-colors ${
                        currentPage === 1
                          ? "text-slate-300 border-slate-100 cursor-not-allowed"
                          : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                          currentPage === page
                            ? "bg-[#193f53] text-white shadow-2xs"
                            : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`px-3 h-7 flex items-center justify-center rounded-md border border-slate-200 font-bold ml-1 transition-colors ${
                        currentPage === totalPages
                          ? "text-slate-300 border-slate-100 cursor-not-allowed"
                          : "text-slate-600 hover:bg-slate-50 cursor-pointer"
                      }`}
                    >
                      Selanjutnya <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

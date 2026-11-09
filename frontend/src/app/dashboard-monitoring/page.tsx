"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MonitoringHeader, {
  getCurrentMonthDateRange,
  getDynamicMonthOptions,
} from "./components/MonitoringHeader";
import MetricCards, { MetricStats } from "./components/MetricCards";
import AuditStatusDonutChart from "./components/AuditStatusDonutChart";
import AuditTrendLineChart from "./components/AuditTrendLineChart";
import StorePerformanceRanking from "./components/StorePerformanceRanking";
import FindingsAnalysis from "./components/FindingsAnalysis";
import { AuthService } from "@/lib/auth";
import { WorkspaceService } from "@/services/workspace.service";
import { Workspace } from "@/types/workspace";
import {
  DashboardService,
  AuditStatusSegment,
  WeeklyTrendItem,
  StoreRankingItem,
  FindingsAnalysisData,
} from "@/services/dashboard.service";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function DashboardMonitoringPage() {
  const dynamicMonthOptions = getDynamicMonthOptions();
  const initialDateRange = getCurrentMonthDateRange();

  const [selectedMonth, setSelectedMonth] = useState(dynamicMonthOptions[0]);
  const [selectedStore, setSelectedStore] = useState("Semua Toko");
  const [selectedStatus, setSelectedStatus] = useState("Status Audit");
  const [startDate, setStartDate] = useState(initialDateRange.startDate);
  const [endDate, setEndDate] = useState(initialDateRange.endDate);
  const [activeWorkspaceName, setActiveWorkspaceName] = useState<string>("");
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>("");
  const [isWorkspaceInactive, setIsWorkspaceInactive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Super Admin Workspace Switching
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  // Store options from backend
  const [storeOptions, setStoreOptions] = useState<string[]>(["Semua Toko"]);

  // Dynamic metrics state (Tanpa Data Statik Palsu)
  const [metrics, setMetrics] = useState<MetricStats>({
    totalStores: 0,
    completedAudits: 0,
    pendingAudits: 0,
    totalFindings: 0,
    resolvedFindings: 0,
    openFindings: 0,
  });

  // Charts state
  const [auditStatusSegments, setAuditStatusSegments] = useState<AuditStatusSegment[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<WeeklyTrendItem[]>([]);
  const [storeRanking, setStoreRanking] = useState<StoreRankingItem[]>([]);
  const [findingsAnalysis, setFindingsAnalysis] = useState<FindingsAnalysisData>({
    priorities: [],
    totalFindings: 0,
    topStores: [],
  });

  // Guard untuk mencegah infinite fetching
  const isFetchingRef = useRef(false);

  // Function to load dashboard stats from backend
  const loadDashboardData = useCallback(
    async (targetWsId?: string, forceLoading = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      if (forceLoading) setIsLoading(true);

      try {
        const activeWs = AuthService.getActiveWorkspace();
        const user = AuthService.getCurrentUser();
        const wsId = targetWsId || activeWorkspaceId || activeWs?.id || user?.workspaceId;

        const data = await DashboardService.fetchMonitoringStats({
          workspaceId: wsId,
          storeName: selectedStore,
          startDate,
          endDate,
          month: selectedMonth,
          status: selectedStatus,
        });

        if (data) {
          if (data.workspace?.name) {
            setActiveWorkspaceName(data.workspace.name);
          }
          if (data.metrics) setMetrics(data.metrics);
          if (Array.isArray(data.auditStatusSegments)) setAuditStatusSegments(data.auditStatusSegments);
          if (Array.isArray(data.weeklyTrend)) setWeeklyTrend(data.weeklyTrend);
          if (Array.isArray(data.storeRanking)) setStoreRanking(data.storeRanking);
          if (data.findingsAnalysis) setFindingsAnalysis(data.findingsAnalysis);
          if (Array.isArray(data.stores) && data.stores.length > 0) {
            setStoreOptions(data.stores);
          }
        }
      } catch (err) {
        console.warn("Gagal memuat data dashboard monitoring:", err);
      } finally {
        setIsLoading(false);
        isFetchingRef.current = false;
      }
    },
    [activeWorkspaceId, selectedStore, startDate, endDate, selectedMonth, selectedStatus]
  );

  // Switch workspace handler
  const handleWorkspaceChange = async (newWsId: string) => {
    const chosen = workspaces.find((w) => w.id === newWsId);
    if (chosen?.status === "Nonaktif") {
      setIsWorkspaceInactive(true);
    } else {
      setIsWorkspaceInactive(false);
    }

    const name = chosen?.companyName || chosen?.name || "Workspace";
    setActiveWorkspaceId(newWsId);
    setActiveWorkspaceName(name);
    AuthService.setActiveWorkspace({ id: newWsId, name });
    setSelectedStore("Semua Toko");
    await loadDashboardData(newWsId, true);
  };

  // Initial setup and Workspace status check (Hanya jalan sekali saat mount)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlWsId = new URLSearchParams(window.location.search).get("workspaceId");
      const activeWs = AuthService.getActiveWorkspace();
      const currentUser = AuthService.getCurrentUser();
      const isSA = currentUser?.role === "Super Admin";
      setIsSuperAdmin(isSA);

      let id = urlWsId || activeWs?.id || currentUser?.workspaceId || "";
      let name = activeWs?.name || currentUser?.workspaceName || "Workspace";

      WorkspaceService.fetchAll()
        .then((wsList) => {
          setWorkspaces(wsList);
          if (wsList.length > 0) {
            const found = wsList.find(
              (w) => (id && w.id === id) || w.name === name || w.companyName === name
            );
            if (found) {
              name = found.companyName || found.name;
              id = found.id;
              setActiveWorkspaceName(name);
              setActiveWorkspaceId(id);
              AuthService.setActiveWorkspace({ id, name });
              setIsWorkspaceInactive(found.status === "Nonaktif");
            } else {
              const firstActive = wsList.find((w) => w.status !== "Nonaktif") || wsList[0];
              name = firstActive.companyName || firstActive.name;
              id = firstActive.id;
              setActiveWorkspaceName(name);
              setActiveWorkspaceId(id);
              AuthService.setActiveWorkspace({ id, name });
              setIsWorkspaceInactive(firstActive.status === "Nonaktif");
            }
          }
          loadDashboardData(id, true);
        })
        .catch(() => {
          setActiveWorkspaceName(name);
          setActiveWorkspaceId(id);
          loadDashboardData(id, true);
        });

      const handleWsChange = () => {
        const updatedWs = AuthService.getActiveWorkspace();
        if (updatedWs?.id) {
          setActiveWorkspaceId(updatedWs.id);
          setActiveWorkspaceName(updatedWs.name);
          setSelectedStore("Semua Toko");
          loadDashboardData(updatedWs.id, true);
        }
      };

      window.addEventListener("workspace-changed", handleWsChange);
      return () => {
        window.removeEventListener("workspace-changed", handleWsChange);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload data HANYA saat filter berubah secara spesifik
  useEffect(() => {
    if (activeWorkspaceId) {
      loadDashboardData(activeWorkspaceId, false);
    }
  }, [selectedStore, selectedStatus, startDate, endDate, selectedMonth, activeWorkspaceId, loadDashboardData]);

  return (
    <DashboardLayout contentClassName="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5 w-full mx-auto max-w-[1440px]">
      {/* 1. Header & Filters Toolbar */}
      <MonitoringHeader
        activeWorkspaceName={activeWorkspaceName}
        workspaces={workspaces}
        selectedWorkspaceId={activeWorkspaceId}
        onWorkspaceChange={handleWorkspaceChange}
        isSuperAdmin={isSuperAdmin}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
        storeOptions={storeOptions}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
      />

      {/* Warning Banner: Jika Workspace Dinonaktifkan */}
      {isWorkspaceInactive && (
        <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50/90 p-3 sm:p-4 text-rose-800 shadow-2xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-rose-900">Workspace Dinonaktifkan - Seluruh Sistem Diberhentikan</h4>
            <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
              Workspace &quot;{activeWorkspaceName}&quot; saat ini berstatus <strong>Nonaktif</strong>. Seluruh proses audit, jadwal berkala, penugasan toko, dan checklist operasional untuk unit kerja ini diberhentikan sementara hingga workspace diaktifkan kembali.
            </p>
          </div>
        </div>
      )}

      {/* Efek Loading Bersih seperti Log Jadwal (Tanpa spinner di tiap card) */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 shadow-2xs flex flex-col items-center justify-center gap-2 my-4">
          <Loader2 className="w-7 h-7 text-[#193f53] animate-spin" />
          <span className="text-xs font-bold text-slate-800">
            Memuat data dashboard monitoring...
          </span>
          <span className="text-[11px] text-slate-400">
            Menghubungkan ke database & memuat performa gerai {activeWorkspaceName || "Workspace"}
          </span>
        </div>
      ) : (
        <>
          {/* 2. Top Summary Metric Cards Row (4 Cards) */}
          <MetricCards stats={metrics} />

          {/* 3. Middle Charts Row: Status Audit (Donut) & Tren Hasil Audit (Line) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5 mb-3 sm:mb-3.5">
            <AuditStatusDonutChart data={auditStatusSegments} />
            <AuditTrendLineChart data={weeklyTrend} monthLabel={selectedMonth} />
          </div>

          {/* 4. Bottom Charts Row: Performa per Toko (Ranking) & Analisis Temuan (Dual Column) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
            <StorePerformanceRanking data={storeRanking} />
            <FindingsAnalysis data={findingsAnalysis} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

"use client";

import React, { useState, useEffect } from "react";
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
import { AlertTriangle } from "lucide-react";

export default function DashboardMonitoringPage() {
  const dynamicMonthOptions = getDynamicMonthOptions();
  const initialDateRange = getCurrentMonthDateRange();

  const [selectedMonth, setSelectedMonth] = useState(dynamicMonthOptions[0]);
  const [selectedStore, setSelectedStore] = useState("Semua Toko (10)");
  const [selectedStatus, setSelectedStatus] = useState("Status Audit");
  const [startDate, setStartDate] = useState(initialDateRange.startDate);
  const [endDate, setEndDate] = useState(initialDateRange.endDate);
  const [activeWorkspaceName, setActiveWorkspaceName] = useState<string>("");
  const [isWorkspaceInactive, setIsWorkspaceInactive] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const activeWs = AuthService.getActiveWorkspace();
      const currentUser = AuthService.getCurrentUser();
      const name = activeWs?.name || currentUser?.workspaceName || "";
      setActiveWorkspaceName(name);

      WorkspaceService.fetchAll()
        .then((wsList) => {
          const targetId = activeWs?.id;
          const found = wsList.find(
            (w) => (targetId && w.id === targetId) || w.name === name || w.companyName === name
          );
          if (found && found.status === "Nonaktif") {
            setIsWorkspaceInactive(true);
          }
        })
        .catch(console.warn);
    }
  }, []);

  // Dynamic metrics state matching the screenshot
  const [metrics] = useState<MetricStats>({
    totalStores: 10,
    completedAudits: 78,
    pendingAudits: 12,
    totalFindings: 24,
    resolvedFindings: 18,
    openFindings: 6,
  });

  return (
    <DashboardLayout>
      {/* 1. Header & Filters Toolbar */}
      <MonitoringHeader
        activeWorkspaceName={activeWorkspaceName}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        selectedStore={selectedStore}
        onStoreChange={setSelectedStore}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
      />

      {/* Warning Banner: Jika Workspace Dinonaktifkan */}
      {isWorkspaceInactive && (
        <div className="mb-5 rounded-2xl border border-rose-300 bg-rose-50/90 p-4 sm:p-5 text-rose-800 shadow-xs flex items-start gap-3.5">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm text-rose-900">Workspace Dinonaktifkan - Seluruh Sistem Diberhentikan</h4>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              Workspace &quot;{activeWorkspaceName}&quot; saat ini berstatus <strong>Nonaktif</strong>. Seluruh proses audit, jadwal berkala, penugasan toko, dan checklist operasional untuk unit kerja ini diberhentikan sementara hingga workspace diaktifkan kembali.
            </p>
          </div>
        </div>
      )}

      {/* 2. Top Summary Metric Cards Row (4 Cards) */}
      <MetricCards stats={metrics} />

      {/* 3. Middle Charts Row: Status Audit (Donut) & Tren Hasil Audit (Line) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 mb-5 sm:mb-6">
        <AuditStatusDonutChart />
        <AuditTrendLineChart />
      </div>

      {/* 4. Bottom Charts Row: Performa per Toko (Ranking) & Analisis Temuan (Dual Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <StorePerformanceRanking />
        <FindingsAnalysis />
      </div>
    </DashboardLayout>
  );
}

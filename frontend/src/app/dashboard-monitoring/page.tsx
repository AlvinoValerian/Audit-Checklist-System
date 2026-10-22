"use client";

import React, { useState } from "react";
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

export default function DashboardMonitoringPage() {
  const dynamicMonthOptions = getDynamicMonthOptions();
  const initialDateRange = getCurrentMonthDateRange();

  const [selectedMonth, setSelectedMonth] = useState(dynamicMonthOptions[0]);
  const [selectedStore, setSelectedStore] = useState("Semua Toko (10)");
  const [selectedStatus, setSelectedStatus] = useState("Status Audit");
  const [startDate, setStartDate] = useState(initialDateRange.startDate);
  const [endDate, setEndDate] = useState(initialDateRange.endDate);

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

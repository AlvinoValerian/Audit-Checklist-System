"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown, Building2 } from "lucide-react";
import { Workspace } from "@/types/workspace";

interface MonitoringHeaderProps {
  activeWorkspaceName?: string;
  workspaces?: Workspace[];
  selectedWorkspaceId?: string;
  onWorkspaceChange?: (workspaceId: string) => void;
  isSuperAdmin?: boolean;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedStore: string;
  onStoreChange: (store: string) => void;
  storeOptions?: string[];
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
}

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

const MONTH_NAMES_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// Helper to calculate first and last day of current month dynamically
export function getCurrentMonthDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const endDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

// Generate dynamic month options relative to the current real-time date
export function getDynamicMonthOptions() {
  const now = new Date();
  const options: string[] = [];

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mShort = MONTH_NAMES_SHORT[d.getMonth()];
    const year = d.getFullYear();

    if (i === 0) {
      options.push(`Bulan Ini (${mShort} ${year})`);
    } else if (i === 1) {
      options.push(`Bulan Lalu (${mShort} ${year})`);
    } else {
      const mFull = MONTH_NAMES_FULL[d.getMonth()];
      options.push(`${mFull} ${year}`);
    }
  }

  // Opsi Semua Bulan agar sinkron dengan total laporan keseluruhan
  options.push("Semua Bulan");

  return options;
}

export default function MonitoringHeader({
  activeWorkspaceName,
  workspaces,
  selectedWorkspaceId,
  onWorkspaceChange,
  isSuperAdmin,
  selectedMonth,
  onMonthChange,
  selectedStore,
  onStoreChange,
  storeOptions: customStoreOptions,
  selectedStatus,
  onStatusChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}: MonitoringHeaderProps) {
  const initialRange = useMemo(() => getCurrentMonthDateRange(), []);

  const [internalStartDate, setInternalStartDate] = useState(
    startDate || initialRange.startDate
  );
  const [internalEndDate, setInternalEndDate] = useState(
    endDate || initialRange.endDate
  );

  const monthOptions = useMemo(() => getDynamicMonthOptions(), []);

  useEffect(() => {
    setInternalStartDate(startDate || "");
  }, [startDate]);

  useEffect(() => {
    setInternalEndDate(endDate || "");
  }, [endDate]);

  const defaultStoreOptions = [
    "Semua Toko",
  ];

  const storeOptions = customStoreOptions && customStoreOptions.length > 0 ? customStoreOptions : defaultStoreOptions;

  const statusOptions = [
    "Status Audit",
    "Selesai",
    "Tidak Mengerjakan",
    "Terlambat",
  ];

  const handleStartChange = (val: string) => {
    setInternalStartDate(val);
    onStartDateChange?.(val);
  };

  const handleEndChange = (val: string) => {
    setInternalEndDate(val);
    onEndDateChange?.(val);
  };

  const handleMonthSelect = (mText: string) => {
    onMonthChange(mText);

    if (mText === "Semua Bulan") {
      setInternalStartDate("");
      setInternalEndDate("");
      onStartDateChange?.("");
      onEndDateChange?.("");
      return;
    }

    // Automatically synchronize date inputs with the selected month
    const now = new Date();
    const idx = monthOptions.indexOf(mText);
    if (idx !== -1 && idx < monthOptions.length - 1) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - idx, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const sDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const eDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      
      setInternalStartDate(sDate);
      setInternalEndDate(eDate);
      onStartDateChange?.(sDate);
      onEndDateChange?.(eDate);
    }
  };

  return (
    <div className="mb-3.5 space-y-1.5">
      {/* Baris 1: Judul di kiri & Filter Controls di kanan */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        {/* Kiri: Judul & Subtitle */}
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight shrink-0">
            Dashboard Monitoring
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau analitik, kepatuhan audit, dan performa gerai pada unit kerja <strong>{activeWorkspaceName || "Workspace"}</strong>.
          </p>
        </div>

        {/* Kanan: Filter Toolbar & Tombol Switch Workspace Tepat di Bawah Filter Tanggal */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Baris Filter (Bulan, Toko, Status, Tanggal) */}
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap overflow-x-auto max-w-full py-0.5">
            {/* No 5: Dropdown Bulan */}
            <div className="relative shrink-0">
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthSelect(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg px-2 py-1 pr-5.5 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors h-7.5"
              >
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* No 6: Dropdown Toko */}
            <div className="relative shrink-0">
              <select
                value={selectedStore}
                onChange={(e) => onStoreChange(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg px-2 py-1 pr-5.5 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors h-7.5"
              >
                {storeOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* No 7: Dropdown Status Audit */}
            <div className="relative shrink-0">
              <select
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="appearance-none bg-white border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg px-2 py-1 pr-5.5 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors h-7.5"
              >
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* No 8: Tanggal Mulai */}
            <input
              type="date"
              value={internalStartDate}
              onChange={(e) => handleStartChange(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg px-1.5 py-1 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors w-[108px] h-7.5 shrink-0"
            />

            {/* No 9: Tanggal Selesai */}
            <input
              type="date"
              value={internalEndDate}
              onChange={(e) => handleEndChange(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-[11px] font-medium rounded-lg px-1.5 py-1 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors w-[108px] h-7.5 shrink-0"
            />
          </div>

          {/* Tombol Switch Workspace Tepat di Bawah Filter Tanggal */}
          {isSuperAdmin && workspaces && workspaces.length > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400 shrink-0">Workspace:</span>
              <div className="relative inline-flex items-center bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-2xs hover:border-slate-300 transition-colors h-6.5">
                <Building2 className="w-3 h-3 text-[#193f53] mr-1 shrink-0" />
                <select
                  value={selectedWorkspaceId}
                  onChange={(e) => onWorkspaceChange?.(e.target.value)}
                  className="appearance-none bg-transparent text-slate-800 text-[11px] font-bold pr-4 outline-none cursor-pointer"
                >
                  {workspaces.map((w) => {
                    const isInactive = w.status === "Nonaktif";
                    return (
                      <option
                        key={w.id}
                        value={w.id}
                        disabled={isInactive}
                        className={isInactive ? "text-slate-400 bg-slate-100 italic" : "text-slate-800 font-medium"}
                      >
                        {w.companyName || w.name} {isInactive ? "(Nonaktif)" : `(${w.storeCount} Toko)`}
                      </option>
                    );
                  })}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          ) : activeWorkspaceName ? (
            <div className="flex items-center gap-1.5 bg-slate-50 text-slate-700 px-2 py-0.5 rounded-lg text-[11px] font-semibold border border-slate-200 shadow-2xs">
              <Building2 className="w-3 h-3 text-[#193f53] shrink-0" />
              <span>Workspace: <strong>{activeWorkspaceName}</strong></span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

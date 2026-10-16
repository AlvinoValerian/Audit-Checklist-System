"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChevronDown } from "lucide-react";

interface MonitoringHeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedStore: string;
  onStoreChange: (store: string) => void;
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

  return options;
}

export default function MonitoringHeader({
  selectedMonth,
  onMonthChange,
  selectedStore,
  onStoreChange,
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
    if (startDate) setInternalStartDate(startDate);
  }, [startDate]);

  useEffect(() => {
    if (endDate) setInternalEndDate(endDate);
  }, [endDate]);

  const storeOptions = [
    "Semua Toko (10)",
    "Toko A",
    "Toko B",
    "Toko C",
    "Toko D",
    "Toko E",
    "Toko F",
    "Toko G",
    "Toko H",
    "Toko I",
    "Toko J",
  ];

  const statusOptions = [
    "Status Audit",
    "Selesai",
    "Sedang Berjalan",
    "Belum Dilakukan",
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

    // Automatically synchronize date inputs with the selected month
    const now = new Date();
    const idx = monthOptions.indexOf(mText);
    if (idx !== -1) {
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
    <div className="mb-6 space-y-1">
      {/* Baris 1: No 1 (Judul) di kiri & No 5-9 (Filter) di kanan */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* No 1: Judul */}
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight shrink-0">
          Dashboard Monitoring
        </h1>

        {/* No 5-9: Filter Controls Toolbar (Semua dalam 1 baris) */}
        <div className="flex items-center gap-1.5 shrink-0 flex-nowrap overflow-x-auto max-w-full py-0.5">
          {/* No 5: Dropdown Bulan */}
          <div className="relative shrink-0">
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthSelect(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2 py-1.5 pr-6 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* No 6: Dropdown Toko */}
          <div className="relative shrink-0">
            <select
              value={selectedStore}
              onChange={(e) => onStoreChange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2 py-1.5 pr-6 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors"
            >
              {storeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* No 7: Dropdown Status Audit */}
          <div className="relative shrink-0">
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2 py-1.5 pr-6 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors"
            >
              {statusOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* No 8: Tanggal Mulai */}
          <input
            type="date"
            value={internalStartDate}
            onChange={(e) => handleStartChange(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2 py-1.5 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors w-[114px] shrink-0"
          />

          {/* No 9: Tanggal Selesai */}
          <input
            type="date"
            value={internalEndDate}
            onChange={(e) => handleEndChange(e.target.value)}
            className="bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg px-2 py-1.5 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors w-[114px] shrink-0"
          />
        </div>
      </div>

      {/* Baris 2: No 4 (Deskripsi) di bawah judul */}
      <div>
        <p className="text-xs sm:text-sm text-slate-500">
          Pantau kondisi dan performa seluruh toko dalam Workspace A
        </p>
      </div>
    </div>
  );
}
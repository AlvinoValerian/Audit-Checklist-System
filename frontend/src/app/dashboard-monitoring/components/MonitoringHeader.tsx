"use client";

import React, { useState } from "react";
import { ChevronDown, Filter, X, RotateCcw } from "lucide-react";

interface MonitoringHeaderProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  selectedStore: string;
  onStoreChange: (store: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
}

export default function MonitoringHeader({
  selectedMonth,
  onMonthChange,
  selectedStore,
  onStoreChange,
  selectedStatus,
  onStatusChange,
}: MonitoringHeaderProps) {
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [auditorFilter, setAuditorFilter] = useState("Semua Auditor");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");

  const monthOptions = [
    "Bulan Ini (Okt 2023)",
    "Bulan Lalu (Sep 2023)",
    "Agustus 2023",
    "Juli 2023",
    "Semester 2 2023",
  ];

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

  const handleResetFilters = () => {
    onMonthChange("Bulan Ini (Okt 2023)");
    onStoreChange("Semua Toko (10)");
    onStatusChange("Status Audit");
    setAuditorFilter("Semua Auditor");
    setCategoryFilter("Semua Kategori");
    setIsFilterModalOpen(false);
  };

  return (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Dashboard Monitoring
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Pantau kondisi dan performa seluruh toko dalam Workspace A
        </p>
      </div>

      {/* Filter Controls Toolbar */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {/* Dropdown 1: Bulan */}
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg px-3.5 py-2 pr-8 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown 2: Toko */}
        <div className="relative">
          <select
            value={selectedStore}
            onChange={(e) => onStoreChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg px-3.5 py-2 pr-8 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors"
          >
            {storeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Dropdown 3: Status Audit */}
        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg px-3.5 py-2 pr-8 shadow-2xs hover:border-slate-300 focus:border-[#193f53] outline-none cursor-pointer transition-colors"
          >
            {statusOptions.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Button 4: Filter Lainnya */}
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193f53] hover:bg-[#143343] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Filter Lainnya</span>
        </button>
      </div>

      {/* Filter Lainnya Modal / Drawer */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#193f53]" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Filter Tambahan Monitoring
                </h3>
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Kategori Toko
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-[#193f53]"
                >
                  <option value="Semua Kategori">Semua Kategori</option>
                  <option value="Supermarket">Supermarket</option>
                  <option value="Minimarket">Minimarket</option>
                  <option value="Express Outlet">Express Outlet</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Auditor Penanggung Jawab
                </label>
                <select
                  value={auditorFilter}
                  onChange={(e) => setAuditorFilter(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-800 outline-none focus:border-[#193f53]"
                >
                  <option value="Semua Auditor">Semua Auditor</option>
                  <option value="Rian Hidayat">Rian Hidayat</option>
                  <option value="Siti Rahmawati">Siti Rahmawati</option>
                  <option value="Budi Santoso">Budi Santoso</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Rentang Tanggal Khusus
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none"
                    defaultValue="2023-10-01"
                  />
                  <input
                    type="date"
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none"
                    defaultValue="2023-10-31"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="px-4 py-2 bg-[#193f53] hover:bg-[#143343] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

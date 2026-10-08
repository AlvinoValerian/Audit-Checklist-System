"use client";

import React, { useState } from "react";
import { X, Filter, RotateCcw, Check } from "lucide-react";

export interface GalleryFilterState {
  dateRange: "all" | "7d" | "30d" | "this_month";
  category: string;
  onlyIssues: boolean;
}

interface FilterModalProps {
  isOpen: boolean;
  filters: GalleryFilterState;
  onClose: () => void;
  onApply: (newFilters: GalleryFilterState) => void;
  onReset: () => void;
}

const CATEGORY_OPTIONS = [
  "Semua Kategori",
  "Area Kasir & POS",
  "Display & Merchandising",
  "Peralatan & Chiller",
  "Kebersihan & Sanitasi",
  "Keamanan & Loss Prevention",
];

export default function FilterModal({
  isOpen,
  filters,
  onClose,
  onApply,
  onReset,
}: FilterModalProps) {
  const [localFilters, setLocalFilters] = useState<GalleryFilterState>(filters);

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetState: GalleryFilterState = {
      dateRange: "all",
      category: "Semua Kategori",
      onlyIssues: false,
    };
    setLocalFilters(resetState);
    onReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="bg-white rounded-2xl w-full max-w-md relative z-10 flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Filter Galeri Audit</h3>
              <p className="text-[11px] text-slate-500">Sesuaikan parameter tampilan foto inspeksi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Date Range Options */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Rentang Waktu
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "all", label: "Semua Waktu" },
                { id: "7d", label: "7 Hari Terakhir" },
                { id: "30d", label: "30 Hari Terakhir" },
                { id: "this_month", label: "Bulan Ini" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLocalFilters({ ...localFilters, dateRange: item.id as any })}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer ${
                    localFilters.dateRange === item.id
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-2xs"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
              Kategori Area
            </label>
            <select
              value={localFilters.category}
              onChange={(e) => setLocalFilters({ ...localFilters, category: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53]"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Only Issues Toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
              <input
                type="checkbox"
                checked={localFilters.onlyIssues}
                onChange={(e) => setLocalFilters({ ...localFilters, onlyIssues: e.target.checked })}
                className="mt-0.5 rounded border-slate-300 text-[#193f53] focus:ring-[#193f53] w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Hanya Toko dengan Temuan Issue
                </span>
                <span className="text-[11px] text-slate-500">
                  Menyaring hanya checklist yang memiliki catatan ketidaksesuaian.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Filter
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#193f53] hover:bg-[#143343] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

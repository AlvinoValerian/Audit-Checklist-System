"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";

export interface SmartAuditPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (size: number) => void;
  pageSizeOptions?: number[];
  itemName?: string;

  // Inovasi 2: Segmented Timeline / Month Scrubber
  months?: string[];
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  currentMonthLabel?: string;
}

type PageItem = number | "ellipsis-left" | "ellipsis-right";

export default function SmartAuditPagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  itemName = "laporan audit",
  months,
  selectedMonth,
  onMonthChange,
  currentMonthLabel,
}: SmartAuditPaginationProps) {
  // State untuk Inovasi 1: Clickable Jump Popover
  const [activePopover, setActivePopover] = useState<"left" | "right" | null>(null);
  const [jumpPageInput, setJumpPageInput] = useState<string>("");
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setActivePopover(null);
      }
    }
    if (activePopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activePopover]);

  // Perhitungan item start & end
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Algoritma Smart Sliding Window (Maksimal 7 item tombol)
  const pageItems = useMemo((): PageItem[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Dekat awal: 1, 2, 3, 4, 5, ..., totalPages
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis-right", totalPages];
    }

    // Dekat akhir: 1, ..., N-4, N-3, N-2, N-1, N
    if (currentPage >= totalPages - 3) {
      return [
        1,
        "ellipsis-left",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    // Di tengah: 1, ..., cur-1, cur, cur+1, ..., totalPages
    return [
      1,
      "ellipsis-left",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis-right",
      totalPages,
    ];
  }, [currentPage, totalPages]);

  // Handle lompat ke halaman dari popover
  const handleJumpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = parseInt(jumpPageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange(target);
      setActivePopover(null);
      setJumpPageInput("");
    }
  };

  const openPopover = (type: "left" | "right") => {
    // Berikan saran default yang cerdas di input
    if (type === "left") {
      const mid = Math.max(1, Math.floor(currentPage / 2));
      setJumpPageInput(String(mid));
    } else {
      const mid = Math.min(
        totalPages,
        Math.floor((currentPage + totalPages) / 2)
      );
      setJumpPageInput(String(mid));
    }
    setActivePopover(type);
  };

  if (totalItems === 0) return null;

  return (
    <div className="p-4 border-t border-slate-100 bg-white space-y-3.5">
      {/* INOVASI 2: Segmented Timeline / Month Scrubber (Khusus Konteks Audit) */}
      {months && months.length > 0 && onMonthChange && (
        <div className="flex items-center justify-between gap-3 flex-wrap pb-1 border-b border-slate-100/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin scrollbar-thumb-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-[#193f53]" />
              Periode Audit:
            </span>
            {months.map((m) => {
              const isSelected = selectedMonth?.toLowerCase() === m.toLowerCase();
              const label =
                m === "Bulan Ini" && currentMonthLabel
                  ? `Bulan Ini (${currentMonthLabel})`
                  : m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    onMonthChange(m);
                    onPageChange(1);
                  }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? "bg-[#193f53] text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Pagination Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Info Items & Rows per Page Selector */}
        <div className="flex items-center gap-3 text-[11px] text-slate-500 w-full sm:w-auto justify-between sm:justify-start">
          <p>
            Menampilkan{" "}
            <span className="font-bold text-slate-900">
              {startItem}-{endItem}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-slate-900">
              {totalItems} {itemName}
            </span>
          </p>

          {/* Rows Per Page Selector */}
          {onItemsPerPageChange && (
            <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline text-slate-500">Baris:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  onItemsPerPageChange(Number(e.target.value));
                  onPageChange(1);
                }}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#193f53] cursor-pointer"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size} / hal
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Buttons / Controls */}
        <div className="flex items-center gap-1 text-[11px] relative self-center sm:self-auto">
          {/* Previous Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            aria-label="Halaman Sebelumnya"
            className={`h-7 px-2.5 flex items-center justify-center rounded-md border border-slate-200 transition-colors mr-1 ${
              currentPage === 1
                ? "text-slate-300 border-slate-100 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-50 cursor-pointer font-bold"
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
            <span className="inline font-bold">Sebelumnya</span>
          </button>

          {/* Smart Number Buttons (Desktop & Tablet) */}
          <div className="hidden sm:flex items-center gap-1">
            {pageItems.map((item, idx) => {
              if (item === "ellipsis-left" || item === "ellipsis-right") {
                const popoverType = item === "ellipsis-left" ? "left" : "right";
                const isOpen = activePopover === popoverType;

                return (
                  <div key={`${item}-${idx}`} className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        isOpen ? setActivePopover(null) : openPopover(popoverType)
                      }
                      title="Klik untuk loncat ke nomor halaman tertentu"
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors cursor-pointer border ${
                        isOpen
                          ? "bg-slate-200 text-[#193f53] border-slate-300 ring-2 ring-[#193f53]/20"
                          : "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {/* INOVASI 1: Jump Popover Modal */}
                    {isOpen && (
                      <div
                        ref={popoverRef}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-3 min-w-[210px] animate-in fade-in zoom-in-95"
                      >
                        <div className="text-[11px] font-bold text-slate-800 mb-1 flex items-center justify-between">
                          <span>Lompat ke Halaman</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            1 - {totalPages}
                          </span>
                        </div>
                        <form onSubmit={handleJumpSubmit} className="flex gap-1.5 mt-2">
                          <input
                            type="number"
                            min={1}
                            max={totalPages}
                            value={jumpPageInput}
                            onChange={(e) => setJumpPageInput(e.target.value)}
                            placeholder={`1-${totalPages}`}
                            autoFocus
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/30"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 bg-[#193f53] text-white rounded-lg text-xs font-bold hover:bg-[#143343] transition-colors flex items-center gap-0.5 shrink-0 cursor-pointer"
                          >
                            <span>Go</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </form>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span>Tekan Enter ↵</span>
                          <button
                            type="button"
                            onClick={() => setActivePopover(null)}
                            className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Normal Page Button
              const isCurrent = currentPage === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => onPageChange(item)}
                  className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-xs transition-colors cursor-pointer ${
                    isCurrent
                      ? "bg-[#193f53] text-white shadow-2xs"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Compact View for Mobile Screens (<sm) */}
          <div className="flex sm:hidden items-center px-2 font-bold text-slate-700 text-xs">
            <span>{currentPage}</span>
            <span className="text-slate-400 mx-1">/</span>
            <span className="text-slate-500">{totalPages}</span>
          </div>

          {/* Next Button */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            aria-label="Halaman Selanjutnya"
            className={`h-7 px-2.5 flex items-center justify-center rounded-md border border-slate-200 transition-colors ml-1 ${
              currentPage === totalPages
                ? "text-slate-300 border-slate-100 cursor-not-allowed"
                : "text-slate-600 hover:bg-slate-50 cursor-pointer font-bold"
            }`}
          >
            <span className="inline font-bold">Selanjutnya</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

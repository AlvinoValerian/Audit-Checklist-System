"use client";

import React from "react";
import { SearchX, RotateCcw, Plus } from "lucide-react";

export interface EmptyStateTableProps {
  colSpan?: number;
  asCard?: boolean;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  isFiltered?: boolean;
  onResetFilters?: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export default function EmptyStateTable({
  colSpan,
  asCard = false,
  icon,
  title = "Tidak Ada Data Ditemukan",
  description = "Tidak ada data yang cocok dengan kriteria filter atau pencarian Anda.",
  isFiltered = false,
  onResetFilters,
  onAction,
  actionLabel = "Tambah Data Baru",
}: EmptyStateTableProps) {
  const content = (
    <div className="max-w-md mx-auto flex flex-col items-center justify-center">
      {/* Icon Box with Dual Ring / Soft Shadow */}
      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs flex items-center justify-center text-[#193f53] mb-3.5 transition-transform hover:scale-105">
        {icon ? (
          icon
        ) : (
          <SearchX className="w-6 h-6 text-slate-400 stroke-[1.8]" />
        )}
      </div>

      {/* Heading Title */}
      <h4 className="text-sm font-bold text-slate-800 leading-snug">
        {title}
      </h4>

      {/* Subtitle Description */}
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
        {description}
      </p>

      {/* Action Buttons Row */}
      {(onResetFilters || onAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {/* Reset Filter Button */}
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200/80 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Filter</span>
            </button>
          )}

          {/* Primary Action Button (e.g. Tambah Data) */}
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#193f53] hover:bg-[#143343] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{actionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  if (asCard) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl py-14 px-6 text-center shadow-xs">
        {content}
      </div>
    );
  }

  return (
    <tr>
      <td colSpan={colSpan || 1} className="py-14 px-6 text-center">
        {content}
      </td>
    </tr>
  );
}

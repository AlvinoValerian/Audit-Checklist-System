"use client";

import React from "react";

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  hasThumbnail?: boolean;
}

export default function TableSkeleton({
  rows = 7,
  cols = 6,
  hasThumbnail = true,
}: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => {
        // Variasi lebar teks agar tampak natural seperti data asli
        const widthVariants = [
          ["w-36", "w-24", "w-28", "w-20"],
          ["w-44", "w-32", "w-24", "w-24"],
          ["w-32", "w-28", "w-36", "w-16"],
          ["w-40", "w-20", "w-28", "w-20"],
          ["w-36", "w-36", "w-24", "w-24"],
          ["w-28", "w-24", "w-32", "w-16"],
          ["w-44", "w-28", "w-20", "w-20"],
        ];
        const widths = widthVariants[rowIdx % widthVariants.length];

        return (
          <tr key={rowIdx} className="border-b border-slate-100 animate-pulse">
            {/* Kolom 1: Avatar / Thumbnail + Judul & Subtitle */}
            <td className="py-3.5 px-4 sm:px-5">
              <div className="flex items-center gap-3">
                {hasThumbnail && (
                  <div className="w-8 h-8 rounded-lg bg-slate-200/80 shrink-0" />
                )}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className={`h-3.5 bg-slate-200 rounded ${widths[0]}`} />
                  <div className="h-2.5 bg-slate-100 rounded w-20" />
                </div>
              </div>
            </td>

            {/* Kolom 2: Teks Utama */}
            {cols >= 2 && (
              <td className="py-3.5 px-4">
                <div className="space-y-1.5">
                  <div className={`h-3 bg-slate-200/80 rounded ${widths[1]}`} />
                  <div className="h-2.5 bg-slate-100 rounded w-16" />
                </div>
              </td>
            )}

            {/* Kolom 3: User / Informasi Kedua */}
            {cols >= 3 && (
              <td className="py-3.5 px-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-200/80 shrink-0" />
                  <div className={`h-3 bg-slate-200/80 rounded ${widths[2]}`} />
                </div>
              </td>
            )}

            {/* Kolom 4: Tanggal / Waktu */}
            {cols >= 4 && (
              <td className="py-3.5 px-4">
                <div className="space-y-1">
                  <div className={`h-3 bg-slate-200/80 rounded ${widths[3]}`} />
                  <div className="h-2 bg-slate-100 rounded w-12" />
                </div>
              </td>
            )}

            {/* Kolom 5: Status Badge */}
            {cols >= 5 && (
              <td className="py-3.5 px-4 text-center">
                <div className="inline-block w-20 h-5 rounded-full bg-slate-200/70" />
              </td>
            )}

            {/* Kolom 6+: Action Buttons */}
            {cols >= 6 && (
              <td className="py-3.5 px-4 text-right">
                <div className="inline-flex items-center justify-end gap-1.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-200/70" />
                  <div className="w-7 h-7 rounded-lg bg-slate-200/70" />
                </div>
              </td>
            )}

            {/* Jika ada kolom ekstra > 6 */}
            {cols > 6 &&
              Array.from({ length: cols - 6 }).map((_, extraIdx) => (
                <td key={extraIdx} className="py-3.5 px-4 text-center">
                  <div className="h-3 bg-slate-200/70 rounded w-16 mx-auto" />
                </td>
              ))}
          </tr>
        );
      })}
    </>
  );
}

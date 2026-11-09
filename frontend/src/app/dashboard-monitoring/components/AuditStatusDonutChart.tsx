"use client";

import React, { useState } from "react";

export interface AuditStatusSegment {
  name: string;
  value: number;
  color: string;
}

interface AuditStatusDonutChartProps {
  data?: AuditStatusSegment[];
}

export default function AuditStatusDonutChart({ data }: AuditStatusDonutChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Slices configuration: Selesai, Tidak Mengerjakan (Merah), Terlambat (Kuning)
  const emptySegments: AuditStatusSegment[] = [
    { name: "Selesai", value: 0, color: "#193f53" },
    { name: "Tidak Mengerjakan", value: 0, color: "#dc2626" },
    { name: "Terlambat", value: 0, color: "#eab308" },
  ];

  const segments = data && data.length > 0 ? data : emptySegments;
  const total = segments.reduce((acc, curr) => acc + curr.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius; // ~326.73

  let currentAngle = 0;
  const renderedSlices = segments.map((seg, idx) => {
    const strokeDash = total > 0 ? (seg.value / total) * circumference : 0;
    const sliceAngle = total > 0 ? (seg.value / total) * 360 : 0;
    const startAngle = currentAngle;
    currentAngle += sliceAngle;
    const percentage = total > 0 ? Math.round((seg.value / total) * 100) : 0;

    return {
      ...seg,
      percentage,
      strokeDash,
      startAngle,
      index: idx,
    };
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
          Status Audit Seluruh Toko
        </h3>
      </div>

      {/* Donut Chart Visual */}
      <div className="relative flex items-center justify-center py-2 my-auto">
        <svg
          viewBox="0 0 140 140"
          className="w-32 h-32 sm:w-36 sm:h-36 transform -rotate-90"
        >
          {/* Background Track */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="20"
          />

          {/* Slices */}
          {total > 0 &&
            renderedSlices.map((slice) => {
              const isHovered = hoveredIndex === slice.index;
              return (
                <circle
                  key={slice.name}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={isHovered ? 23 : 20}
                  strokeDasharray={`${slice.strokeDash} ${circumference - slice.strokeDash}`}
                  strokeDashoffset={0}
                  transform={`rotate(${slice.startAngle} 70 70)`}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(slice.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })}
        </svg>

        {/* Center Text (Total or Hovered Info) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hoveredIndex !== null && renderedSlices[hoveredIndex] ? (
            <div className="text-center animate-in fade-in zoom-in-95 duration-150">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                {renderedSlices[hoveredIndex].name}
              </span>
              <span className="text-xl font-black text-slate-900 block leading-tight mt-0.5">
                {renderedSlices[hoveredIndex].value}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 block">
                {renderedSlices[hoveredIndex].percentage}% dari total
              </span>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">
                Total
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900 block leading-none my-0.5">
                {total}
              </span>
              <span className="text-[9px] font-semibold text-slate-500 block">
                Audit
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2.5 border-t border-slate-100 mt-1 text-[11px]">
        {renderedSlices.map((seg) => (
          <div
            key={seg.name}
            className="flex items-center gap-1.5 cursor-pointer group"
            onMouseEnter={() => setHoveredIndex(seg.index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-slate-600 font-medium group-hover:text-slate-900 transition-colors">
              {seg.name} ({seg.value})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

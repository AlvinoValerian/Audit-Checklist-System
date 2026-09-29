"use client";

import React, { useState } from "react";

export default function AuditStatusDonutChart() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Slices configuration: Selesai, Belum Dilakukan, Terlambat
  const segments = [
    {
      name: "Selesai",
      value: 78,
      color: "#193f53",
    },
    {
      name: "Belum Dilakukan",
      value: 12,
      color: "#cbd5e1",
    },
    {
      name: "Terlambat",
      value: 8,
      color: "#dc2626",
    },
  ];

  const total = segments.reduce((acc, curr) => acc + curr.value, 0);
  const radius = 58;
  const circumference = 2 * Math.PI * radius; // ~364.42

  let currentAngle = 0;
  const renderedSlices = segments.map((seg, idx) => {
    const strokeDash = (seg.value / total) * circumference;
    const sliceAngle = (seg.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += sliceAngle;
    const percentage = Math.round((seg.value / total) * 100);

    return {
      ...seg,
      percentage,
      strokeDash,
      startAngle,
      index: idx,
    };
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
          Status Audit Seluruh Toko
        </h3>
      </div>

      {/* Donut Chart Visual */}
      <div className="relative flex items-center justify-center py-4 my-auto">
        <svg
          viewBox="0 0 160 160"
          className="w-44 h-44 sm:w-48 sm:h-48 transform -rotate-90"
        >
          {/* Background Track */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="24"
          />

          {/* Slices */}
          {renderedSlices.map((slice) => {
            const isHovered = hoveredIndex === slice.index;
            return (
              <circle
                key={slice.name}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? 27 : 24}
                strokeDasharray={`${slice.strokeDash} ${circumference - slice.strokeDash}`}
                strokeDashoffset={0}
                transform={`rotate(${slice.startAngle} 80 80)`}
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(slice.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center Hover Details */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {hoveredIndex !== null ? (
            <div className="text-center animate-in fade-in duration-150">
              <span className="text-[11px] font-semibold text-slate-500 block leading-tight">
                {renderedSlices[hoveredIndex].name}
              </span>
              <span className="text-xl font-bold text-slate-900 block leading-tight mt-0.5">
                {renderedSlices[hoveredIndex].value}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {renderedSlices[hoveredIndex].percentage}%
              </span>
            </div>
          ) : (
            <div className="text-center">
              <span className="text-[10px] font-medium text-slate-400 block uppercase tracking-wider">
                Total
              </span>
              <span className="text-xl font-bold text-slate-900 block leading-tight">
                {total}
              </span>
              <span className="text-[10px] text-slate-400">Audit</span>
            </div>
          )}
        </div>
      </div>

      {/* Legend below donut berjejer (single row) */}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 border-t border-slate-100 text-xs">
        {renderedSlices.map((item, idx) => (
          <div
            key={item.name}
            className={`flex items-center gap-2 cursor-pointer transition-opacity ${
              hoveredIndex !== null && hoveredIndex !== idx ? "opacity-40" : "opacity-100"
            }`}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-600 text-[11px] sm:text-xs font-medium whitespace-nowrap">
              {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

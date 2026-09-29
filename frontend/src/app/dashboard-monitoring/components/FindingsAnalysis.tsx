"use client";

import React, { useState } from "react";

export default function FindingsAnalysis() {
  const [hoveredPriority, setHoveredPriority] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // 1. Data Berdasarkan Prioritas
  const priorities = [
    { name: "High", count: 8, color: "#cc0000", percentage: 33 },
    // { name: "Medium", count: 12, color: "#ea580c", percentage: 50 },
    { name: "Low", count: 4, color: "#0f172a", percentage: 17 },
  ];

  const totalPriority = priorities.reduce((acc, curr) => acc + curr.count, 0); // 24
  const radius = 38;
  const circumference = 2 * Math.PI * radius; // ~238.76

  let currentAngle = 0;
  const renderedPrioritySlices = priorities.map((p, idx) => {
    const strokeDash = (p.count / totalPriority) * circumference;
    const sliceAngle = (p.count / totalPriority) * 360;
    const startAngle = currentAngle;
    currentAngle += sliceAngle;
    return {
      ...p,
      strokeDash,
      startAngle,
      index: idx,
    };
  });

  // 2. Data Top 5 Toko Temuan Terbanyak
  const topStores = [
    { name: "Toko J", count: 5 },
    { name: "Toko H", count: 4 },
    { name: "Toko I", count: 3 },
    { name: "Toko F", count: 3 },
    { name: "Toko G", count: 2 },
  ];

  const maxVal = 5;
  const yTicks = [5, 4, 3, 2, 1, 0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
          Analisis Temuan
        </h3>
      </div>

      {/* Two Sub-columns inside */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-auto">
        {/* ========================================================
            SUB-COL 1: Berdasarkan Prioritas
           ======================================================== */}
        <div className="flex flex-col items-center justify-between">
          <span className="text-xs font-semibold text-slate-600 mb-2 self-start">
            Berdasarkan Prioritas
          </span>

          {/* Donut Visual */}
          <div className="relative flex items-center justify-center my-auto py-2">
            <svg
              viewBox="0 0 110 110"
              className="w-28 h-28 sm:w-32 sm:h-32 transform -rotate-90"
            >
              <circle
                cx="55"
                cy="55"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="16"
              />

              {renderedPrioritySlices.map((slice) => {
                const isHovered = hoveredPriority === slice.index;
                return (
                  <circle
                    key={slice.name}
                    cx="55"
                    cy="55"
                    r={radius}
                    fill="transparent"
                    stroke={slice.color}
                    strokeWidth={isHovered ? 19 : 16}
                    strokeDasharray={`${slice.strokeDash} ${circumference - slice.strokeDash}`}
                    strokeDashoffset={0}
                    transform={`rotate(${slice.startAngle} 55 55)`}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredPriority(slice.index)}
                    onMouseLeave={() => setHoveredPriority(null)}
                  />
                );
              })}
            </svg>

            {/* Inner Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {hoveredPriority !== null ? (
                <div className="text-center animate-in fade-in duration-100">
                  <span className="text-[10px] font-semibold text-slate-500 block leading-none">
                    {priorities[hoveredPriority].name}
                  </span>
                  <span className="text-base font-bold text-slate-900 block leading-tight mt-0.5">
                    {priorities[hoveredPriority].count}
                  </span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-base font-bold text-slate-900 block leading-tight">
                    {totalPriority}
                  </span>
                  <span className="text-[9px] text-slate-400">Temuan</span>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-3 pt-3 text-[11px]">
            {priorities.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 cursor-pointer"
                onMouseEnter={() => setHoveredPriority(idx)}
                onMouseLeave={() => setHoveredPriority(null)}
              >
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 font-medium">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            SUB-COL 2: Top 5 Toko Temuan Terbanyak
           ======================================================== */}
        <div className="flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-600 mb-2">
            Top 5 Toko Temuan Terbanyak
          </span>

          {/* SVG Vertical Bar Chart */}
          <div className="relative w-full overflow-hidden pt-1">
            <svg
              viewBox="0 0 210 160"
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Y-axis guidelines and numbers */}
              {yTicks.map((tick) => {
                const y = 15 + ((maxVal - tick) / maxVal) * 90; // y from 15 to 105
                return (
                  <g key={tick}>
                    <text
                      x="16"
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="9.5"
                      className="fill-slate-400 font-medium"
                    >
                      {tick}
                    </text>
                    <line
                      x1="22"
                      y1={y}
                      x2="200"
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  </g>
                );
              })}

              {/* Bars and Labels */}
              {topStores.map((item, idx) => {
                const isHovered = hoveredBar === item.name;
                const barWidth = 14;
                const startX = 35;
                const gap = 34;
                const x = startX + idx * gap;
                const barHeight = (item.count / maxVal) * 90;
                const y = 105 - barHeight;

                return (
                  <g
                    key={item.name}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredBar(item.name)}
                    onMouseLeave={() => setHoveredBar(null)}
                  >
                    {/* The Bar */}
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="2"
                      className={`transition-all duration-200 ${
                        isHovered ? "fill-[#193f53]" : "fill-slate-500"
                      }`}
                    />

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <g className="animate-in fade-in zoom-in-95 duration-100">
                        <rect
                          x={x + barWidth / 2 - 28}
                          y={y - 20}
                          width="56"
                          height="16"
                          rx="3"
                          fill="#0f172a"
                        />
                        <text
                          x={x + barWidth / 2}
                          y={y - 8}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#ffffff"
                          fontWeight="bold"
                        >
                          {item.count} Temuan
                        </text>
                      </g>
                    )}

                    {/* Angled X-axis Label placed safely below the baseline */}
                    <text
                      x={x + barWidth / 2 + 2}
                      y={120}
                      textAnchor="end"
                      fontSize="9.5"
                      transform={`rotate(-45 ${x + barWidth / 2 + 2} 120)`}
                      className="fill-slate-500 font-medium select-none"
                    >
                      {item.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

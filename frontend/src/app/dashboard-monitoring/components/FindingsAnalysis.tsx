"use client";

import React, { useState } from "react";
import { FindingsAnalysisData } from "@/services/dashboard.service";

interface FindingsAnalysisProps {
  data?: FindingsAnalysisData;
}

export default function FindingsAnalysis({ data }: FindingsAnalysisProps) {
  const [hoveredPriority, setHoveredPriority] = useState<number | null>(null);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // 1. Data Berdasarkan Prioritas (Tanpa Data Statik Palsu)
  const emptyPriorities = [
    { name: "High", count: 0, color: "#cc0000", percentage: 0 },
    { name: "Low", count: 0, color: "#eab308", percentage: 0 },
  ];

  const priorities = data?.priorities && data.priorities.length > 0 ? data.priorities : emptyPriorities;
  const totalPriority = data ? data.totalFindings : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius; // ~213.63

  let currentAngle = 0;
  const renderedPrioritySlices = priorities.map((p, idx) => {
    const strokeDash = totalPriority > 0 ? (p.count / totalPriority) * circumference : 0;
    const sliceAngle = totalPriority > 0 ? (p.count / totalPriority) * 360 : 0;
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
  const topStores = data?.topStores && data.topStores.length > 0 ? data.topStores : [];
  const maxVal = Math.max(5, ...topStores.map((t) => t.count));
  const yTicks = [maxVal, Math.round(maxVal * 0.75), Math.round(maxVal * 0.5), Math.round(maxVal * 0.25), 0];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
          Analisis Temuan
        </h3>
      </div>

      {/* Two Sub-columns inside */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-auto">
        {/* ========================================================
            SUB-COL 1: Berdasarkan Prioritas
           ======================================================== */}
        <div className="flex flex-col items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-600 mb-1 self-start">
            Berdasarkan Prioritas
          </span>

          {/* Donut Visual */}
          <div className="relative flex items-center justify-center my-auto py-1">
            <svg
              viewBox="0 0 96 96"
              className="w-24 h-24 sm:w-26 sm:h-26 transform -rotate-90"
            >
              <circle
                cx="48"
                cy="48"
                r={radius}
                fill="transparent"
                stroke="#f1f5f9"
                strokeWidth="14"
              />

              {totalPriority > 0 ? (
                renderedPrioritySlices.map((slice) => {
                  const isHovered = hoveredPriority === slice.index;
                  return (
                    <circle
                      key={slice.name}
                      cx="48"
                      cy="48"
                      r={radius}
                      fill="transparent"
                      stroke={slice.color}
                      strokeWidth={isHovered ? 17 : 14}
                      strokeDasharray={`${slice.strokeDash} ${circumference - slice.strokeDash}`}
                      strokeDashoffset={0}
                      transform={`rotate(${slice.startAngle} 48 48)`}
                      className="transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredPriority(slice.index)}
                      onMouseLeave={() => setHoveredPriority(null)}
                    />
                  );
                })
              ) : (
                <circle
                  cx="48"
                  cy="48"
                  r={radius}
                  fill="transparent"
                  stroke="#f1f5f9"
                  strokeWidth="14"
                />
              )}
            </svg>

            {/* Inner Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {hoveredPriority !== null && priorities[hoveredPriority] ? (
                <div className="text-center animate-in fade-in duration-100">
                  <span className="text-[9px] font-semibold text-slate-500 block leading-none">
                    {priorities[hoveredPriority].name}
                  </span>
                  <span className="text-sm font-bold text-slate-900 block leading-tight mt-0.5">
                    {priorities[hoveredPriority].count}
                  </span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-sm sm:text-base font-bold text-slate-900 block leading-tight">
                    {totalPriority}
                  </span>
                  <span className="text-[8.5px] text-slate-400">Temuan</span>
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-2.5 pt-2 text-[10px]">
            {priorities.map((item, idx) => (
              <div
                key={item.name}
                className="flex items-center gap-1.5 cursor-pointer"
                onMouseEnter={() => setHoveredPriority(idx)}
                onMouseLeave={() => setHoveredPriority(null)}
              >
                <span
                  className="w-1.5 h-1.5 rounded-xs shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 font-medium">
                  {item.name} ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ========================================================
            SUB-COL 2: Top 5 Toko Temuan Terbanyak
           ======================================================== */}
        <div className="flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-slate-600 mb-1">
            Top 5 Toko Temuan Terbanyak
          </span>

          {/* SVG Vertical Bar Chart */}
          <div className="relative w-full overflow-hidden pt-0.5">
            {topStores.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span>Belum ada temuan masalah pada gerai</span>
              </div>
            ) : (
              <svg
                viewBox="0 0 230 145"
                className="w-full h-auto overflow-visible select-none"
              >
                {/* Y-axis guidelines and numbers */}
                {yTicks.map((tick, i) => {
                  const y = 14 + ((maxVal - tick) / (maxVal || 1)) * 70;
                  return (
                    <g key={`${tick}-${i}`}>
                      <text
                        x="15"
                        y={y + 3}
                        textAnchor="end"
                        fontSize="8.5"
                        className="fill-slate-400 font-medium"
                      >
                        {tick}
                      </text>
                      <line
                        x1="20"
                        y1={y}
                        x2="220"
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
                  const gap = 38;
                  const x = startX + idx * gap;
                  const barHeight = maxVal > 0 ? (item.count / maxVal) * 70 : 0;
                  const y = 84 - barHeight;

                  return (
                    <g
                      key={`${item.name}-${idx}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredBar(item.name)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* The Bar */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={Math.max(2, barHeight)}
                        rx="2.5"
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
                            fontSize="8.5"
                            fill="#ffffff"
                            fontWeight="bold"
                          >
                            {item.count} Temuan
                          </text>
                        </g>
                      )}

                      {/* Nama Toko yang Rapi dan Tidak Terpotong */}
                      <text
                        x={x + barWidth / 2}
                        y={98}
                        textAnchor="end"
                        fontSize="8.5"
                        transform={`rotate(-35 ${x + barWidth / 2} 98)`}
                        className={`font-semibold transition-colors select-none ${
                          isHovered ? "fill-[#193f53]" : "fill-slate-600"
                        }`}
                      >
                        {item.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

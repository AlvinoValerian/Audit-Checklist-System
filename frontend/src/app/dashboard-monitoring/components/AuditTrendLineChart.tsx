"use client";

import React, { useState } from "react";
import { WeeklyTrendItem } from "@/services/dashboard.service";

interface AuditTrendLineChartProps {
  data?: WeeklyTrendItem[];
  monthLabel?: string;
}

export default function AuditTrendLineChart({
  data,
  monthLabel = "Bulan Ini",
}: AuditTrendLineChartProps) {
  const [activePoint, setActivePoint] = useState<number | null>(null);

  const emptyTrend: WeeklyTrendItem[] = [
    { week: "Minggu 1", score: 0 },
    { week: "Minggu 2", score: 0 },
    { week: "Minggu 3", score: 0 },
    { week: "Minggu 4", score: 0 },
  ];

  const chartData = data && data.length > 0 ? data : emptyTrend;

  // Tentukan batas min & max sumbu Y secara adaptif
  const rawMin = Math.min(...chartData.map((d) => d.score));
  const minY = rawMin < 50 ? 0 : 50;
  const maxY = 100;
  const step = minY === 0 ? 20 : 10;
  const yValues = [];
  for (let v = maxY; v >= minY; v -= step) {
    yValues.push(v);
  }

  // SVG Chart Dimensions
  const svgWidth = 420;
  const svgHeight = 142;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 12;
  const paddingBottom = 22;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Coordinate mapping
  const points = chartData.map((d, i) => {
    const x = paddingLeft + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2);
    const range = maxY - minY || 1;
    const y = paddingTop + chartHeight - ((Math.min(maxY, Math.max(minY, d.score)) - minY) / range) * chartHeight;
    return { ...d, x, y };
  });

  // Create smooth Bezier curve SVG path
  const createSmoothPath = (pts: typeof points) => {
    if (pts.length < 2) return pts.length === 1 ? `M ${pts[0].x},${pts[0].y}` : "";
    let path = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) * 0.45;
      const cy1 = p0.y;
      const cx2 = p1.x - (p1.x - p0.x) * 0.45;
      const cy2 = p1.y;
      path += ` C ${cx1},${cy1} ${cx2},${cy2} ${p1.x},${p1.y}`;
    }
    return path;
  };

  const linePath = createSmoothPath(points);
  const lastPointX = points[points.length - 1]?.x || paddingLeft;
  const firstPointX = points[0]?.x || paddingLeft;
  const areaPath = points.length > 1
    ? `${linePath} L ${lastPointX},${paddingTop + chartHeight} L ${firstPointX},${paddingTop + chartHeight} Z`
    : "";

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-1.5">
        <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
          Tren Hasil Audit
        </h3>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[140px]">
          {monthLabel}
        </span>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full my-auto overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="auditTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal Gridlines & Y-axis labels */}
          {yValues.map((val) => {
            const range = maxY - minY || 1;
            const y = paddingTop + chartHeight - ((val - minY) / range) * chartHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="8.5"
                  className="fill-slate-400 font-medium"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          {areaPath && <path d={areaPath} fill="url(#auditTrendGrad)" />}

          {/* Smooth Line Curve */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#193f53"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          )}

          {/* Data Points and Interactivity */}
          {points.map((p, i) => {
            const isActive = activePoint === i;
            return (
              <g key={p.week} className="cursor-pointer">
                {/* Active Indicator Pulse Ring */}
                {isActive && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="7"
                    fill="#193f53"
                    fillOpacity="0.15"
                    className="animate-ping"
                  />
                )}

                {/* Visible Point Dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? "4" : "3"}
                  fill="#ffffff"
                  stroke="#193f53"
                  strokeWidth={isActive ? "2" : "1.8"}
                  className="transition-all duration-200"
                />

                {/* Transparent hit area for hover */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="14"
                  fill="transparent"
                  onMouseEnter={() => setActivePoint(i)}
                  onMouseLeave={() => setActivePoint(null)}
                />

                {/* X-axis Label (Week Name) */}
                <text
                  x={p.x}
                  y={svgHeight - 4}
                  textAnchor="middle"
                  fontSize="9"
                  className={`font-medium transition-colors select-none ${
                    isActive ? "fill-slate-800 font-bold" : "fill-slate-400"
                  }`}
                >
                  {p.week}
                </text>

                {/* Tooltip on Hover */}
                {isActive && (
                  <g className="animate-in fade-in zoom-in-95 duration-100">
                    <rect
                      x={p.x - 24}
                      y={p.y - 24}
                      width="48"
                      height="18"
                      rx="3.5"
                      fill="#0f172a"
                      className="shadow-md"
                    />
                    <text
                      x={p.x}
                      y={p.y - 12}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#ffffff"
                      fontWeight="bold"
                    >
                      {p.score}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

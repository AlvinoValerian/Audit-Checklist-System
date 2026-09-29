"use client";

import React, { useState } from "react";

export default function AuditTrendLineChart() {
  const [activePoint, setActivePoint] = useState<number | null>(null);

  // Y-axis values from 100 down to 60 with step 5, matching screenshot
  const yValues = [100, 95, 90, 85, 80, 75, 70, 65, 60];
  const minY = 60;
  const maxY = 100;

  // Data for the 4 weeks matching screenshot
  const data = [
    { week: "Minggu 1", score: 74.5 },
    { week: "Minggu 2", score: 82.0 },
    { week: "Minggu 3", score: 79.2 },
    { week: "Minggu 4", score: 87.8 },
  ];

  // SVG Chart Dimensions
  const svgWidth = 420;
  const svgHeight = 180;
  const paddingLeft = 35;
  const paddingRight = 20;
  const paddingTop = 15;
  const paddingBottom = 25;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Coordinate mapping
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y =
      paddingTop + chartHeight - ((d.score - minY) / (maxY - minY)) * chartHeight;
    return { ...d, x, y };
  });

  // Create smooth Bezier curve SVG path
  const createSmoothPath = (pts: typeof points) => {
    if (pts.length < 2) return "";
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
  const areaPath = `${linePath} L ${points[points.length - 1].x},${
    paddingTop + chartHeight
  } L ${points[0].x},${paddingTop + chartHeight} Z`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
          Tren Hasil Audit
        </h3>
        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
          Bulan Ini
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
            const y =
              paddingTop + chartHeight - ((val - minY) / (maxY - minY)) * chartHeight;
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
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="9.5"
                  className="fill-slate-400 font-medium"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill="url(#auditTrendGrad)" />

          {/* Smooth Line Curve */}
          <path
            d={linePath}
            fill="none"
            stroke="#193f53"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Interactive Data Points */}
          {points.map((pt, idx) => {
            const isHovered = activePoint === idx;
            return (
              <g
                key={pt.week}
                className="cursor-pointer"
                onMouseEnter={() => setActivePoint(idx)}
                onMouseLeave={() => setActivePoint(null)}
              >
                {/* Outer Touch Target */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Visible Node */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? "5.5" : "4"}
                  fill="#ffffff"
                  stroke="#193f53"
                  strokeWidth="2"
                  className="transition-all duration-150"
                />

                {/* Hover Tooltip Box */}
                {isHovered && (
                  <g className="animate-in fade-in zoom-in-95 duration-150">
                    <rect
                      x={pt.x - 30}
                      y={pt.y - 30}
                      width="60"
                      height="20"
                      rx="4"
                      fill="#0f172a"
                      className="shadow-md"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 16}
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#ffffff"
                      fontWeight="bold"
                    >
                      {pt.score}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* X-axis Labels */}
          {points.map((pt) => (
            <text
              key={pt.week}
              x={pt.x}
              y={svgHeight - 4}
              textAnchor="middle"
              fontSize="10"
              className="fill-slate-500 font-medium"
            >
              {pt.week}
            </text>
          ))}
        </svg>
      </div>

      {/* Legend below chart matching screenshot */}
      <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-100 text-xs">
        <span className="w-2.5 h-2.5 rounded-full border-2 border-[#193f53] bg-white shrink-0" />
        <span className="text-slate-600 text-[11px] sm:text-xs font-medium">
          Rata-rata Skor Audit
        </span>
      </div>
    </div>
  );
}

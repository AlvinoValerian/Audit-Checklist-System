"use client";

import React, { useState } from "react";

export default function StorePerformanceRanking() {
  const [hoveredStore, setHoveredStore] = useState<string | null>(null);

  // Ranked stores matching the screenshot
  const stores = [
    { name: "Toko A", score: 94 },
    { name: "Toko B", score: 90 },
    { name: "Toko C", score: 88 },
    { name: "Toko D", score: 85 },
    { name: "Toko E", score: 82 },
    { name: "Toko F", score: 78 },
    { name: "Toko G", score: 74 },
    { name: "Toko H", score: 70 },
    { name: "Toko I", score: 68 },
    { name: "Toko J", score: 67 },
  ];

  const scaleMarks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
          Performa Audit per Toko
        </h3>
      </div>

      {/* Horizontal Bar Chart List */}
      <div className="space-y-2.5 my-auto">
        {stores.map((store) => {
          const isHovered = hoveredStore === store.name;
          return (
            <div
              key={store.name}
              className="flex items-center gap-3 group cursor-pointer"
              onMouseEnter={() => setHoveredStore(store.name)}
              onMouseLeave={() => setHoveredStore(null)}
            >
              {/* Store Label */}
              <span className="w-12 sm:w-14 text-slate-600 text-xs font-medium shrink-0">
                {store.name}
              </span>

              {/* Bar Track & Fill */}
              <div className="flex-1 bg-slate-100 rounded-full h-3 sm:h-3.5 relative overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHovered ? "bg-[#143343] brightness-110" : "bg-[#193f53]"
                  }`}
                  style={{ width: `${store.score}%` }}
                />
              </div>

              {/* Hover Score Badge */}
              <span
                className={`w-9 text-right text-[11px] font-bold text-slate-700 transition-opacity ${
                  isHovered ? "opacity-100" : "opacity-0 sm:opacity-50"
                }`}
              >
                {store.score}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Bottom Scale Marks (0, 20, 40, 60, 80, 100) */}
      <div className="pt-3 border-t border-slate-100 mt-2">
        <div className="flex items-center justify-between pl-12 sm:pl-14 pr-9 text-[10px] text-slate-400 font-medium">
          {scaleMarks.map((mark) => (
            <span key={mark} className="text-center">
              {mark}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

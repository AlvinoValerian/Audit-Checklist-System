"use client";

import React from "react";

export default function DashboardSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* 1. Top Stat Cards Grid (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-slate-200 rounded w-28" />
              <div className="w-8 h-8 rounded-lg bg-slate-200/80 shrink-0" />
            </div>
            <div className="h-7 bg-slate-200 rounded w-20" />
            <div className="h-2.5 bg-slate-100 rounded w-36" />
          </div>
        ))}
      </div>

      {/* 2. Middle Row: Two Large Analytics / Chart Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart Card 1: Distribusi Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <div className="h-4 bg-slate-200 rounded w-44" />
              <div className="h-2.5 bg-slate-100 rounded w-32" />
            </div>
            <div className="w-20 h-6 bg-slate-200/70 rounded-lg" />
          </div>
          <div className="h-64 bg-slate-100/70 rounded-xl flex items-center justify-center">
            <div className="w-40 h-40 rounded-full border-8 border-slate-200/60" />
          </div>
        </div>

        {/* Chart Card 2: Tren Kepatuhan */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <div className="h-4 bg-slate-200 rounded w-40" />
              <div className="h-2.5 bg-slate-100 rounded w-28" />
            </div>
            <div className="w-24 h-6 bg-slate-200/70 rounded-lg" />
          </div>
          <div className="h-64 bg-slate-100/70 rounded-xl p-6 flex items-end justify-between gap-3">
            {Array.from({ length: 7 }).map((_, barIdx) => {
              const heights = ["h-32", "h-48", "h-40", "h-56", "h-36", "h-52", "h-44"];
              return (
                <div
                  key={barIdx}
                  className={`w-full bg-slate-200/80 rounded-t-lg ${heights[barIdx]}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Bottom Row: Table Card (Toko dengan Temuan Masalah Terbanyak) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 bg-slate-200 rounded w-48" />
            <div className="h-2.5 bg-slate-100 rounded w-36" />
          </div>
          <div className="w-24 h-6 bg-slate-200/70 rounded-lg" />
        </div>
        <div className="p-4 divide-y divide-slate-100">
          {Array.from({ length: 4 }).map((_, rowIdx) => (
            <div key={rowIdx} className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200/80 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-slate-200 rounded w-36" />
                  <div className="h-2.5 bg-slate-100 rounded w-24" />
                </div>
              </div>
              <div className="w-16 h-5 bg-slate-200/70 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

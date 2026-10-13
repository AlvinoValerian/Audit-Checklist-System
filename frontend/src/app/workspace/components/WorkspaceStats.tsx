"use client";

import React from "react";
import { BookOpen, Radio, AlertCircle, Store } from "lucide-react";
import { WorkspaceStatsData } from "@/types/workspace";

interface WorkspaceStatsProps {
  stats: WorkspaceStatsData;
}

export default function WorkspaceStats({ stats }: WorkspaceStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
      {/* Card 1: Total Workspace */}
      <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
            TOTAL WORKSPACE
          </h3>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {stats.totalWorkspaces}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Unit
          </span>
        </div>
      </div>

      {/* Card 2: Workspace Aktif */}
      <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
            WORKSPACE AKTIF
          </h3>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {stats.activeWorkspaces}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Berjalan
          </span>
        </div>
      </div>

      {/* Card 3: Workspace Nonaktif */}
      <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
            WORKSPACE NONAKTIF
          </h3>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {stats.inactiveWorkspaces}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
            Nonaktif
          </span>
        </div>
      </div>

      {/* Card 4: Total Toko Terdaftar */}
      <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
            TOTAL TOKO TERDAFTAR
          </h3>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {stats.totalStores}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            Toko
          </span>
        </div>
      </div>
    </div>
  );
}

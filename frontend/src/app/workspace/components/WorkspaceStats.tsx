"use client";

import React from "react";
import { BookOpen, Radio, AlertCircle, Store } from "lucide-react";
import { WorkspaceStatsData } from "@/types/workspace";

interface WorkspaceStatsProps {
  stats: WorkspaceStatsData;
}

export default function WorkspaceStats({ stats }: WorkspaceStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {/* Card 1: Total Workspace */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-slate-600 truncate">
            Total Workspace
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3 sm:mt-4">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            {stats.totalWorkspaces}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded-full">
            Unit
          </span>
        </div>
      </div>

      {/* Card 2: Workspace Aktif */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-slate-600 truncate">
            Workspace Aktif
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3 sm:mt-4">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-600">
            {stats.activeWorkspaces}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full">
            Berjalan
          </span>
        </div>
      </div>

      {/* Card 3: Workspace Nonaktif */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-slate-600 truncate">
            Workspace Nonaktif
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3 sm:mt-4">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-rose-600">
            {stats.inactiveWorkspaces}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-rose-700 bg-rose-50 px-1.5 sm:px-2 py-0.5 rounded-full">
            Nonaktif
          </span>
        </div>
      </div>

      {/* Card 4: Total Toko Terdaftar */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-xs font-medium text-slate-600 truncate">
            Total Toko Terdaftar
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3 sm:mt-4">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            {stats.totalStores}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-indigo-700 bg-indigo-50 px-1.5 sm:px-2 py-0.5 rounded-full">
            Toko
          </span>
        </div>
      </div>
    </div>
  );
}

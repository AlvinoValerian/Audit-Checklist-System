"use client";

import React from "react";
import { BookOpen, Radio, AlertCircle, Store } from "lucide-react";
import { WorkspaceStatsData } from "@/types/workspace";

interface WorkspaceStatsProps {
  stats: WorkspaceStatsData;
}

export default function WorkspaceStats({ stats }: WorkspaceStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Card 1: Total Workspace */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-600">
            Total Workspace
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.totalWorkspaces}
          </span>
          <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            Unit
          </span>
        </div>
      </div>

      {/* Card 2: Workspace Aktif */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Radio className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-600">
            Workspace Aktif
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
            {stats.activeWorkspaces}
          </span>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            Berjalan
          </span>
        </div>
      </div>

      {/* Card 3: Workspace Nonaktif */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-600">
            Workspace Nonaktif
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl sm:text-3xl font-bold text-rose-600">
            {stats.inactiveWorkspaces}
          </span>
          <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
            Ditangguhkan
          </span>
        </div>
      </div>

      {/* Card 4: Total Toko */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Store className="w-4 h-4" />
          </div>
          <span className="text-xs font-medium text-slate-600">
            Total Toko
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.totalStores}
          </span>
          <span className="text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
            Outlet
          </span>
        </div>
      </div>
    </div>
  );
}

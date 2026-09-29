"use client";

import React from "react";
import { Users, UserCheck, AlertCircle, Building2 } from "lucide-react";
import { AdminStatsData } from "@/types/admin";

interface AdminStatsProps {
  stats: AdminStatsData;
}

export default function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
      {/* Card 1: Total Admin */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            TOTAL ADMIN
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3 sm:mt-4">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            {stats.totalAdmins}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 sm:px-2 py-0.5 rounded-full">
            User
          </span>
        </div>
      </div>

      {/* Card 2: Admin Aktif */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            ADMIN AKTIF
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3 sm:mt-4">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            {stats.activeAdmins}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-emerald-700 bg-emerald-50 px-1.5 sm:px-2 py-0.5 rounded-full">
            Aktif
          </span>
        </div>
      </div>

      {/* Card 3: Admin Nonaktif */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            ADMIN NONAKTIF
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3 sm:mt-4">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            {stats.inactiveAdmins}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-rose-700 bg-rose-50 px-1.5 sm:px-2 py-0.5 rounded-full">
            Nonaktif
          </span>
        </div>
      </div>

      {/* Card 4: Total Workspace / Auditor */}
      <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
            TOTAL AUDITOR
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-3 sm:mt-4">
          <span className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
            {stats.totalAuditors}
          </span>
          <span className="text-[10px] sm:text-[11px] font-medium text-indigo-700 bg-indigo-50 px-1.5 sm:px-2 py-0.5 rounded-full">
            Auditor
          </span>
        </div>
      </div>
    </div>
  );
}

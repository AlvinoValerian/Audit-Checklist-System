"use client";

import React from "react";
import { Users, UserCheck, AlertCircle, Building2 } from "lucide-react";
import { AdminStatsData } from "@/types/admin";

interface AdminStatsProps {
  stats: AdminStatsData;
}

export default function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6">
      {/* Card 1: Total Admin */}
      <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
            TOTAL ADMIN
          </h3>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {stats.totalAdmins}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            User
          </span>
        </div>
      </div>

      {/* Card 2: Admin Aktif */}
      <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
            ADMIN AKTIF
          </h3>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {stats.activeAdmins}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Aktif
          </span>
        </div>
      </div>

      {/* Card 3: Admin Nonaktif */}
      <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
            ADMIN NONAKTIF
          </h3>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {stats.inactiveAdmins}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
            Nonaktif
          </span>
        </div>
      </div>

      {/* Card 4: Total Workspace / Auditor */}
      <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
            TOTAL AUDITOR
          </h3>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex items-baseline justify-between">
          <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            {stats.totalAuditors}
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            Auditor
          </span>
        </div>
      </div>
    </div>
  );
}

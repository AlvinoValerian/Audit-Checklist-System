"use client";

import React from "react";
import { Users, UserCheck, AlertCircle, Building2 } from "lucide-react";
import { AdminStatsData } from "@/types/admin";

interface AdminStatsProps {
  stats: AdminStatsData;
}

export default function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Card 1: Total Admin */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TOTAL ADMIN
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.totalAdmins}
          </span>
        </div>
      </div>

      {/* Card 2: Admin Aktif */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
            <UserCheck className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            ADMIN AKTIF
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.activeAdmins}
          </span>
        </div>
      </div>

      {/* Card 3: Admin Nonaktif */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
            <AlertCircle className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            ADMIN NONAKTIF
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.inactiveAdmins}
          </span>
          {stats.inactiveAdmins > 0 ? (
            <span className="text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
              Nonaktif
            </span>
          ) : (
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
              Tertahan
            </span>
          )}
        </div>
      </div>

      {/* Card 4: Total Workspace */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TOTAL WORKSPACE
          </span>
        </div>
        <div className="flex items-baseline justify-between mt-4">
          <span className="text-2xl sm:text-3xl font-bold text-slate-900">
            {stats.totalWorkspaces ?? 3}
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Wrench, CheckCircle2, UserX, Cpu } from "lucide-react";
import { TeknisStats as ITeknisStats } from "@/types/teknis";

interface TeknisStatsProps {
  stats: ITeknisStats;
}

export default function TeknisStats({ stats }: TeknisStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total User Teknis */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Tim Teknis
          </p>
          <h3 className="text-2xl font-bold text-slate-900 leading-none">
            {stats.total}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
            Personil divisi teknis & IT
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
          <Wrench className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* 2. User Teknis Aktif */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            User Teknis Aktif
          </p>
          <h3 className="text-2xl font-bold text-emerald-600 leading-none">
            {stats.active}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
            Memiliki akses sistem penuh
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
          <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* 3. User Teknis Nonaktif */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            User Teknis Nonaktif
          </p>
          <h3 className="text-2xl font-bold text-rose-500 leading-none">
            {stats.inactive}
          </h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
            Akun dinonaktifkan sementara
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
          <UserX className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>

      {/* 4. Persentase Kesiapan Sistem */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Rasio Tim Aktif
          </p>
          <h3 className="text-2xl font-bold text-sky-700 leading-none">
            {stats.activePercentage}%
          </h3>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
            Kesiapan operasional teknis
          </p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
          <Cpu className="w-6 h-6 stroke-[2.2]" />
        </div>
      </div>
    </div>
  );
}

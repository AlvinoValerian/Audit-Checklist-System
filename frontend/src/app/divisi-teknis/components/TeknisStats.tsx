"use client";

import React from "react";
import { Wrench, CheckCircle2, UserX, Cpu, TrendingUp } from "lucide-react";
import { TeknisStats as ITeknisStats } from "@/types/teknis";

interface TeknisStatsProps {
  stats: ITeknisStats;
}

export default function TeknisStats({ stats }: TeknisStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Total User Teknis */}
      <div className="relative overflow-hidden bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-sky-400/12 via-sky-300/5 to-transparent blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="flex items-center justify-between relative z-10 mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Tim Teknis
          </p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100 shadow-2xs">
            Divisi IT
          </span>
        </div>
        <div className="flex items-end justify-between relative z-10">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 leading-none">
              {stats.total}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              Personil divisi teknis & IT
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 group-hover:scale-110 transition-transform">
            <Wrench className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* 2. User Teknis Aktif */}
      <div className="relative overflow-hidden bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400/15 via-emerald-300/5 to-transparent blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="flex items-center justify-between relative z-10 mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            User Teknis Aktif
          </p>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
            <TrendingUp className="w-2.5 h-2.5 stroke-[2.5]" />
            <span>{stats.activePercentage}% aktif</span>
          </span>
        </div>
        <div className="flex items-end justify-between relative z-10">
          <div>
            <h3 className="text-2xl font-extrabold text-emerald-600 leading-none">
              {stats.active}
            </h3>
            <p className="text-[11px] text-emerald-600/80 mt-1.5 font-medium">
              Memiliki akses sistem penuh
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* 3. User Teknis Nonaktif */}
      <div className="relative overflow-hidden bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-rose-400/12 via-rose-300/5 to-transparent blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="flex items-center justify-between relative z-10 mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            User Teknis Nonaktif
          </p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
            {stats.total > 0 ? 100 - stats.activePercentage : 0}% nonaktif
          </span>
        </div>
        <div className="flex items-end justify-between relative z-10">
          <div>
            <h3 className="text-2xl font-extrabold text-rose-500 leading-none">
              {stats.inactive}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              Akun dinonaktifkan sementara
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0 group-hover:scale-110 transition-transform">
            <UserX className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>

      {/* 4. Persentase Kesiapan Sistem */}
      <div className="relative overflow-hidden bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-purple-400/12 via-purple-300/5 to-transparent blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="flex items-center justify-between relative z-10 mb-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Rasio Tim Aktif
          </p>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70 shadow-2xs">
            Kesiapan Tim
          </span>
        </div>
        <div className="flex items-end justify-between relative z-10">
          <div>
            <h3 className="text-2xl font-extrabold text-sky-700 leading-none">
              {stats.activePercentage}%
            </h3>
            <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
              Kesiapan operasional teknis
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0 group-hover:scale-110 transition-transform">
            <Cpu className="w-5 h-5 stroke-[2.2]" />
          </div>
        </div>
      </div>
    </div>
  );
}

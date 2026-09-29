"use client";

import React from "react";
import {
  Store,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";

export interface MetricStats {
  totalStores: number;
  completedAudits: number;
  pendingAudits: number;
  totalFindings: number;
  resolvedFindings: number;
  openFindings: number;
}

interface MetricCardsProps {
  stats?: MetricStats;
}

export default function MetricCards({
  stats = {
    totalStores: 10,
    completedAudits: 78,
    pendingAudits: 12,
    totalFindings: 24,
    resolvedFindings: 18,
    openFindings: 6,
  },
}: MetricCardsProps) {
  const cards = [
    {
      title: "Total Toko",
      value: stats.totalStores,
      icon: <Store className="w-4 h-4 text-slate-400 stroke-[1.8]" />,
    },
    {
      title: "Audit Selesai",
      value: stats.completedAudits,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 stroke-[2.2]" />,
    },
    {
      title: "Belum Dilakukan",
      value: stats.pendingAudits,
      icon: <Clock className="w-4 h-4 text-amber-500 stroke-[2]" />,
    },
    {
      title: "Total Temuan",
      value: stats.totalFindings,
      icon: <AlertTriangle className="w-4 h-4 text-rose-500 stroke-[2.2]" />,
    },
    {
      title: "Temuan Selesai",
      value: stats.resolvedFindings,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 stroke-[2.2]" />,
    },
    {
      title: "Temuan Open",
      value: stats.openFindings,
      icon: <AlertCircle className="w-4 h-4 text-rose-500 stroke-[2.2]" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5 mb-6">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 flex flex-col justify-between hover:border-slate-300 transition-all hover:shadow-xs group"
        >
          {/* Card Label */}
          <span className="text-[11px] font-semibold text-slate-500 tracking-tight">
            {card.title}
          </span>

          {/* Number & Icon on the same line */}
          <div className="flex items-baseline justify-between mt-3 sm:mt-4">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {card.value}
            </span>
            <div className="shrink-0 transition-transform group-hover:scale-110">
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

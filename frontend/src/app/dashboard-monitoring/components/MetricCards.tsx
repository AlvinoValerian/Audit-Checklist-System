"use client";

import React from "react";
import {
  Store,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
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
    totalStores: 0,
    completedAudits: 0,
    pendingAudits: 0,
    totalFindings: 0,
    resolvedFindings: 0,
    openFindings: 0,
  },
}: MetricCardsProps) {
  const totalAuditActivity = stats.completedAudits + stats.pendingAudits;
  const completionRate =
    totalAuditActivity > 0
      ? Math.round((stats.completedAudits / totalAuditActivity) * 100)
      : 100;
  const pendingRate =
    totalAuditActivity > 0
      ? Math.round((stats.pendingAudits / totalAuditActivity) * 100)
      : 0;

  const cards = [
    {
      title: "Total Toko",
      value: stats.totalStores,
      trendBadge: "100% Terdata",
      hasTrending: false,
      badgeColor: "bg-slate-100 text-slate-600 border border-slate-200/80",
      glowColor: "from-sky-400/12 via-sky-300/5 to-transparent",
      iconBg: "bg-sky-50 text-sky-600",
      icon: <Store className="w-4 h-4 stroke-[1.8]" />,
    },
    {
      title: "Audit Selesai",
      value: stats.completedAudits,
      trendBadge: `${completionRate}% selesai`,
      hasTrending: true,
      badgeColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
      glowColor: "from-emerald-400/15 via-emerald-300/5 to-transparent",
      iconBg: "bg-emerald-50 text-emerald-600",
      icon: <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />,
    },
    {
      title: "Tidak Mengerjakan",
      value: stats.pendingAudits,
      trendBadge: stats.pendingAudits > 0 ? `${pendingRate}% tunda` : "Tepat Waktu",
      hasTrending: false,
      badgeColor:
        stats.pendingAudits > 0
          ? "bg-rose-50 text-rose-700 border border-rose-200/70"
          : "bg-emerald-50 text-emerald-700 border border-emerald-200/70",
      glowColor: "from-rose-400/12 via-rose-300/5 to-transparent",
      iconBg: "bg-rose-50 text-rose-600",
      icon: <Clock className="w-4 h-4 stroke-[2]" />,
    },
    {
      title: "Total Temuan",
      value: stats.totalFindings,
      trendBadge:
        stats.resolvedFindings > 0
          ? `${stats.resolvedFindings} teratasi`
          : `${stats.totalFindings} temuan`,
      hasTrending: false,
      badgeColor: "bg-amber-50 text-amber-700 border border-amber-200/70",
      glowColor: "from-amber-400/12 via-amber-300/5 to-transparent",
      iconBg: "bg-amber-50 text-amber-600",
      icon: <AlertTriangle className="w-4 h-4 stroke-[2.2]" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-3.5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="relative overflow-hidden bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3 sm:p-3.5 flex flex-col justify-between hover:border-slate-300/90 hover:shadow-xs transition-all group"
        >
          {/* Subtle Radial Glow in Top-Right Corner */}
          <div
            className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-gradient-to-br ${card.glowColor} blur-xl pointer-events-none transition-transform duration-500 group-hover:scale-125`}
          />

          {/* Header: Title & Trend Badge */}
          <div className="flex items-center justify-between gap-1.5 relative z-10">
            <span className="text-[11px] font-semibold text-slate-500 tracking-tight truncate">
              {card.title}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight shrink-0 shadow-2xs ${card.badgeColor}`}
            >
              {card.hasTrending && (
                <TrendingUp className="w-2.5 h-2.5 shrink-0 stroke-[2.5]" />
              )}
              <span>{card.trendBadge}</span>
            </span>
          </div>

          {/* Number & Icon on the same line */}
          <div className="flex items-baseline justify-between mt-2.5 relative z-10">
            <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {card.value}
            </span>
            <div
              className={`p-1.5 rounded-lg shrink-0 transition-transform group-hover:scale-110 ${card.iconBg}`}
            >
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

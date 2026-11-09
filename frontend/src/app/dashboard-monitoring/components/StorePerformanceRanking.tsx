"use client";

import React, { useState } from "react";
import { StoreRankingItem } from "@/services/dashboard.service";

interface StorePerformanceRankingProps {
  data?: StoreRankingItem[];
}

export default function StorePerformanceRanking({ data }: StorePerformanceRankingProps) {
  const [hoveredStore, setHoveredStore] = useState<string | null>(null);

  const stores = data && data.length > 0 ? data : [];
  const scaleMarks = [0, 20, 40, 60, 80, 100];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3.5 sm:p-4 flex flex-col justify-between h-full">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div>
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
            Performa Audit per Toko
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Poin Awal 100 | Terlambat (-2), Kritikal (-1), Low (-0.5), Tidak Mengerjakan (-5)
          </p>
        </div>
      </div>

      {/* Horizontal Bar Chart List */}
      {stores.length === 0 ? (
        <div className="h-36 flex flex-col items-center justify-center text-slate-400 text-xs">
          <span>Belum ada data gerai atau audit di workspace ini</span>
        </div>
      ) : (
        <div className="space-y-2.5 my-auto overflow-visible py-1">
          {stores.map((store, idx) => {
            const isHovered = hoveredStore === store.name;
            // Format label toko agar rapi dan ringkas
            const shortName = store.name
              .replace(/^Mie Gacoan - /i, "")
              .replace(/^Bakso Gacoan - /i, "")
              .replace(/^Jaya Abadi - /i, "")
              .replace(/^Dikichi Chicken - /i, "")
              .replace(/^(Malang|Surabaya|Jakarta|Bandung)\s+/i, "");

            // Warna bar berdasarkan skor
            let barColor = "bg-[#193f53]";
            if (store.score < 60) {
              barColor = "bg-rose-500";
            } else if (store.score < 80) {
              barColor = "bg-amber-500";
            }

            // Toko nomer 1 diposisikan ke bawah (top-6), toko lainnya ke atas (-top-12)
            const isNearTop = idx === 0;

            return (
              <div
                key={store.name}
                className={`relative flex items-center gap-2.5 group cursor-pointer transition-colors ${
                  isHovered ? "z-30" : "z-10"
                }`}
                onMouseEnter={() => setHoveredStore(store.name)}
                onMouseLeave={() => setHoveredStore(null)}
              >
                {/* Store Label */}
                <span
                  className="w-20 sm:w-24 text-slate-700 text-[11px] font-semibold shrink-0 truncate"
                  title={store.name}
                >
                  {shortName}
                </span>

                {/* Bar Track & Fill */}
                <div className="flex-1 bg-slate-100 rounded-full h-2.5 relative overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barColor} ${
                      isHovered ? "brightness-110" : ""
                    }`}
                    style={{ width: `${Math.max(4, store.score)}%` }}
                  />
                </div>

                {/* Hover Score Badge */}
                <span
                  className={`w-9 text-right text-[10px] font-bold text-slate-800 transition-opacity ${
                    isHovered ? "opacity-100 scale-105" : "opacity-80"
                  }`}
                >
                  {store.score}%
                </span>

                {/* Tooltip Rincian Penalti Poin saat Hover */}
                {isHovered && (
                  <div
                    className={`absolute left-20 sm:left-24 ${
                      isNearTop ? "top-6" : "-top-12"
                    } z-50 bg-slate-900 text-white rounded-lg px-2.5 py-1.5 shadow-2xl text-[10px] pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150`}
                  >
                    {/* Panah Penunjuk Tooltip */}
                    <div
                      className={`absolute left-6 w-2 h-2 bg-slate-900 rotate-45 ${
                        isNearTop ? "-top-1" : "-bottom-1"
                      }`}
                    />
                    <p className="font-semibold text-slate-200 border-b border-slate-700 pb-0.5 mb-1 relative z-10 text-[10px]">
                      {store.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-slate-300 relative z-10 text-[9.5px]">
                      {store.totalDeduction === 0 ? (
                        <span className="text-emerald-400 font-semibold">
                          ✨ Performa Sempurna (100%) • Tidak Ada Pelanggaran Poin
                        </span>
                      ) : (
                        <>
                          <span>
                            Terlambat:{" "}
                            <strong className="text-amber-400">
                              {store.lateCount}x
                            </strong>{" "}
                            (-{store.lateCount * 2}p)
                          </span>
                          <span>•</span>
                          <span>
                            Kritikal:{" "}
                            <strong className="text-rose-400">
                              {store.criticalIssueCount}x
                            </strong>{" "}
                            (-{store.criticalIssueCount * 1}p)
                          </span>
                          <span>•</span>
                          <span>
                            Low:{" "}
                            <strong className="text-yellow-300">
                              {store.lowIssueCount}x
                            </strong>{" "}
                            (-{store.lowIssueCount * 0.5}p)
                          </span>
                          <span>•</span>
                          <span>
                            Tidak Kerja:{" "}
                            <strong className="text-red-400">
                              {store.missedCount}x
                            </strong>{" "}
                            (-{store.missedCount * 5}p)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Scale Marks (0, 20, 40, 60, 80, 100) */}
      <div className="pt-2 border-t border-slate-100 mt-1">
        <div className="flex items-center justify-between pl-20 sm:pl-24 pr-9 text-[9px] text-slate-400 font-medium">
          {scaleMarks.map((mark) => (
            <span key={mark} className="text-center">
              {mark}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

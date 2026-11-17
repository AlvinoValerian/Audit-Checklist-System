"use client";

import React from "react";

export interface CardSkeletonProps {
  count?: number;
}

export default function CardSkeleton({ count = 4 }: CardSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-xs animate-pulse space-y-3"
        >
          {/* Header Bar Skeleton */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-slate-200 shrink-0" />
              <div className="h-4 bg-slate-200 rounded w-36" />
              <div className="h-4 bg-slate-100 rounded w-24 hidden sm:block" />
            </div>
            <div className="w-20 h-5 rounded-full bg-slate-200/80" />
          </div>

          {/* Photo Thumbnails Row Skeleton */}
          <div className="flex items-center gap-2.5 pt-1 overflow-hidden">
            {Array.from({ length: 6 }).map((_, pIdx) => (
              <div
                key={pIdx}
                className="w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] md:w-[92px] md:h-[92px] rounded-xl bg-slate-200/70 shrink-0"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

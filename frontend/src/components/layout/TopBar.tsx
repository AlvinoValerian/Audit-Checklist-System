"use client";

import React from "react";
import { Settings } from "lucide-react";
import { usePathname } from "next/navigation";

interface TopBarProps {
  workspaceName?: string;
  adminName?: string;
  adminRole?: string;
}

export default function TopBar({
  workspaceName = "WORKSPACE A",
  adminName = "Admin Utama",
  adminRole = "Head Auditor",
}: TopBarProps) {
  const pathname = usePathname();

  if (pathname === "/dashboard-monitoring") {
    return null;
  }

  return (
    <div className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 hidden md:flex">
      {/* Workspace Pill */}
      <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#f0f5ff] border border-[#d6e4ff] text-[#1e4ed8] text-[11px] font-bold tracking-wider uppercase">
        {workspaceName}
      </div>

      {/* Right Admin Profile & Settings */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title="Pengaturan"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4 stroke-[2]" />
        </button>
        
        <div className="w-px h-5 bg-slate-200 mx-1"></div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#e0e7ff] text-[#1d4ed8] flex items-center justify-center font-bold text-xs shrink-0 border border-[#c7d2fe]">
            AD
          </div>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {adminName}
            </p>
            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
              {adminRole}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

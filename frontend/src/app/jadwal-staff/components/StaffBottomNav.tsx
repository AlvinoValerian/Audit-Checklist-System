"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  ListChecks,
  ClipboardCheck,
  AlertTriangle,
  User,
} from "lucide-react";

interface StaffBottomNavProps {
  activeTab?: "checklist" | "audits" | "issues" | "profile";
}

export default function StaffBottomNav({ activeTab }: StaffBottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();

  const currentTab =
    activeTab ||
    (pathname.includes("/riwayat")
      ? "audits"
      : pathname.includes("/issues")
      ? "issues"
      : pathname.includes("/profile")
      ? "profile"
      : "checklist");

  return (
    <div className="bg-white border-t border-slate-200/80 px-4 py-2 flex items-center justify-around shrink-0 select-none shadow-[0_-4px_16px_rgba(0,0,0,0.03)] z-30">
      {/* Tab 1: Checklist */}
      <button
        onClick={() => router.push("/jadwal-staff")}
        className={`flex flex-col items-center justify-center transition-all cursor-pointer ${
          currentTab === "checklist" ? "text-white" : "text-slate-400 hover:text-slate-600 font-medium"
        }`}
      >
        <div
          className={`px-3 py-1 flex flex-col items-center justify-center rounded-xl transition-all ${
            currentTab === "checklist"
              ? "bg-[#193f53] text-white shadow-xs"
              : "text-slate-400"
          }`}
        >
          <ListChecks className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Checklist</span>
        </div>
      </button>

      {/* Tab 2: Audits */}
      <button
        onClick={() => router.push("/jadwal-staff/riwayat")}
        className={`flex flex-col items-center justify-center transition-all cursor-pointer ${
          currentTab === "audits" ? "text-white" : "text-slate-400 hover:text-slate-600 font-medium"
        }`}
      >
        <div
          className={`px-3.5 py-1 flex flex-col items-center justify-center rounded-xl transition-all ${
            currentTab === "audits"
              ? "bg-[#193f53] text-white shadow-xs"
              : "text-slate-400"
          }`}
        >
          <ClipboardCheck className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Audits</span>
        </div>
      </button>

      {/* Tab 3: Issues */}
      <button
        onClick={() => router.push("/jadwal-staff/issues")}
        className={`flex flex-col items-center justify-center transition-all cursor-pointer ${
          currentTab === "issues" ? "text-white" : "text-slate-400 hover:text-slate-600 font-medium"
        }`}
      >
        <div
          className={`px-3.5 py-1 flex flex-col items-center justify-center rounded-xl transition-all ${
            currentTab === "issues"
              ? "bg-[#193f53] text-white shadow-xs"
              : "text-slate-400"
          }`}
        >
          <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Issues</span>
        </div>
      </button>

      {/* Tab 4: Profile */}
      <button
        onClick={() => router.push("/jadwal-staff/profile")}
        className={`flex flex-col items-center justify-center transition-all cursor-pointer ${
          currentTab === "profile" ? "text-white" : "text-slate-400 hover:text-slate-600 font-medium"
        }`}
      >
        <div
          className={`px-3.5 py-1 flex flex-col items-center justify-center rounded-xl transition-all ${
            currentTab === "profile"
              ? "bg-[#193f53] text-white shadow-xs"
              : "text-slate-400"
          }`}
        >
          <User className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Profile</span>
        </div>
      </button>
    </div>
  );
}

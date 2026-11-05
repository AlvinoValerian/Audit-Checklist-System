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
    <div className="bg-white border-t border-slate-100 px-3 py-2 flex items-center justify-around shrink-0 select-none shadow-[0_-4px_16px_rgba(0,0,0,0.02)] z-30">
      {/* Tab 1: Checklist */}
      <button
        type="button"
        onClick={() => router.push("/jadwal-staff")}
        className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-all group"
      >
        <div
          className={`flex items-center justify-center transition-all ${
            currentTab === "checklist"
              ? "w-14 h-8 bg-[#193f53] text-white rounded-full shadow-xs"
              : "w-8 h-8 text-slate-400 group-hover:text-slate-600"
          }`}
        >
          <ListChecks className="w-4 h-4 stroke-[2.4]" />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            currentTab === "checklist"
              ? "font-bold text-[#193f53]"
              : "font-medium text-slate-400 group-hover:text-slate-600"
          }`}
        >
          Checklist
        </span>
      </button>

      {/* Tab 2: Riwayat (Audits) */}
      <button
        type="button"
        onClick={() => router.push("/jadwal-staff/riwayat")}
        className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-all group"
      >
        <div
          className={`flex items-center justify-center transition-all ${
            currentTab === "audits"
              ? "w-14 h-8 bg-[#193f53] text-white rounded-full shadow-xs"
              : "w-8 h-8 text-slate-400 group-hover:text-slate-600"
          }`}
        >
          <ClipboardCheck className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            currentTab === "audits"
              ? "font-bold text-[#193f53]"
              : "font-medium text-slate-400 group-hover:text-slate-600"
          }`}
        >
          Riwayat
        </span>
      </button>

      {/* Tab 3: Issues (Kendala) */}
      <button
        type="button"
        onClick={() => router.push("/jadwal-staff/issues")}
        className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-all group"
      >
        <div
          className={`flex items-center justify-center transition-all ${
            currentTab === "issues"
              ? "w-14 h-8 bg-[#193f53] text-white rounded-full shadow-xs"
              : "w-8 h-8 text-slate-400 group-hover:text-slate-600"
          }`}
        >
          <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            currentTab === "issues"
              ? "font-bold text-[#193f53]"
              : "font-medium text-slate-400 group-hover:text-slate-600"
          }`}
        >
          Issues
        </span>
      </button>

      {/* Tab 4: Profile */}
      <button
        type="button"
        onClick={() => router.push("/jadwal-staff/profile")}
        className="flex-1 flex flex-col items-center justify-center cursor-pointer transition-all group"
      >
        <div
          className={`flex items-center justify-center transition-all ${
            currentTab === "profile"
              ? "w-14 h-8 bg-[#193f53] text-white rounded-full shadow-xs"
              : "w-8 h-8 text-slate-400 group-hover:text-slate-600"
          }`}
        >
          <User className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            currentTab === "profile"
              ? "font-bold text-[#193f53]"
              : "font-medium text-slate-400 group-hover:text-slate-600"
          }`}
        >
          Profile
        </span>
      </button>
    </div>
  );
}

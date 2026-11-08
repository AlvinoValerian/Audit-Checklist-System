"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ListChecks,
  ClipboardCheck,
  AlertTriangle,
  User,
} from "lucide-react";

interface StaffBottomNavProps {
  activeTab?: "checklist" | "audits" | "issues" | "profile";
  showIssues?: boolean;
}

export default function StaffBottomNav({
  activeTab,
  showIssues = false,
}: StaffBottomNavProps) {
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
    <nav
      aria-label="Navigasi Utama Staff"
      className="shrink-0 w-full bg-white border-t border-slate-200/80 px-3 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-40 touch-manipulation relative"
    >
      {/* Tab 1: Checklist */}
      <Link
        href="/jadwal-staff"
        prefetch={true}
        className="flex-1 flex flex-col items-center justify-center py-0.5 touch-manipulation active:scale-95 transition-transform"
      >
        <div
          className={`flex items-center justify-center transition-all ${
            currentTab === "checklist"
              ? "w-14 h-8 bg-[#193f53] text-white rounded-full shadow-xs"
              : "w-8 h-8 text-slate-400 hover:text-slate-600"
          }`}
        >
          <ListChecks className="w-4 h-4 stroke-[2.4]" />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            currentTab === "checklist"
              ? "font-bold text-[#193f53]"
              : "font-medium text-slate-400 hover:text-slate-600"
          }`}
        >
          Checklist
        </span>
      </Link>

      {/* Tab 2: Riwayat (Audits) */}
      <Link
        href="/jadwal-staff/riwayat"
        prefetch={true}
        className="flex-1 flex flex-col items-center justify-center py-0.5 touch-manipulation active:scale-95 transition-transform"
      >
        <div
          className={`flex items-center justify-center transition-all ${
            currentTab === "audits"
              ? "w-14 h-8 bg-[#193f53] text-white rounded-full shadow-xs"
              : "w-8 h-8 text-slate-400 hover:text-slate-600"
          }`}
        >
          <ClipboardCheck className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            currentTab === "audits"
              ? "font-bold text-[#193f53]"
              : "font-medium text-slate-400 hover:text-slate-600"
          }`}
        >
          Riwayat
        </span>
      </Link>

      {/* Tab 3: Issues (Kendala) - Bersifat opsional */}
      {showIssues && (
        <Link
          href="/jadwal-staff/issues"
          prefetch={true}
          className="flex-1 flex flex-col items-center justify-center py-0.5 touch-manipulation active:scale-95 transition-transform"
        >
          <div
            className={`flex items-center justify-center transition-all ${
              currentTab === "issues"
                ? "w-14 h-8 bg-[#193f53] text-white rounded-full shadow-xs"
                : "w-8 h-8 text-slate-400 hover:text-slate-600"
            }`}
          >
            <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span
            className={`text-[10px] mt-0.5 tracking-tight ${
              currentTab === "issues"
                ? "font-bold text-[#193f53]"
                : "font-medium text-slate-400 hover:text-slate-600"
            }`}
          >
            Issues
          </span>
        </Link>
      )}

      {/* Tab 4: Profile */}
      <Link
        href="/jadwal-staff/profile"
        prefetch={true}
        className="flex-1 flex flex-col items-center justify-center py-0.5 touch-manipulation active:scale-95 transition-transform"
      >
        <div
          className={`flex items-center justify-center transition-all ${
            currentTab === "profile"
              ? "w-14 h-8 bg-[#193f53] text-white rounded-full shadow-xs"
              : "w-8 h-8 text-slate-400 hover:text-slate-600"
          }`}
        >
          <User className="w-4 h-4 stroke-[2.2]" />
        </div>
        <span
          className={`text-[10px] mt-0.5 tracking-tight ${
            currentTab === "profile"
              ? "font-bold text-[#193f53]"
              : "font-medium text-slate-400 hover:text-slate-600"
            }`}
        >
          Profile
        </span>
      </Link>
    </nav>
  );
}

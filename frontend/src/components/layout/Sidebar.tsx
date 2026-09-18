"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, UserPlus, LogOut } from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/lib/auth";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    AuthService.logout();
    toast.info("Anda telah logout.");
    router.push("/login");
  };

  const isWorkspacesActive = pathname.startsWith("/workspaces");
  const isAdminsActive = pathname.startsWith("/admins");

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-6 shrink-0 md:h-screen md:sticky md:top-0 md:overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="mb-8">
          <Link href="/workspaces">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight hover:opacity-90 transition-opacity">
              Audit Pro
            </h1>
          </Link>
          <p className="text-xs text-slate-400 mt-0.5">
            Enterprise Monitor (Super Admin)
          </p>
        </div>

        {/* Navigation Items (Exact match to Figma) */}
        <nav className="space-y-1.5">
          <Link
            href="/workspaces"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              isWorkspacesActive
                ? "bg-sky-50 text-slate-800 border border-sky-200/70 shadow-2xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-4 h-4 text-slate-600 stroke-[2]" />
            <span>Workspaces</span>
          </Link>

          <Link
            href="/admins"
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              isAdminsActive
                ? "bg-sky-50 text-slate-800 border border-sky-200/70 shadow-2xs"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-4 h-4 text-slate-500 stroke-[2]" />
            <span>Tambah Admin</span>
          </Link>
        </nav>
      </div>

      {/* Bottom Logout */}
      <div className="pt-6 border-t border-slate-100 mt-6 md:mt-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 text-rose-600 hover:text-rose-700 text-sm font-semibold transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 stroke-[2.2]" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

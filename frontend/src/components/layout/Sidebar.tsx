"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  UserPlus,
  LogOut,
  Menu,
  X,
  Monitor,
  LayoutGrid,
  Store,
  CheckCircle2,
  Calendar,
  CalendarOff,
  Users,
  Image,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/lib/auth";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    AuthService.logout();
    toast.info("Anda telah logout.");
    router.push("/login");
  };

  // Determine if viewing Admin portal or Super Admin portal
  const isAdminPortal =
    pathname.startsWith("/dashboard-monitoring") ||
    pathname.startsWith("/toko") ||
    pathname.startsWith("/template-checklist") ||
    pathname.startsWith("/jadwal-audit") ||
    pathname.startsWith("/libur-toko") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/galeri") ||
    pathname.startsWith("/laporan") ||
    pathname.startsWith("/tanya-ai");

  const isWorkspacesActive = pathname.startsWith("/workspace");
  const isAdminsActive =
    pathname.startsWith("/kelola-admin") ||
    pathname.startsWith("/superadmin") ||
    pathname.startsWith("/admins");

  const adminNavItems = [
    {
      name: "Dashboard",
      href: "/dashboard-monitoring",
      icon: LayoutGrid,
    },
    {
      name: "Toko",
      href: "/toko",
      icon: Store,
    },
    {
      name: "Template checklist",
      href: "/template-checklist",
      icon: CheckCircle2,
    },
    {
      name: "Jadwal Audit",
      href: "/jadwal-audit",
      icon: Calendar,
    },
    {
      name: "Libur toko & Pengecualian jadwal",
      href: "/libur-toko",
      icon: CalendarOff,
    },
    {
      name: "Staff",
      href: "/staff",
      icon: Users,
    },
    {
      name: "Galeri",
      href: "/galeri",
      icon: Image,
    },
    {
      name: "Laporan",
      href: "/laporan",
      icon: FileText,
    },
    {
      name: "Tanya AI",
      href: "/tanya-ai",
      icon: Sparkles,
      badge: "BETA",
    },
  ];

  return (
    <>
      {/* Mobile Top Header Bar (Shown only on < md) */}
      <div className="md:hidden w-full bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link
          href={isAdminPortal ? "/dashboard-monitoring" : "/workspace"}
          className="flex items-center gap-2.5"
        >
          <div className="w-8 h-8 rounded-lg bg-[#193f53] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Audit Pro
            </h1>
            <p className="text-[10px] text-slate-400">
              {isAdminPortal ? "Enterprise Monitor" : "Super Admin"}
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Dropdown Menu (Overlay) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[53px] bg-slate-900/40 backdrop-blur-xs z-30 animate-in fade-in duration-150">
          <div className="bg-white border-b border-slate-200 p-4 space-y-3 shadow-xl max-h-[calc(100vh-60px)] overflow-y-auto">
            {isAdminPortal ? (
              <nav className="space-y-1">
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all ${
                        isActive
                          ? "border border-sky-400 bg-sky-50/70 text-sky-600 font-semibold shadow-2xs"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? "text-sky-600" : "text-slate-400"
                        }`}
                      />
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span
                          className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider ${
                            isActive
                              ? "bg-[#102d3c] text-white"
                              : "text-slate-400 bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            ) : (
              <nav className="space-y-1">
                <Link
                  href="/workspace"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isWorkspacesActive
                      ? "bg-sky-50 text-slate-800 border border-sky-200/70"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="w-4 h-4 text-slate-600 stroke-[2]" />
                  <span>Workspaces</span>
                </Link>

                <Link
                  href="/kelola-admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isAdminsActive
                      ? "bg-sky-50 text-slate-800 border border-sky-200/70"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <UserPlus className="w-4 h-4 text-slate-500 stroke-[2]" />
                  <span>Kelola Admin</span>
                </Link>
              </nav>
            )}

            <div className="pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4 stroke-[2.2]" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sticky Sidebar (Shown on md:) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col justify-between p-5 shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div>
          {/* Brand Header */}
          <div className="mb-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#193f53] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Monitor className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <Link href={isAdminPortal ? "/dashboard-monitoring" : "/workspace"}>
                <h1 className="text-base font-bold text-slate-900 tracking-tight hover:opacity-90 transition-opacity">
                  Audit Pro
                </h1>
              </Link>
              <p className="text-[11px] text-slate-400">
                {isAdminPortal ? "Enterprise Monitor" : "Super Admin"}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          {isAdminPortal ? (
            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-[13px] transition-all ${
                      isActive
                        ? "border border-sky-400 bg-sky-50/60 text-sky-600 font-semibold shadow-2xs"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? "text-sky-600" : "text-slate-400"
                      }`}
                    />
                    <span className="truncate">{item.name}</span>
                    {item.badge && (
                      <span
                        className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wider ${
                          isActive
                            ? "bg-[#102d3c] text-white"
                            : "text-slate-400 bg-slate-100 border border-slate-200"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          ) : (
            <nav className="space-y-1.5">
              <Link
                href="/workspace"
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
                href="/kelola-admin"
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isAdminsActive
                    ? "bg-sky-50 text-slate-800 border border-sky-200/70 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <UserPlus className="w-4 h-4 text-slate-500 stroke-[2]" />
                <span>Kelola Admin</span>
              </Link>
            </nav>
          )}
        </div>

        {/* Bottom Section */}
        <div className="pt-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 text-rose-600 hover:text-rose-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 stroke-[2.2]" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

"use client";

import React, { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ArrowLeft,
  Wrench,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/lib/auth";

const SSR_ROLE_SENTINEL = "__SSR__";

const subscribeAuthRole = (onStoreChange: () => void) => {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("auth-changed", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("auth-changed", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
};

const getAuthRoleSnapshot = (): string =>
  AuthService.getCurrentUser()?.role || "";

const getAuthRoleServerSnapshot = (): string => SSR_ROLE_SENTINEL;

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const roleSnapshot = useSyncExternalStore(
    subscribeAuthRole,
    getAuthRoleSnapshot,
    getAuthRoleServerSnapshot
  );

  const isAuthResolved = roleSnapshot !== SSR_ROLE_SENTINEL;
  const userRole = isAuthResolved ? roleSnapshot : "";

  const isSuperAdmin = isAuthResolved && userRole === "Super Admin";
  const isDivisiTeknis =
    isAuthResolved && (userRole === "Divisi Teknis" || userRole === "Teknis");

  const handleLogout = async () => {
    await AuthService.logoutAsync();
    toast.info("Anda telah logout.");
    if (typeof window !== "undefined") {
      window.location.href = "/login?reason=logout";
    }
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
    pathname.startsWith("/tanya-ai") ||
    pathname.startsWith("/divisi-teknis") ||
    pathname.startsWith("/pengaturan");

  // 1. Fitur Super Admin
  const superAdminNavItems = [
    {
      name: "Workspaces",
      href: "/workspace",
      icon: BookOpen,
    },
    {
      name: "Kelola Admin",
      href: "/kelola-admin",
      icon: UserPlus,
    },
  ];

  // 2. Fitur Admin
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

  // 3. Fitur Teknis
  const teknisNavItems = [
    {
      name: "Teknis",
      href: "/divisi-teknis",
      icon: Wrench,
    },
    {
      name: "Pengaturan",
      href: "/pengaturan",
      icon: Settings,
    },
  ];

  // Helper untuk merender tautan navigasi
  const renderNavLink = (
    item: {
      name: string;
      href: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: string;
    },
    isMobile = false
  ) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={isMobile ? () => setIsMobileMenuOpen(false) : undefined}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-[13px] transition-all ${
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
  };

  const renderSidebarSkeleton = (count = 6) => (
    <div className="space-y-2 animate-pulse" aria-hidden="true">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="h-8 w-full rounded-lg bg-slate-100 border border-slate-100/80"
        />
      ))}
    </div>
  );

  const portalHref = !isAuthResolved
    ? "#"
    : isDivisiTeknis
    ? "/divisi-teknis"
    : isAdminPortal
    ? "/dashboard-monitoring"
    : "/workspace";

  const portalLabel = !isAuthResolved
    ? "\u00A0"
    : isDivisiTeknis
    ? "Divisi Teknis"
    : isAdminPortal
    ? "Enterprise Monitor"
    : "Super Admin";

  return (
    <>
      {/* Mobile Top Header Bar (Shown only on < md) */}
      <div className="md:hidden w-full bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href={portalHref} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#193f53] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Monitor className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">
              Audit Pro
            </h1>
            <p className="text-[10px] text-slate-400">{portalLabel}</p>
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
            {!isAuthResolved ? (
              renderSidebarSkeleton(6)
            ) : isDivisiTeknis ? (
              /* Navigasi Khusus Divisi Teknis: 3 Bagian Terpisah */
              <div className="space-y-3">
                {/* 1. Fitur Super Admin */}
                <div className="space-y-1">
                  <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                    Fitur Super Admin
                  </p>
                  {superAdminNavItems.map((item) => renderNavLink(item, true))}
                </div>

                {/* Spasi / 2. Fitur Admin */}
                <div className="pt-2 space-y-1">
                  <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                    Fitur Admin
                  </p>
                  {adminNavItems.map((item) => renderNavLink(item, true))}
                </div>

                {/* Spasi / 3. Fitur Teknis */}
                <div className="pt-2 space-y-1">
                  <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                    Fitur Teknis
                  </p>
                  {teknisNavItems.map((item) => renderNavLink(item, true))}
                </div>
              </div>
            ) : isAdminPortal ? (
              <div className="space-y-2">
                {isSuperAdmin && (
                  <Link
                    href="/workspace"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-bold text-[#193f53] bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#193f53]" />
                    <span>Kembali ke Workspace</span>
                  </Link>
                )}
                <nav className="space-y-1">
                  {adminNavItems.map((item) => renderNavLink(item, true))}
                </nav>
              </div>
            ) : (
              <nav className="space-y-1">
                {superAdminNavItems.map((item) => renderNavLink(item, true))}
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
              <Link href={portalHref}>
                <h1 className="text-base font-bold text-slate-900 tracking-tight hover:opacity-90 transition-opacity">
                  Audit Pro
                </h1>
              </Link>
              <p className="text-[11px] text-slate-400">{portalLabel}</p>
            </div>
          </div>

          {/* Quick Back to Super Admin Portal if Super Admin in Admin Portal */}
          {isAuthResolved && !isDivisiTeknis && isSuperAdmin && isAdminPortal && (
            <div className="mb-4">
              <Link
                href="/workspace"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-[#193f53] bg-slate-100 hover:bg-slate-200/90 transition-colors group shadow-2xs"
                title="Kembali ke Daftar Workspace"
              >
                <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-[#193f53]" />
                <span>Kembali ke Workspace</span>
              </Link>
            </div>
          )}

          {/* Navigation Items */}
          {!isAuthResolved ? (
            renderSidebarSkeleton(8)
          ) : isDivisiTeknis ? (
            /* Sidebar Khusus Divisi Teknis dengan Judul Kecil Pembagi & Spasi */
            <div className="space-y-4">
              {/* 1. Fitur Super Admin */}
              <div className="space-y-1">
                <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                  Fitur Super Admin
                </p>
                {superAdminNavItems.map((item) => renderNavLink(item))}
              </div>

              {/* Spasi / 2. Fitur Admin */}
              <div className="pt-2 space-y-1">
                <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                  Fitur Admin
                </p>
                {adminNavItems.map((item) => renderNavLink(item))}
              </div>

              {/* Spasi / 3. Fitur Teknis */}
              <div className="pt-2 space-y-1">
                <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 select-none">
                  Fitur Teknis
                </p>
                {teknisNavItems.map((item) => renderNavLink(item))}
              </div>
            </div>
          ) : isAdminPortal ? (
            /* Portal Admin Biasa (Tanpa Divisi Teknis) */
            <nav className="space-y-1">
              {adminNavItems.map((item) => renderNavLink(item))}
            </nav>
          ) : (
            /* Portal Super Admin (Workspaces & Kelola Admin Saja - Tanpa Divisi Teknis) */
            <nav className="space-y-1">
              {superAdminNavItems.map((item) => renderNavLink(item))}
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

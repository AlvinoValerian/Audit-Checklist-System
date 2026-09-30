"use client";

import React from "react";
import { Toaster } from "sonner";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#f8fafc] text-slate-800 font-sans flex flex-col md:flex-row">
      <Toaster position="top-right" richColors />
      <Sidebar />
      <div className="flex-1 min-w-0 md:h-screen flex flex-col md:overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 md:p-8 lg:p-10 w-full mx-auto max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}

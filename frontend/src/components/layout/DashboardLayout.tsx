"use client";

import React from "react";
import Sidebar from "./Sidebar";
import { Toaster } from "sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#f8fafc] text-slate-800 font-sans flex flex-col md:flex-row">
      <Toaster position="top-right" richColors />
      <Sidebar />
      <div className="flex-1 min-w-0 md:h-screen md:overflow-y-auto">
        <main className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

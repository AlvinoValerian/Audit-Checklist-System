"use client";

import React, { useState, useRef, useEffect } from "react";
import { Settings, User } from "lucide-react";
import { usePathname } from "next/navigation";
import ProfileModal from "./ProfileModal";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  if (pathname === "/dashboard-monitoring") {
    return null;
  }

  return (
    <>
      <div className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 hidden md:flex">
        {/* Workspace Pill */}
        <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#f0f5ff] border border-[#d6e4ff] text-[#1e4ed8] text-[11px] font-bold tracking-wider uppercase">
          {workspaceName}
        </div>

        {/* Right Admin Profile & Settings */}
        <div className="flex items-center gap-3.5">
          {/* Settings Button & Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className={`p-1.5 rounded-lg transition-all duration-300 cursor-pointer ${
                isDropdownOpen
                  ? "text-[#193f53] bg-slate-100 ring-2 ring-slate-200"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title="Pengaturan"
              aria-label="Settings"
              aria-expanded={isDropdownOpen}
            >
              <Settings
                className={`w-4 h-4 stroke-[2] transition-transform duration-500 ease-in-out ${
                  isDropdownOpen
                    ? "rotate-180 text-[#193f53]"
                    : "rotate-0 hover:rotate-45"
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-[#193f53] hover:bg-slate-50 transition-colors text-left cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-md bg-slate-100 group-hover:bg-sky-50 flex items-center justify-center text-slate-500 group-hover:text-[#193f53] transition-colors">
                    <User className="w-3.5 h-3.5 stroke-[2.2]" />
                  </div>
                  <span>Profil</span>
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-5 bg-slate-200 mx-1"></div>

          {/* Profile Trigger Button */}
          <button
            type="button"
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-2.5 p-1 -m-1 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-[#193f53]/20"
            title="Lihat Profil Pengguna"
            aria-label="Lihat Profil Pengguna"
          >
            <div className="w-8 h-8 rounded-full bg-[#e0e7ff] text-[#1d4ed8] group-hover:bg-[#dbeafe] flex items-center justify-center font-bold text-xs shrink-0 border border-[#c7d2fe] transition-colors shadow-2xs">
              AD
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-900 group-hover:text-[#193f53] leading-tight transition-colors">
                {adminName}
              </p>
              <p className="text-[10px] text-slate-400 group-hover:text-slate-500 font-normal mt-0.5 transition-colors">
                {adminRole}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        adminName={adminName}
        adminRole={adminRole}
        workspaceName={workspaceName}
      />
    </>
  );
}

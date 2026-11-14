"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Settings, User } from "lucide-react";
import { usePathname } from "next/navigation";
import ProfileModal from "./ProfileModal";
import { AuthService } from "@/lib/auth";
import { CryptoService } from "@/lib/crypto";
import { WorkspaceService } from "@/services/workspace.service";
import DecryptedImage from "@/components/DecryptedImage";

interface TopBarProps {
  workspaceName?: string;
  adminName?: string;
  adminRole?: string;
  adminEmail?: string;
}

function getInitials(name: string): string {
  if (!name || name === "Admin Utama" || name === "Admin") return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function TopBar({
  workspaceName: propWorkspaceName,
  adminName: propAdminName,
  adminRole: propAdminRole,
  adminEmail: propAdminEmail,
}: TopBarProps) {
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Dynamic user data states (start empty to prevent flashing static/dummy values)
  const [currentAdminName, setCurrentAdminName] = useState("");
  const [currentAdminRole, setCurrentAdminRole] = useState("");
  const [currentAdminEmail, setCurrentAdminEmail] = useState("");
  const [currentWorkspaceName, setCurrentWorkspaceName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync logged in user data, active workspace, and profile avatar
  const syncUserData = useCallback(() => {
    if (typeof window === "undefined") return;

    // 1. Sanitize stale mock data in localStorage from previous sessions
    const storedName = localStorage.getItem("audit_pro_admin_name");
    if (storedName === "Admin Utama" || storedName === "Admin") {
      localStorage.removeItem("audit_pro_admin_name");
    }

    const activeWs = AuthService.getActiveWorkspace();
    if (activeWs?.name === "WORKSPACE A" || activeWs?.name === "Workspace A") {
      localStorage.removeItem("audit_pro_active_workspace");
    }

    const currentUser = AuthService.getCurrentUser();
    const validStoredName = localStorage.getItem("audit_pro_admin_name");
    const storedAvatar = localStorage.getItem("audit_pro_avatar") || currentUser?.profilePicture;

    // Profile Name
    const resolvedName =
      validStoredName ||
      currentUser?.fullName ||
      propAdminName ||
      "";
    setCurrentAdminName(resolvedName);

    // Profile Role
    const resolvedRole =
      currentUser?.role ||
      propAdminRole ||
      "";
    setCurrentAdminRole(resolvedRole);

    // Profile Email
    const resolvedEmail =
      currentUser?.email ||
      propAdminEmail ||
      "";
    setCurrentAdminEmail(resolvedEmail);

    // Active Workspace Name
    const currentActiveWs = AuthService.getActiveWorkspace();
    if (currentActiveWs?.name && currentActiveWs.name !== "WORKSPACE A" && currentActiveWs.name !== "Workspace A") {
      setCurrentWorkspaceName(currentActiveWs.name);
    } else if (currentUser?.workspaceName && currentUser.workspaceName !== "WORKSPACE A" && currentUser.workspaceName !== "Workspace A") {
      setCurrentWorkspaceName(currentUser.workspaceName);
    } else if (propWorkspaceName && propWorkspaceName !== "WORKSPACE A" && propWorkspaceName !== "Workspace A") {
      setCurrentWorkspaceName(propWorkspaceName);
    } else if (currentUser?.role === "Super Admin") {
      // Auto-fetch real workspace for Super Admin if none active yet
      WorkspaceService.fetchAll().then((wsList) => {
        if (Array.isArray(wsList) && wsList.length > 0) {
          const firstWs = wsList[0];
          const wsName = firstWs.companyName || firstWs.name;
          setCurrentWorkspaceName(wsName);
          AuthService.setActiveWorkspace({
            id: firstWs.id,
            name: wsName,
          });
        } else if (currentUser?.companyName) {
          setCurrentWorkspaceName(currentUser.companyName);
        } else {
          setCurrentWorkspaceName("");
        }
      }).catch(() => {
        if (currentUser?.companyName) {
          setCurrentWorkspaceName(currentUser.companyName);
        } else {
          setCurrentWorkspaceName("");
        }
      });
    } else if (currentUser?.companyName) {
      setCurrentWorkspaceName(currentUser.companyName);
    } else {
      setCurrentWorkspaceName("");
    }

    // Avatar
    if (storedAvatar) {
      if (CryptoService.isEncrypted(storedAvatar)) {
        CryptoService.decryptImage(storedAvatar)
          .then((dec) => setAvatar(dec))
          .catch(() => setAvatar(null));
      } else {
        setAvatar(storedAvatar);
      }
    } else {
      setAvatar(null);
    }
  }, [propAdminName, propAdminRole, propAdminEmail, propWorkspaceName]);

  useEffect(() => {
    syncUserData();

    window.addEventListener("workspace-changed", syncUserData);
    window.addEventListener("auth-changed", syncUserData);
    window.addEventListener("storage", syncUserData);

    return () => {
      window.removeEventListener("workspace-changed", syncUserData);
      window.removeEventListener("auth-changed", syncUserData);
      window.removeEventListener("storage", syncUserData);
    };
  }, [syncUserData]);

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

  const isSuperAdminPage =
    pathname.startsWith("/workspace") || pathname.startsWith("/kelola-admin");

  return (
    <>
      <div className="w-full bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 hidden md:flex">
        {/* Workspace Pill (Hanya tampil jika ada workspace terpilih dan bukan pada halaman konfigurasi superadmin) */}
        {!isSuperAdminPage && currentWorkspaceName ? (
          <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#f0f5ff] border border-[#d6e4ff] text-[#1e4ed8] text-[10px] font-bold tracking-wider uppercase">
            {currentWorkspaceName}
          </div>
        ) : (
          <div />
        )}

        {/* Right Admin Profile & Settings */}
        <div className="flex items-center gap-3.5 ml-auto">
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
            <div className="w-8 h-8 rounded-full bg-[#e0e7ff] text-[#1d4ed8] group-hover:bg-[#dbeafe] flex items-center justify-center font-bold text-xs shrink-0 border border-[#c7d2fe] transition-colors shadow-2xs overflow-hidden">
              {avatar ? (
                <DecryptedImage
                  src={avatar}
                  alt={currentAdminName || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : getInitials(currentAdminName) ? (
                <span>{getInitials(currentAdminName)}</span>
              ) : (
                <User className="w-4 h-4 text-[#1d4ed8]" />
              )}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-900 group-hover:text-[#193f53] leading-tight transition-colors">
                {currentAdminName || "Pengguna"}
              </p>
              {currentAdminRole ? (
                <p className="text-[10px] text-slate-400 group-hover:text-slate-500 font-normal mt-0.5 transition-colors">
                  {currentAdminRole}
                </p>
              ) : null}
            </div>
          </button>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        adminName={currentAdminName}
        adminRole={currentAdminRole}
        adminEmail={currentAdminEmail}
        workspaceName={currentWorkspaceName}
        avatarUrl={avatar}
        onUpdateProfile={({ name, avatar: newAvatar }) => {
          if (name) {
            setCurrentAdminName(name);
            localStorage.setItem("audit_pro_admin_name", name);
            const user = AuthService.getCurrentUser();
            if (user) {
              AuthService.setCurrentUser({ ...user, fullName: name });
            }
          }
          if (newAvatar !== undefined) {
            setAvatar(newAvatar);
          }
        }}
      />
    </>
  );
}

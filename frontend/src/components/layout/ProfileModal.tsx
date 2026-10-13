"use client";

import React from "react";
import { X, User, Mail, Shield, Building2, CheckCircle2 } from "lucide-react";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName?: string;
  adminRole?: string;
  workspaceName?: string;
}

export default function ProfileModal({
  isOpen,
  onClose,
  adminName = "Admin Utama",
  adminRole = "Head Auditor",
  workspaceName = "WORKSPACE A",
}: ProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="bg-white rounded-3xl w-full max-w-md relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-4 relative border-b border-slate-100">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-center">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
              <User className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                Profil Pengguna
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Informasi akun dan penugasan akses sistem
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Avatar & Main Info Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#193f53] text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0 border-2 border-white ring-2 ring-slate-100">
              AD
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {adminName}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Aktif
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {adminRole}
              </p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-600">
                <Building2 className="w-3 h-3 text-slate-400" />
                {workspaceName}
              </div>
            </div>
          </div>

          {/* Details List */}
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Email</span>
              </div>
              <span className="font-semibold text-slate-800">
                admin@storeaudit.com
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100">
              <div className="flex items-center gap-2 text-slate-500 font-medium">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>Hak Akses</span>
              </div>
              <span className="font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                Admin
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#193f53] hover:bg-[#132f3e] text-white shadow-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

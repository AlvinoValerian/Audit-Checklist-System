"use client";

import React from "react";
import {
  X,
  Wrench,
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  Cpu,
  Pencil,
  Terminal,
} from "lucide-react";
import { TeknisUser } from "@/types/teknis";

interface DetailTeknisModalProps {
  user: TeknisUser | null;
  onClose: () => void;
  onEdit?: () => void;
}

export default function DetailTeknisModal({
  user,
  onClose,
  onEdit,
}: DetailTeknisModalProps) {
  if (!user) return null;

  const isActive = user.status === "Aktif";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-slate-100 z-50 animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-sky-600 font-bold text-[11px] tracking-wider uppercase">
              <Terminal className="w-3.5 h-3.5" />
              <span>PROFIL DIVISI TEKNIS</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="w-14 h-14 rounded-2xl bg-[#193f53] text-white flex items-center justify-center font-bold text-xl shadow-xs border border-slate-200">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {user.fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  <Wrench className="w-3 h-3" />
                  Divisi Teknis
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  {user.status}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 text-xs">
          {/* 1. Bidang Spesialisasi */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                Spesialisasi & Tanggung Jawab
              </p>
              <p className="text-xs font-bold text-slate-900 mt-0.5">
                {user.specialization}
              </p>
            </div>
          </div>

          {/* 2. Informasi Kontak & Akun */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Informasi Kontak
            </p>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-400 block text-[10px]">Email Sistem</span>
                <span className="font-semibold text-slate-800 break-all">{user.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Nomor Telepon</span>
                <span className="font-semibold text-slate-800">{user.phone || "-"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Lingkungan Kerja</span>
                <span className="font-semibold text-slate-800">
                  Sandbox Internal Divisi Teknis
                </span>
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[9px] font-bold">
                  Terisolasi
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Terdaftar Sejak</span>
                <span className="font-semibold text-slate-800">{user.createdAt || "-"}</span>
              </div>
            </div>
          </div>

          {/* 3. Hak Akses & Privilese Sistem */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                Hak Akses Sistem (Full Control)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Sebagai personil Divisi Teknis, user ini memiliki izin operasional penuh:
            </p>
            <ul className="space-y-1.5 text-[11px] text-slate-700 font-medium">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Monitoring Realtime & Ekspor Laporan Seluruh Toko</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Kelola Jadwal Audit, Pengecualian & Libur Toko</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Kelola SOP Template Checklist & Parameter Audit</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Akses Manajemen Akun Admin, Staff, & User Teknis Baru</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Integrasi Asisten AI Tanya AI & Pengaturan Workspace</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tutup
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-4 py-2 rounded-xl bg-[#193f53] hover:bg-[#123040] text-xs font-semibold text-white flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit User Teknis</span>
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

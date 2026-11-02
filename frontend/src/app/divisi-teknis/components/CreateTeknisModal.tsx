"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Wrench,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  Loader2,
  Cpu,
} from "lucide-react";
import { TeknisUser } from "@/types/teknis";
import { Workspace } from "@/types/workspace";
import { toast } from "sonner";

interface CreateTeknisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<TeknisUser, "id" | "rawId" | "createdAt"> & { password?: string }) => Promise<void>;
  workspaces?: Workspace[];
  isSubmitting?: boolean;
}

const SPECIALIZATION_PRESETS = [
  "IT Support & Helpdesk",
  "System Administrator",
  "Network & Security Engineer",
  "Hardware & IoT Specialist",
  "DevOps & Cloud Infrastructure",
  "Database & Backend Engineer",
  "Technical Lead / Full System",
];

export default function CreateTeknisModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: CreateTeknisModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState(SPECIALIZATION_PRESETS[0]);
  const [customSpec, setCustomSpec] = useState("");
  const [isCustomSpec, setIsCustomSpec] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"Aktif" | "Nonaktif">("Aktif");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName("");
      setEmail("");
      setPhone("");
      setSpecialization(SPECIALIZATION_PRESETS[0]);
      setCustomSpec("");
      setIsCustomSpec(false);
      setPassword("");
      setConfirmPassword("");
      setStatus("Aktif");
      setShowPassword(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();

    // 1. Validasi Nama
    if (!trimmedName) {
      toast.error("Nama lengkap personil teknis wajib diisi.");
      return;
    }
    if (!/^[a-zA-Z\s.,']+$/.test(trimmedName)) {
      toast.error("Nama lengkap hanya boleh berisi huruf, spasi, dan tanda baca gelar.");
      return;
    }

    // 2. Validasi Email
    if (!trimmedEmail) {
      toast.error("Email teknis wajib diisi.");
      return;
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast.error("Format email tidak valid (contoh: nama.teknis@perusahaan.com).");
      return;
    }

    // 3. Validasi Telepon
    if (trimmedPhone && !/^\d+$/.test(trimmedPhone)) {
      toast.error("Nomor telepon hanya boleh berisi angka.");
      return;
    }
    if (trimmedPhone && (trimmedPhone.length < 10 || trimmedPhone.length > 15)) {
      toast.error("Nomor telepon harus antara 10 hingga 15 digit angka.");
      return;
    }

    // 4. Validasi Password
    if (!password) {
      toast.error("Kata sandi wajib diisi.");
      return;
    }
    if (password.length < 8) {
      toast.error("Kata sandi minimal 8 karakter.");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Kata sandi harus mengombinasikan huruf dan angka.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Konfirmasi kata sandi tidak cocok.");
      return;
    }

    const finalSpec = isCustomSpec ? customSpec.trim() || "IT Support" : specialization;

    try {
      await onSubmit({
        fullName: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || "-",
        specialization: finalSpec,
        role: "Divisi Teknis",
        status,
        workspaceName: "Divisi Teknis - Sandbox Testing",
        password,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan user teknis.";
      toast.error(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Box */}
      <div className="bg-white rounded-3xl w-full max-w-lg relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-3 relative bg-slate-50/50">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#193f53] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Wrench className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Tambah User Divisi Teknis
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-[9px] font-extrabold uppercase tracking-wider">
                  AKSES PENUH
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Akun ini memiliki hak akses seluruh fitur & pemeliharaan teknis sistem.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form id="create-teknis-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* 1. Nama Lengkap */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Lengkap Personil <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Rian Hidayat, S.Kom"
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
              />
            </div>
          </div>

          {/* 2. Email & Nomor Telepon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Teknis <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teknis@auditcorp.com"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor Telepon
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081234567890"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
                />
              </div>
            </div>
          </div>

          {/* 3. Spesialisasi Divisi Teknis */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Spesialisasi / Bidang Teknis <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCustomSpec(!isCustomSpec)}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold cursor-pointer"
              >
                {isCustomSpec ? "Pilih Preset" : "+ Ketik Manual"}
              </button>
            </div>

            {isCustomSpec ? (
              <div className="relative">
                <Cpu className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={customSpec}
                  onChange={(e) => setCustomSpec(e.target.value)}
                  placeholder="Ketik bidang keahlian teknis (contoh: Security Auditor & Pentester)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
                />
              </div>
            ) : (
              <select
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] cursor-pointer"
              >
                {SPECIALIZATION_PRESETS.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 4. Lingkungan Sandbox Internal (Tanpa Penugasan Workspace Manual) */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0 mt-0.5">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Sandbox Internal Divisi Teknis
                </span>
                <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-700 text-[10px] font-bold">
                  Terisolasi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Akun personil teknis ini otomatis terhubung ke lingkungan sandbox internal untuk pengujian sistem secara mandiri, tanpa terhubung atau mempengaruhi data penyewa umum.
              </p>
            </div>
          </div>

          {/* 5. Kata Sandi & Konfirmasi */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 karakter"
                  required
                  className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Konfirmasi Kata Sandi <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi"
                  required
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
                />
              </div>
            </div>
          </div>

          {/* 6. Status Akun */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status Awal Akun
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStatus("Aktif")}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  status === "Aktif"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs font-bold"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                ● Aktif (Dapat Langsung Login)
              </button>
              <button
                type="button"
                onClick={() => setStatus("Nonaktif")}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  status === "Nonaktif"
                    ? "bg-rose-50 text-rose-700 border-rose-300 shadow-2xs font-bold"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                ○ Nonaktif (Terkunci)
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Batal
          </button>
          <button
            type="submit"
            form="create-teknis-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-[#193f53] hover:bg-[#123040] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan User Teknis...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Simpan User Teknis</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

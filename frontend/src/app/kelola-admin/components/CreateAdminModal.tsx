"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Workspace } from "@/types/workspace";
import { UserPlus, Eye, EyeOff, Info, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  onSubmit: (formData: {
    fullName: string;
    email: string;
    phone?: string;
    role: "Admin" | "Super Admin" | "Staff";
    workspaceName: string;
    status: "Aktif" | "Nonaktif";
    password?: string;
  }) => void;
}

export default function CreateAdminModal({
  isOpen,
  onClose,
  workspaces,
  onSubmit,
}: CreateAdminModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "Admin" as "Admin" | "Super Admin" | "Staff",
    password: "",
    confirmPassword: "",
    workspaceName: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        fullName: "",
        email: "",
        role: "Admin",
        password: "",
        confirmPassword: "",
        workspaceName: "",
        status: "Aktif",
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error("Nama lengkap wajib diisi!");
      return;
    }

    if (!formData.email.trim()) {
      toast.error("Email wajib diisi!");
      return;
    }

    if (!formData.password) {
      toast.error("Password wajib diisi!");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password minimal 8 karakter!");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Konfirmasi password tidak cocok!");
      return;
    }

    if (!formData.workspaceName) {
      toast.error("Silakan pilih workspace penugasan!");
      return;
    }

    onSubmit({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: "-",
      role: formData.role,
      workspaceName: formData.workspaceName,
      status: formData.status,
      password: formData.password,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Admin Baru"
      subtitle="Tambahkan pengguna baru dengan hak akses admin pada workspace tertentu"
      icon={<UserPlus className="w-5 h-5 text-sky-600" />}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nama Lengkap */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Nama Lengkap <span className="text-rose-500 font-bold">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Masukkan nama lengkap admin"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Email <span className="text-rose-500 font-bold">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="contoh@perusahaan.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>

        {/* Password & Konfirmasi Password */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Password <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="Minimal 8 karakter"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                {showPassword ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Konfirmasi Password <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                placeholder="Ulangi password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              >
                {showConfirmPassword ? (
                  <Eye className="w-4 h-4" />
                ) : (
                  <EyeOff className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Workspace Penugasan */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Pilih Workspace <span className="text-rose-500 font-bold">*</span>
          </label>
          <div className="relative">
            <select
              required
              value={formData.workspaceName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  workspaceName: e.target.value,
                })
              }
              className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all text-slate-800 cursor-pointer"
            >
              <option value="" disabled>
                Pilih workspace untuk admin ini
              </option>
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.name}>
                  {ws.name}
                </option>
              ))}
              <option value="Semua Workspace (Pusat)">
                Semua Workspace (Pusat)
              </option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Info Alert Box */}
        <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-800 leading-relaxed">
            Akun Admin baru akan langsung memiliki akses ke seluruh fitur operasional
            pada workspace yang ditugaskan.
          </p>
        </div>

        {/* Status Akun */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Status Akun Awal
          </label>
          <div className="relative">
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "Aktif" | "Nonaktif",
                })
              }
              className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all text-slate-800 cursor-pointer"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-center"
          >
            Batal
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs cursor-pointer text-center"
          >
            Simpan Admin
          </button>
        </div>
      </form>
    </Modal>
  );
}

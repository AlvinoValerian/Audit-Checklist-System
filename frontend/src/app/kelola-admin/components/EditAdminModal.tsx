"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { AdminUser, AdminRole } from "@/types/admin";
import { Workspace } from "@/types/workspace";
import { Pencil, Eye, EyeOff, Info, ChevronDown, Lock } from "lucide-react";
import { toast } from "sonner";

interface EditAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: AdminUser | null;
  workspaces: Workspace[];
  onSubmit: (formData: {
    fullName: string;
    email: string;
    phone?: string;
    role: AdminRole;
    workspaceName: string;
    status: "Aktif" | "Nonaktif";
    password?: string;
  }) => void;
}

export default function EditAdminModal({
  isOpen,
  onClose,
  admin,
  workspaces,
  onSubmit,
}: EditAdminModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "Admin" as AdminRole,
    workspaceName: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (admin && isOpen) {
      setFormData({
        fullName: admin.fullName || "",
        email: admin.email || "",
        phone: admin.phone && admin.phone !== "-" ? admin.phone : "",
        role: admin.role || "Admin",
        workspaceName: admin.workspaceName || "",
        status: admin.status || "Aktif",
        newPassword: "",
        confirmNewPassword: "",
      });
      setShowPasswordSection(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    }
  }, [admin, isOpen]);

  if (!admin) return null;

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

    if (!formData.workspaceName) {
      toast.error("Silakan pilih workspace penugasan!");
      return;
    }

    if (showPasswordSection && formData.newPassword) {
      if (formData.newPassword.length < 8) {
        toast.error("Password baru minimal 8 karakter!");
        return;
      }
      if (formData.newPassword !== formData.confirmNewPassword) {
        toast.error("Konfirmasi password baru tidak cocok!");
        return;
      }
    }

    onSubmit({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || "-",
      role: formData.role,
      workspaceName: formData.workspaceName,
      status: formData.status,
      password: showPasswordSection && formData.newPassword ? formData.newPassword : undefined,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Admin"
      subtitle="Perbarui profil, hak akses, dan status akun admin"
      icon={<Pencil className="w-5 h-5 text-sky-600" />}
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

        {/* Email & No Telepon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              No. Telepon / WhatsApp
            </label>
            <input
              type="text"
              placeholder="0812-xxxx-xxxx"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>
        </div>

        {/* Workspace Penugasan & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Workspace Penugasan <span className="text-rose-500 font-bold">*</span>
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
                  Pilih workspace
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

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Role Akun
            </label>
            <div className="relative">
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as AdminRole,
                  })
                }
                className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all text-slate-800 cursor-pointer"
              >
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
                {admin.role === "Super Admin" && (
                  <option value="Super Admin">Super Admin</option>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Status Akun */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Status Akun
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

        {/* Toggle Ganti Password */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="flex items-center gap-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>
              {showPasswordSection
                ? "Batal Ubah Password"
                : "Ubah Password Admin (Opsional)"}
            </span>
          </button>
        </div>

        {/* Ganti Password Section */}
        {showPasswordSection && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <p className="text-[11px] text-slate-500">
              Isi field di bawah hanya jika ingin mengubah atau me-reset password akun admin ini.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    value={formData.newPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, newPassword: e.target.value })
                    }
                    className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] transition-all text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showNewPassword ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ulangi password baru"
                    value={formData.confirmNewPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmNewPassword: e.target.value,
                      })
                    }
                    className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] transition-all text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 hover:text-slate-600 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <Eye className="w-3.5 h-3.5" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Alert Box */}
        <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-800 leading-relaxed">
            Perubahan hak akses dan penugasan workspace akan langsung berlaku saat disimpan.
          </p>
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
            Simpan Perubahan
          </button>
        </div>
      </form>
    </Modal>
  );
}

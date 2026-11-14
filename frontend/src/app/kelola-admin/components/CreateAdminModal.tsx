"use client";

import React, { useState, useEffect, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import { Workspace } from "@/types/workspace";
import { UserPlus, Eye, EyeOff, Info, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: Workspace[];
  isSubmitting?: boolean;
  isDivisiTeknis?: boolean;
  manualSuperAdminCount?: number;
  maxManualSuperAdmins?: number;
  onSubmit: (formData: {
    fullName: string;
    email: string;
    role: "Admin" | "Super Admin" | "Staff";
    workspaceName: string;
    companyName?: string;
    status: "Aktif" | "Nonaktif";
    password?: string;
  }) => void;
}

export default function CreateAdminModal({
  isOpen,
  onClose,
  workspaces,
  isSubmitting = false,
  isDivisiTeknis = false,
  manualSuperAdminCount = 0,
  maxManualSuperAdmins = 2,
  onSubmit,
}: CreateAdminModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "Admin" as "Admin" | "Super Admin" | "Staff",
    password: "",
    confirmPassword: "",
    workspaceName: "",
    companyName: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  const isCreatingSuperAdmin = isDivisiTeknis && formData.role === "Super Admin";
  const isSuperAdminQuotaFull = manualSuperAdminCount >= maxManualSuperAdmins;

  // Pisahkan workspace aktif di atas, nonaktif di bawah sendiri
  const activeWorkspaces = useMemo(
    () => workspaces.filter((ws) => ws.status === "Aktif"),
    [workspaces]
  );
  const inactiveWorkspaces = useMemo(
    () => workspaces.filter((ws) => ws.status !== "Aktif"),
    [workspaces]
  );

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
        companyName: "",
        status: "Aktif",
      });
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

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

    if (isCreatingSuperAdmin) {
      if (isSuperAdminQuotaFull) {
        toast.error(
          `Batas maksimal ${maxManualSuperAdmins} akun Super Admin di Divisi Teknis telah tercapai.`
        );
        return;
      }

      onSubmit({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        role: "Super Admin",
        workspaceName: "All Workspaces (Central)",
        companyName: formData.companyName.trim() || undefined,
        status: "Aktif",
        password: formData.password,
      });
      return;
    }

    if (!formData.workspaceName) {
      toast.error("Silakan pilih workspace penugasan!");
      return;
    }

    const chosenWs = workspaces.find((w) => w.name === formData.workspaceName);
    if (chosenWs && chosenWs.status === "Nonaktif") {
      toast.error("Workspace yang dipilih berstatus Nonaktif dan tidak dapat dipilih!");
      return;
    }

    onSubmit({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      role: formData.role,
      workspaceName: formData.workspaceName,
      status: formData.status,
      password: formData.password,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : onClose}
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
            disabled={isSubmitting}
            placeholder="Masukkan nama lengkap admin"
            value={formData.fullName}
            onChange={(e) =>
              setFormData({ ...formData, fullName: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all placeholder:text-slate-400 text-slate-800"
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
            disabled={isSubmitting}
            placeholder="contoh@perusahaan.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all placeholder:text-slate-400 text-slate-800"
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
                disabled={isSubmitting}
                placeholder="Minimal 8 karakter"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all placeholder:text-slate-400 text-slate-800"
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
                disabled={isSubmitting}
                placeholder="Ulangi password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all placeholder:text-slate-400 text-slate-800"
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

        {/* Workspace Penugasan / Cakupan Super Admin */}
        {isCreatingSuperAdmin ? (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Cakupan Workspace
              </label>
              <input
                type="text"
                value="Pusat / Semua Workspace (Independen)"
                readOnly
                disabled
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium cursor-not-allowed select-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                Nama Perusahaan / Unit (Opsional)
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                placeholder="Contoh: Divisi Audit Regional / Unit Partner"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all placeholder:text-slate-400 text-slate-800"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Pilih Workspace <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <select
                required
                disabled={isSubmitting}
                value={formData.workspaceName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    workspaceName: e.target.value,
                  })
                }
                className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800 cursor-pointer"
              >
                <option value="" disabled>
                  Pilih workspace untuk admin ini
                </option>
                {/* Workspace Aktif di Bagian Atas */}
                {activeWorkspaces.map((ws) => (
                  <option key={ws.id} value={ws.name}>
                    {ws.name}
                  </option>
                ))}

                {/* Workspace Nonaktif di Bagian Bawah Sendiri */}
                {inactiveWorkspaces.map((ws) => (
                  <option
                    key={ws.id}
                    value={ws.name}
                    disabled
                    className="text-slate-400 bg-slate-50"
                  >
                    {ws.name} (Nonaktif - Tidak dapat dipilih)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Info Alert Box */}
        <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="text-xs text-sky-800 leading-relaxed">
            {isCreatingSuperAdmin
              ? `Akun Super Admin baru bersifat independen dan dapat membuat serta mengelola workspace miliknya sendiri. Kuota Super Admin Divisi Teknis saat ini ${manualSuperAdminCount}/${maxManualSuperAdmins}.`
              : "Akun Admin baru akan langsung memiliki akses ke seluruh fitur operasional pada workspace yang ditugaskan."}
          </p>
        </div>

        {/* Role & Status Akun */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Role Akun */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Role Akun
            </label>
            {isDivisiTeknis ? (
              <div>
                <div className="relative">
                  <select
                    disabled={isSubmitting}
                    value={formData.role}
                    onChange={(e) => {
                      const nextRole = e.target.value as "Admin" | "Super Admin";
                      setFormData({
                        ...formData,
                        role: nextRole,
                        workspaceName: nextRole === "Super Admin" ? "" : formData.workspaceName,
                        status: nextRole === "Super Admin" ? "Aktif" : formData.status,
                      });
                    }}
                    className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="Admin">Admin</option>
                    <option
                      value="Super Admin"
                      disabled={isSuperAdminQuotaFull && formData.role !== "Super Admin"}
                    >
                      {isSuperAdminQuotaFull
                        ? `Super Admin (Kuota Penuh ${manualSuperAdminCount}/${maxManualSuperAdmins})`
                        : `Super Admin (${manualSuperAdminCount}/${maxManualSuperAdmins})`}
                    </option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p
                  className={`mt-1 text-[11px] font-medium ${
                    isSuperAdminQuotaFull ? "text-amber-600" : "text-slate-500"
                  }`}
                >
                  Kuota Super Admin Teknis: {manualSuperAdminCount}/{maxManualSuperAdmins}
                </p>
              </div>
            ) : (
              <input
                type="text"
                value="Admin"
                readOnly
                disabled
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-semibold cursor-not-allowed select-none"
              />
            )}
          </div>

          {/* Status Akun */}
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Status Akun Awal
            </label>
            {isCreatingSuperAdmin ? (
              <input
                type="text"
                value="Aktif"
                readOnly
                disabled
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-100 border border-slate-200 rounded-lg text-emerald-700 font-semibold cursor-not-allowed select-none"
              />
            ) : (
              <div className="relative">
                <select
                  disabled={isSubmitting}
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as "Aktif" | "Nonaktif",
                    })
                  }
                  className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800 cursor-pointer"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-lg transition-colors cursor-pointer text-center"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] disabled:opacity-70 rounded-lg transition-colors shadow-2xs cursor-pointer text-center flex items-center justify-center gap-2 min-w-[145px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>{isCreatingSuperAdmin ? "Simpan Super Admin" : "Simpan Admin"}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

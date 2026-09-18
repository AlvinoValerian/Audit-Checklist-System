"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import { AdminService } from "@/services/admin.service";
import { WorkspaceService } from "@/services/workspace.service";
import { Workspace } from "@/types/workspace";
import { AdminRole } from "@/types/admin";
import { ArrowLeft, UserPlus, Shield, Mail, Phone, Lock, Building } from "lucide-react";
import { toast } from "sonner";

export default function CreateAdminPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "Area Admin" as AdminRole,
    workspaceName: "",
    password: "",
    confirmPassword: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  useEffect(() => {
    const wsList = WorkspaceService.getAll();
    setWorkspaces(wsList);
    if (wsList.length > 0) {
      setFormData((prev) => ({
        ...prev,
        workspaceName: prev.workspaceName || wsList[0].name,
      }));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fullName.trim() || !formData.email.trim()) {
      toast.error("Nama lengkap dan email wajib diisi!");
      return;
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error("Password dan konfirmasi password tidak cocok!");
      return;
    }

    AdminService.create({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || "-",
      role: formData.role,
      workspaceName:
        formData.role === "Super Admin"
          ? "All Workspaces (Central)"
          : formData.workspaceName || "Workspace A",
      status: formData.status,
    });

    toast.success(`Admin "${formData.fullName}" berhasil ditambahkan!`);
    router.push("/admins");
  };

  return (
    <DashboardLayout>
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/admins"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#193f53] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Manajemen Admin</span>
        </Link>
      </div>

      <div className="max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 sm:px-8 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Tambah Admin / Petugas Baru
            </h2>
            <p className="text-xs text-slate-500">
              Buat akun pengguna baru dan tentukan hak akses serta wilayah penugasan.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Rian Hidayat"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20"
            />
          </div>

          {/* Email & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@storeaudit.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor WhatsApp / Telepon
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="0812-3456-7890"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20"
                />
              </div>
            </div>
          </div>

          {/* Role & Workspace Assignment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Peran / Hak Akses <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as AdminRole,
                  })
                }
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] bg-white cursor-pointer"
              >
                <option value="Area Admin">Area Admin</option>
                <option value="Auditor Lapangan">Auditor Lapangan</option>
                <option value="Super Admin">Super Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Penugasan Workspace
              </label>
              {formData.role === "Super Admin" ? (
                <div className="px-3.5 py-2.5 text-xs sm:text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
                  Semua Workspace (Pusat)
                </div>
              ) : (
                <select
                  value={formData.workspaceName}
                  onChange={(e) =>
                    setFormData({ ...formData, workspaceName: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] bg-white cursor-pointer"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.name}>
                      {ws.name} ({ws.storeCount} Toko)
                    </option>
                  ))}
                  {workspaces.length === 0 && (
                    <option value="Workspace A">Workspace A</option>
                  )}
                </select>
              )}
            </div>
          </div>

          {/* Passwords */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Konfirmasi Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Status Awal
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "Aktif" | "Nonaktif",
                })
              }
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] bg-white cursor-pointer"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
            <Link
              href="/admins"
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              Simpan & Buat Akun
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import AdminStats from "@/components/admin/AdminStats";
import AdminTable from "@/components/admin/AdminTable";
import { AdminService } from "@/services/admin.service";
import { WorkspaceService } from "@/services/workspace.service";
import { AdminUser, AdminStatsData } from "@/types/admin";
import { Workspace } from "@/types/workspace";
import { Plus, X, Eye, EyeOff, Info, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [stats, setStats] = useState<AdminStatsData>({
    totalAdmins: 0,
    activeAdmins: 0,
    inactiveAdmins: 0,
    totalAuditors: 0,
    totalWorkspaces: 0,
  });

  // Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    workspaceName: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const refreshData = () => {
    const list = AdminService.getAll();
    const wsList = WorkspaceService.getAll();
    setAdmins(list);
    setWorkspaces(wsList);
    const calculatedStats = AdminService.getStats(list);
    setStats({
      ...calculatedStats,
      totalWorkspaces: wsList.length,
    });
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!createFormData.fullName.trim()) {
      toast.error("Nama lengkap wajib diisi!");
      return;
    }

    if (!createFormData.email.trim()) {
      toast.error("Email wajib diisi!");
      return;
    }

    if (!createFormData.password) {
      toast.error("Password wajib diisi!");
      return;
    }

    if (createFormData.password.length < 8) {
      toast.error("Password minimal 8 karakter!");
      return;
    }

    if (createFormData.password !== createFormData.confirmPassword) {
      toast.error("Konfirmasi password tidak cocok!");
      return;
    }

    if (!createFormData.workspaceName) {
      toast.error("Silakan pilih workspace penugasan!");
      return;
    }

    AdminService.create({
      fullName: createFormData.fullName.trim(),
      email: createFormData.email.trim(),
      phone: "-",
      role: "Admin",
      workspaceName: createFormData.workspaceName,
      status: createFormData.status,
    });

    toast.success(`Admin "${createFormData.fullName}" berhasil ditambahkan!`);
    setIsCreateModalOpen(false);
    setCreateFormData({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      workspaceName: "",
      status: "Aktif",
    });
    refreshData();
  };

  const handleUpdate = (id: string, data: Partial<AdminUser>) => {
    AdminService.update(id, data);
    refreshData();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus admin "${name}"?`)) {
      AdminService.delete(id);
      toast.info(`Akun admin "${name}" telah dihapus.`);
      refreshData();
    }
  };

  return (
    <DashboardLayout>
      <Header
        title="Admin Management"
        subtitle="Kelola akun Admin dan workspace yang menjadi tanggung jawabnya"
        action={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#193f53] hover:bg-[#143343] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Admin</span>
          </button>
        }
      />

      <AdminStats stats={stats} />

      <AdminTable
        admins={admins}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* Modal Tambah Admin Baru (Matching Figma Screenshot) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight">
                Tambah Admin Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-5">
              {/* Nama Lengkap */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama lengkap"
                  value={createFormData.fullName}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      fullName: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="contoh@perusahaan.com"
                  value={createFormData.email}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      email: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>

              {/* Password & Konfirmasi Password (2 cols) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimal 8 karakter"
                      value={createFormData.password}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          password: e.target.value,
                        })
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
                    Konfirmasi Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      placeholder="Ulangi password"
                      value={createFormData.confirmPassword}
                      onChange={(e) =>
                        setCreateFormData({
                          ...createFormData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
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

              {/* Pilih Workspace */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Pilih Workspace
                </label>
                <div className="relative">
                  <select
                    required
                    value={createFormData.workspaceName}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
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

              {/* Blue Alert Info Box */}
              <div className="bg-sky-50/70 border border-sky-100 rounded-xl p-3 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <p className="text-xs text-sky-800 leading-relaxed">
                  Akun Admin akan mendapatkan akses ke seluruh fitur operasional
                  pada workspace yang dipilih.
                </p>
              </div>

              {/* Status Akun (Toggle Switch) */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-2">
                  Status Akun
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={createFormData.status === "Aktif"}
                    onClick={() =>
                      setCreateFormData({
                        ...createFormData,
                        status:
                          createFormData.status === "Aktif"
                            ? "Nonaktif"
                            : "Aktif",
                      })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      createFormData.status === "Aktif"
                        ? "bg-[#193f53]"
                        : "bg-slate-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        createFormData.status === "Aktif"
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-xs sm:text-sm text-slate-700 font-medium">
                    {createFormData.status}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  Simpan Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

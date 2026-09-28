"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  MapPin,
  ClipboardList,
} from "lucide-react";
import { AdminUser, AdminRole } from "@/types/admin";
import { toast } from "sonner";

interface AdminTableProps {
  admins: AdminUser[];
  onUpdate: (id: string, data: Partial<AdminUser>) => void;
  onDelete: (id: string, name: string) => void;
}

export default function AdminTable({
  admins,
  onUpdate,
  onDelete,
}: AdminTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("Semua");
  const [roleFilter, setRoleFilter] = useState<string>("Semua");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    fullName: "",
    phone: "",
    role: "Admin" as AdminRole,
    workspaceName: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  const workspaceOptions = useMemo(() => {
    const set = new Set<string>();
    admins.forEach((a) => {
      if (a.workspaceName) set.add(a.workspaceName);
    });
    return Array.from(set);
  }, [admins]);

  // Filter Logic
  const filteredAdmins = useMemo(() => {
    return admins.filter((adm) => {
      const matchesSearch =
        adm.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.workspaceName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesWorkspace =
        workspaceFilter === "Semua" ? true : adm.workspaceName === workspaceFilter;

      const matchesRole =
        roleFilter === "Semua" ? true : adm.role === roleFilter;

      const matchesStatus =
        statusFilter === "Semua" ? true : adm.status === statusFilter;

      return matchesSearch && matchesWorkspace && matchesRole && matchesStatus;
    });
  }, [admins, searchQuery, workspaceFilter, roleFilter, statusFilter]);

  // Pagination
  const itemsPerPage = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage) || 1;
  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAdmins.slice(start, start + itemsPerPage);
  }, [filteredAdmins, currentPage]);

  const handleEditClick = (adm: AdminUser) => {
    setSelectedAdmin(adm);
    setEditFormData({
      fullName: adm.fullName,
      phone: adm.phone,
      role: adm.role,
      workspaceName: adm.workspaceName,
      status: adm.status,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    onUpdate(selectedAdmin.id, {
      fullName: editFormData.fullName,
      phone: editFormData.phone,
      role: editFormData.role,
      workspaceName: editFormData.workspaceName,
      status: editFormData.status,
    });

    toast.success(`Data admin "${editFormData.fullName}" berhasil diperbarui!`);
    setIsEditModalOpen(false);
  };

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case "Super Admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60">
            <ShieldCheck className="w-3 h-3 text-purple-600" />
            Super Admin
          </span>
        );
      case "Admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
            <MapPin className="w-3 h-3 text-sky-600" />
            Admin
          </span>
        );
      case "Staff":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
            <ClipboardList className="w-3 h-3 text-amber-600" />
            Staff
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Search & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari admin (nama, email, telepon)..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Dropdowns (Matching Figma Screenshot) */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Workspace Filter */}
          <div className="relative flex-1 sm:flex-initial sm:w-48">
            <select
              value={workspaceFilter}
              onChange={(e) => {
                setWorkspaceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg px-3.5 py-2 pr-8 outline-none focus:border-[#193f53] cursor-pointer"
            >
              <option value="Semua">Semua Workspace</option>
              {workspaceOptions.map((ws) => (
                <option key={ws} value={ws}>
                  {ws}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 sm:flex-initial sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg px-3.5 py-2 pr-8 outline-none focus:border-[#193f53] cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-5">PENGGUNA</th>
              <th className="py-3.5 px-4">KONTAK</th>
              <th className="py-3.5 px-4">ROLE</th>
              <th className="py-3.5 px-5">WORKSPACE</th>
              <th className="py-3.5 px-4 text-center">STATUS</th>
              <th className="py-3.5 px-4">DIBUAT</th>
              <th className="py-3.5 px-5 text-right">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {paginatedAdmins.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-slate-400">
                  Tidak ada data admin ditemukan.
                </td>
              </tr>
            ) : (
              paginatedAdmins.map((adm) => (
                <tr
                  key={adm.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-4 px-5">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {adm.fullName}
                      </div>
                      <div className="text-xs text-slate-400">{adm.email}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-600 font-mono text-xs">
                    {adm.phone}
                  </td>
                  <td className="py-4 px-4">{getRoleBadge(adm.role)}</td>
                  <td className="py-4 px-5 text-slate-700 font-medium">
                    {adm.workspaceName}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        adm.status === "Aktif"
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          adm.status === "Aktif"
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                        }`}
                      ></span>
                      {adm.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-400 text-xs whitespace-nowrap">
                    {adm.createdAt}
                  </td>
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleEditClick(adm)}
                        title="Edit Admin"
                        className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(adm.id, adm.fullName)}
                        title="Hapus Admin"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Menampilkan{" "}
          <span className="font-semibold text-slate-700">
            {filteredAdmins.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
          </span>{" "}
          -{" "}
          <span className="font-semibold text-slate-700">
            {Math.min(currentPage * itemsPerPage, filteredAdmins.length)}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-slate-700">
            {filteredAdmins.length}
          </span>{" "}
          admin
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Sebelumnya
          </button>
          <span className="px-2 font-medium text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Selanjutnya
          </button>
        </div>
      </div>

      {/* Edit Admin Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                Edit Data Admin
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, fullName: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Telepon
                </label>
                <input
                  type="tel"
                  required
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Peran / Role
                </label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      role: e.target.value as AdminRole,
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53]"
                >
                  <option value="Super Admin">Super Admin</option>
                  <option value="Admin">Admin</option>
                  <option value="Staff">Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penugasan Workspace
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.workspaceName}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      workspaceName: e.target.value,
                    })
                  }
                  placeholder="Contoh: Workspace A (Jabodetabek)"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      status: e.target.value as "Aktif" | "Nonaktif",
                    })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#193f53]"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Building2,
  Cpu,
  Mail,
  Phone,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { TeknisUser, TeknisStats as ITeknisStats } from "@/types/teknis";
import { Workspace } from "@/types/workspace";
import { TeknisService } from "@/services/teknis.service";
import { WorkspaceService } from "@/services/workspace.service";
import { AuthService } from "@/lib/auth";
import ActionButtons from "@/components/ui/ActionButtons";
import TeknisStats from "./components/TeknisStats";
import CreateTeknisModal from "./components/CreateTeknisModal";
import EditTeknisModal from "./components/EditTeknisModal";
import DetailTeknisModal from "./components/DetailTeknisModal";
import SoftDeleteTeknisModal from "./components/SoftDeleteTeknisModal";
import RestoreTeknisModal from "./components/RestoreTeknisModal";
import { toast } from "sonner";

export default function DivisiTeknisPage() {
  const [users, setUsers] = useState<TeknisUser[]>([]);
  const [stats, setStats] = useState<ITeknisStats>(TeknisService.getStats([]));
  const [isLoading, setIsLoading] = useState(true);

  // Workspace Switcher State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("all");
  const [isSuperAdminOrTeknis, setIsSuperAdminOrTeknis] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [specializationFilter, setSpecializationFilter] = useState<string>("Semua");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const [selectedUserToEdit, setSelectedUserToEdit] = useState<TeknisUser | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [selectedUserToView, setSelectedUserToView] = useState<TeknisUser | null>(null);

  const [selectedUserToDelete, setSelectedUserToDelete] = useState<TeknisUser | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const [selectedUserToRestore, setSelectedUserToRestore] = useState<TeknisUser | null>(null);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isSubmittingRestore, setIsSubmittingRestore] = useState(false);

  // Fetch Data Callback
  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    try {
      const data = await TeknisService.fetchAll(selectedWorkspaceId);
      setUsers(data);
      setStats(TeknisService.getStats(data));
    } catch (err) {
      console.warn("Gagal memuat data teknis:", err);
      const cached = TeknisService.getCache();
      setUsers(cached);
      setStats(TeknisService.getStats(cached));
    } finally {
      setIsLoading(false);
    }
  }, [selectedWorkspaceId]);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const currentUser = AuthService.getCurrentUser();
      const hasFullControl =
        currentUser?.role === "Super Admin" || currentUser?.role === "Divisi Teknis";
      setIsSuperAdminOrTeknis(hasFullControl);

      try {
        const wsList = await WorkspaceService.fetchAll();
        setWorkspaces(wsList);
      } catch (e) {
        console.warn("Gagal memuat workspaces:", e);
      }

      await loadData(false);
      setIsLoading(false);
    };

    init();
  }, [loadData]);

  // Handle Create User Teknis
  const handleCreateTeknis = async (
    data: Omit<TeknisUser, "id" | "rawId" | "createdAt"> & { password?: string }
  ) => {
    setIsSubmittingCreate(true);
    try {
      await TeknisService.createAsync(data);
      toast.success(`User teknis "${data.fullName}" berhasil ditambahkan!`);
      await loadData(false);
      setIsCreateOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan user teknis.";
      toast.error(msg);
      throw err;
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Handle Edit User Teknis
  const handleEditTeknis = async (
    id: string,
    data: Partial<TeknisUser> & { password?: string }
  ) => {
    setIsSubmittingEdit(true);
    try {
      await TeknisService.updateAsync(id, data);
      toast.success(`Data user teknis berhasil diperbarui!`);
      await loadData(false);
      setIsEditOpen(false);
      setSelectedUserToEdit(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui user teknis.";
      toast.error(msg);
      throw err;
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Handle Soft Delete
  const handleConfirmDelete = async () => {
    if (!selectedUserToDelete) return;
    setIsSubmittingDelete(true);
    try {
      await TeknisService.deleteAsync(selectedUserToDelete.id);
      toast.success(`User teknis "${selectedUserToDelete.fullName}" berhasil dinonaktifkan.`);
      await loadData(false);
      setIsDeleteOpen(false);
      setSelectedUserToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menonaktifkan user teknis.";
      toast.error(msg);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Handle Restore
  const handleConfirmRestore = async () => {
    if (!selectedUserToRestore) return;
    setIsSubmittingRestore(true);
    try {
      await TeknisService.restoreAsync(selectedUserToRestore.id);
      toast.success(`User teknis "${selectedUserToRestore.fullName}" berhasil diaktifkan kembali.`);
      await loadData(false);
      setIsRestoreOpen(false);
      setSelectedUserToRestore(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengaktifkan kembali user teknis.";
      toast.error(msg);
    } finally {
      setIsSubmittingRestore(false);
    }
  };

  // Filtered List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Status Filter
      if (statusFilter !== "Semua" && u.status !== statusFilter) {
        return false;
      }

      // 2. Specialization Filter
      if (specializationFilter !== "Semua" && u.specialization !== specializationFilter) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = u.fullName.toLowerCase().includes(q);
        const matchEmail = u.email.toLowerCase().includes(q);
        const matchPhone = (u.phone || "").toLowerCase().includes(q);
        const matchSpec = u.specialization.toLowerCase().includes(q);
        const matchWs = (u.workspaceName || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchSpec && !matchWs) {
          return false;
        }
      }

      return true;
    });
  }, [users, statusFilter, specializationFilter, searchQuery]);

  // Unique Specializations for filter dropdown
  const uniqueSpecializations = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.specialization) set.add(u.specialization);
    });
    return Array.from(set);
  }, [users]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  return (
    <DashboardLayout>
      {/* Header Bar */}
      <Header
        title="Divisi Teknis"
        subtitle="Manajemen akun personil teknis & IT sistem, konfigurasi hak akses, dan monitoring infrastruktur audit."
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Environment Sandbox Banner (Divisi Teknis Terisolasi dari Tenant Umum) */}
        <div className="bg-gradient-to-r from-sky-50 via-slate-50 to-white p-3.5 sm:p-4 rounded-2xl border border-sky-100/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-slate-800 leading-tight">
                  Lingkungan Sandbox Internal Divisi Teknis
                </p>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-extrabold uppercase tracking-wider border border-sky-200">
                  Data Terisolasi
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Semua personil teknis terhubung dalam satu ruang kerja pengujian mandiri tanpa terhubung ke data penyewa umum.
              </p>
            </div>
          </div>
        </div>

        {/* 1. Statistics Cards */}
        <TeknisStats stats={stats} />

        {/* 2. Control Bar (Search, Filters & Add Button) */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama, email, nomor telepon, atau spesialisasi..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53]"
            />
          </div>

          {/* Filter Pills & Add Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-xl border border-slate-200">
              {(["Semua", "Aktif", "Nonaktif"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === st
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Specialization Filter Dropdown */}
            {uniqueSpecializations.length > 0 && (
              <select
                value={specializationFilter}
                onChange={(e) => {
                  setSpecializationFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 cursor-pointer max-w-[180px]"
              >
                <option value="Semua">Semua Spesialisasi</option>
                {uniqueSpecializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            )}

            {/* Add User Teknis Button */}
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#193f53] hover:bg-[#123040] text-white text-xs font-semibold shadow-xs hover:shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Tambah User Teknis</span>
            </button>
          </div>
        </div>

        {/* 3. Main Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Personil Teknis</th>
                  <th className="py-3.5 px-4">Kontak</th>
                  <th className="py-3.5 px-4">Spesialisasi</th>
                  <th className="py-3.5 px-4">Lingkungan Kerja</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Terdaftar</th>
                  <th className="py-3.5 px-4 text-right pr-6">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                        <span>Memuat data personil divisi teknis...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Wrench className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                        <span className="font-semibold text-slate-600">
                          Tidak ada data personil divisi teknis ditemukan
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {searchQuery || statusFilter !== "Semua"
                            ? "Coba ubah kata kunci pencarian atau filter status."
                            : "Klik tombol 'Tambah User Teknis' untuk menambahkan personil teknis baru."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => {
                    const isInactive = user.status === "Nonaktif";

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isInactive ? "bg-slate-50/40 opacity-75" : ""
                        }`}
                      >
                        {/* 1. Nama & Email */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-[#193f53] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              {user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate max-w-[200px]">
                                {user.fullName}
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate max-w-[200px]">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Kontak */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{user.phone && user.phone !== "-" ? user.phone : "Tidak ada"}</span>
                          </div>
                        </td>

                        {/* 3. Spesialisasi Divisi */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold max-w-[220px]">
                            <Cpu className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                            <span className="truncate">{user.specialization}</span>
                          </span>
                        </td>

                        {/* 4. Lingkungan Kerja */}
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
                            <Building2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              Sandbox Internal Teknis
                            </span>
                          </div>
                        </td>

                        {/* 5. Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {user.status === "Aktif" ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* 6. Terdaftar */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-500 text-[11px]">
                          {user.createdAt || "-"}
                        </td>

                        {/* 7. Action Buttons */}
                        <td className="py-3.5 px-4 text-right pr-6 whitespace-nowrap">
                          <ActionButtons
                            align="end"
                            onView={() => setSelectedUserToView(user)}
                            onEdit={
                              isInactive
                                ? undefined
                                : () => {
                                    setSelectedUserToEdit(user);
                                    setIsEditOpen(true);
                                  }
                            }
                            onDelete={
                              isInactive
                                ? undefined
                                : () => {
                                    setSelectedUserToDelete(user);
                                    setIsDeleteOpen(true);
                                  }
                            }
                            onRestore={
                              isInactive
                                ? () => {
                                    setSelectedUserToRestore(user);
                                    setIsRestoreOpen(true);
                                  }
                                : undefined
                            }
                            viewTitle="Lihat Detail User Teknis"
                            editTitle="Edit User Teknis"
                            deleteTitle="Nonaktifkan User Teknis"
                            restoreTitle="Aktifkan Kembali User Teknis"
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer / Pagination */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Menampilkan{" "}
              <strong className="text-slate-800">
                {paginatedUsers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
              </strong>{" "}
              sampai{" "}
              <strong className="text-slate-800">
                {Math.min(currentPage * itemsPerPage, filteredUsers.length)}
              </strong>{" "}
              dari <strong className="text-slate-800">{filteredUsers.length}</strong> user teknis
            </div>

            <div className="flex items-center gap-1 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setCurrentPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === p
                      ? "bg-[#193f53] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTeknisModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateTeknis}
        workspaces={workspaces}
        isSubmitting={isSubmittingCreate}
      />

      <EditTeknisModal
        isOpen={isEditOpen}
        user={selectedUserToEdit}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedUserToEdit(null);
        }}
        onSubmit={handleEditTeknis}
        workspaces={workspaces}
        isSubmitting={isSubmittingEdit}
      />

      <DetailTeknisModal
        user={selectedUserToView}
        onClose={() => setSelectedUserToView(null)}
        onEdit={() => {
          const current = selectedUserToView;
          setSelectedUserToView(null);
          setSelectedUserToEdit(current);
          setIsEditOpen(true);
        }}
      />

      <SoftDeleteTeknisModal
        isOpen={isDeleteOpen}
        user={selectedUserToDelete}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedUserToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        isSubmitting={isSubmittingDelete}
      />

      <RestoreTeknisModal
        isOpen={isRestoreOpen}
        user={selectedUserToRestore}
        onClose={() => {
          setIsRestoreOpen(false);
          setSelectedUserToRestore(null);
        }}
        onConfirm={handleConfirmRestore}
        isSubmitting={isSubmittingRestore}
      />
    </DashboardLayout>
  );
}

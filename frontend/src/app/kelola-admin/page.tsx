"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import AdminStats from "./components/AdminStats";
import AdminTable from "./components/AdminTable";
import CreateAdminModal from "./components/CreateAdminModal";
import EditAdminModal from "./components/EditAdminModal";
import DeleteAdminModal from "./components/DeleteAdminModal";
import { AdminService } from "@/services/admin.service";
import { WorkspaceService } from "@/services/workspace.service";
import { AuthService } from "@/lib/auth";
import { AdminUser, AdminStatsData, AdminRole } from "@/types/admin";
import { Workspace } from "@/types/workspace";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export default function KelolaAdminPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
  const [isDivisiTeknis, setIsDivisiTeknis] = useState<boolean>(false);
  const [manualSuperAdminMeta, setManualSuperAdminMeta] = useState<{ count: number; max: number }>({
    count: 0,
    max: 2,
  });
  const [stats, setStats] = useState<AdminStatsData>({
    totalAdmins: 0,
    activeAdmins: 0,
    inactiveAdmins: 0,
    totalAuditors: 0,
    totalWorkspaces: 0,
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdminToEdit, setSelectedAdminToEdit] =
    useState<AdminUser | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetAdmin, setDeleteTargetAdmin] =
    useState<AdminUser | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  /**
   * Mengambil data admin & workspace langsung dari database PostgreSQL
   */
  const refreshData = async (options?: { silent?: boolean; isManual?: boolean }) => {
    const isSilent = options?.silent ?? false;
    const isManual = options?.isManual ?? false;

    if (isManual) {
      setIsRefreshing(true);
    } else if (!isSilent && admins.length === 0) {
      setIsLoading(true);
    }

    try {
      const [adminList, wsList] = await Promise.all([
        AdminService.fetchAll(),
        WorkspaceService.fetchAll(),
      ]);

      setAdmins(adminList);
      setWorkspaces(wsList);
      setBackendStatus("connected");

      const currentUser = AuthService.getCurrentUser();
      const roleIsTeknis =
        currentUser?.role === "Divisi Teknis" ||
        currentUser?.role === "Teknis" ||
        Boolean(AdminService.lastMeta?.isTeknis);
      setIsDivisiTeknis(roleIsTeknis);

      if (roleIsTeknis) {
        const metaCount = AdminService.lastMeta?.manualSuperAdminCount;
        const fallbackCount = adminList.filter((a) => a.role === "Super Admin").length;
        setManualSuperAdminMeta({
          count: typeof metaCount === "number" ? metaCount : fallbackCount,
          max: AdminService.lastMeta?.maxManualSuperAdmins ?? 2,
        });
      }

      const calculatedStats = AdminService.getStats(adminList);
      setStats({
        ...calculatedStats,
        totalWorkspaces: wsList.length,
      });

      if (isManual) {
        toast.success("Data admin berhasil disegarkan dari database!");
      }
    } catch (err: unknown) {
      setBackendStatus("disconnected");
      if (isManual) {
        const msg = err instanceof Error ? err.message : "Gagal menyambung ke server database";
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 1. Initial Load & Window Focus Auto-Refresh
  useEffect(() => {
    const syncAuthRole = () => {
      const currentUser = AuthService.getCurrentUser();
      setIsDivisiTeknis(
        currentUser?.role === "Divisi Teknis" || currentUser?.role === "Teknis"
      );
    };
    syncAuthRole();
    refreshData();

    const handleFocus = () => {
      syncAuthRole();
      refreshData({ silent: true });
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("auth-changed", syncAuthRole);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("auth-changed", syncAuthRole);
    };
  }, []);

  // 2. Background Auto-Refresh / Reconnect Polling setiap 5 detik
  useEffect(() => {
    const interval = setInterval(() => {
      // Tidak auto-refresh saat modal aktif agar form isian user tidak terganggu
      if (!isCreateModalOpen && !isEditModalOpen && !isDeleteModalOpen) {
        refreshData({ silent: true });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isCreateModalOpen, isEditModalOpen, isDeleteModalOpen]);

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (admin: AdminUser) => {
    setSelectedAdminToEdit(admin);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (admin: AdminUser) => {
    if (admin.role === "Super Admin") {
      toast.error("Akun Super Admin bersifat permanen dan tidak dapat dinonaktifkan.");
      return;
    }
    setDeleteTargetAdmin(admin);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (formData: {
    fullName: string;
    email: string;
    role: "Admin" | "Super Admin" | "Staff";
    workspaceName: string;
    companyName?: string;
    status: "Aktif" | "Nonaktif";
    password?: string;
  }) => {
    setIsSubmitting(true);
    try {
      await AdminService.createAsync({
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role || "Admin",
        workspaceName: formData.workspaceName,
        companyName: formData.companyName,
        status: formData.status || "Aktif",
        password: formData.password || "password123",
      });
      toast.success(
        formData.role === "Super Admin"
          ? `Akun Super Admin "${formData.fullName}" berhasil disimpan ke database!`
          : `Akun admin "${formData.fullName}" berhasil disimpan ke database!`
      );
      setIsCreateModalOpen(false);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan admin";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (formData: {
    fullName: string;
    email: string;
    role: AdminRole;
    workspaceName: string;
    companyName?: string;
    status: "Aktif" | "Nonaktif";
    password?: string;
  }) => {
    if (!selectedAdminToEdit) return;

    setIsSubmitting(true);
    try {
      await AdminService.updateAsync(selectedAdminToEdit.id, {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role || selectedAdminToEdit.role,
        workspaceName: formData.workspaceName,
        companyName: formData.companyName,
        status: formData.status,
        password: formData.password,
      });
      toast.success(`Akun admin "${formData.fullName}" berhasil diperbarui!`);
      setIsEditModalOpen(false);
      setSelectedAdminToEdit(null);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui admin";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetAdmin) return;
    if (deleteTargetAdmin.role === "Super Admin") {
      toast.error("Akun Super Admin bersifat permanen dan tidak dapat dinonaktifkan.");
      setIsDeleteModalOpen(false);
      setDeleteTargetAdmin(null);
      return;
    }
    const isCurrentlyActive = deleteTargetAdmin.status === "Aktif";
    const nextStatus = isCurrentlyActive ? "Nonaktif" : "Aktif";

    setIsSubmitting(true);
    try {
      await AdminService.updateAsync(deleteTargetAdmin.id, { status: nextStatus });

      if (nextStatus === "Nonaktif") {
        toast.success(
          `Akun admin "${deleteTargetAdmin.fullName}" berhasil dinonaktifkan.`
        );
      } else {
        toast.success(
          `Akun admin "${deleteTargetAdmin.fullName}" berhasil diaktifkan kembali.`
        );
      }

      setIsDeleteModalOpen(false);
      setDeleteTargetAdmin(null);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah status admin";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <Header
        title="Kelola Admin"
        subtitle="Kelola akun Admin dan penugasan workspace operasional"
      />

      <AdminStats stats={stats} />

      {isDivisiTeknis && (
        <div className="mb-4 bg-white border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <ShieldCheck className="w-4 h-4 text-[#193f53] shrink-0" />
            <span>
              <strong className="font-semibold text-slate-900">Mode Divisi Teknis:</strong>{" "}
              Anda dapat membuat akun <strong className="font-semibold">Super Admin</strong> manual secara langsung melalui tombol <strong className="font-semibold">Tambah Admin</strong>.
            </span>
          </div>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 ${
              manualSuperAdminMeta.count >= manualSuperAdminMeta.max
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "bg-sky-50 text-sky-700 border border-sky-200"
            }`}
          >
            Kuota Super Admin: {manualSuperAdminMeta.count}/{manualSuperAdminMeta.max}
          </span>
        </div>
      )}

      <AdminTable
        admins={admins}
        isLoading={isLoading}
        onAdd={handleOpenCreateModal}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
      />

      {/* Modal Tambah Admin Baru */}
      <CreateAdminModal
        isOpen={isCreateModalOpen}
        isSubmitting={isSubmitting}
        isDivisiTeknis={isDivisiTeknis}
        manualSuperAdminCount={manualSuperAdminMeta.count}
        maxManualSuperAdmins={manualSuperAdminMeta.max}
        onClose={() => {
          if (!isSubmitting) setIsCreateModalOpen(false);
        }}
        workspaces={workspaces}
        onSubmit={handleCreateSubmit}
      />

      {/* Modal Edit Admin */}
      <EditAdminModal
        isOpen={isEditModalOpen}
        isSubmitting={isSubmitting}
        admin={selectedAdminToEdit}
        workspaces={workspaces}
        onClose={() => {
          if (!isSubmitting) {
            setIsEditModalOpen(false);
            setSelectedAdminToEdit(null);
          }
        }}
        onSubmit={handleEditSubmit}
      />

      {/* Modal Konfirmasi Nonaktifkan / Aktifkan Admin */}
      <DeleteAdminModal
        isOpen={isDeleteModalOpen}
        isSubmitting={isSubmitting}
        admin={deleteTargetAdmin}
        onClose={() => {
          if (!isSubmitting) {
            setIsDeleteModalOpen(false);
            setDeleteTargetAdmin(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />
    </DashboardLayout>
  );
}

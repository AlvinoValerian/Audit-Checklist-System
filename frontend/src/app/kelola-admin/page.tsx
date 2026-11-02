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
import { AdminUser, AdminStatsData, AdminRole } from "@/types/admin";
import { Workspace } from "@/types/workspace";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function KelolaAdminPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");
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
    refreshData();

    const handleFocus = () => {
      refreshData({ silent: true });
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
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
        status: formData.status || "Aktif",
        password: formData.password || "password123",
      });
      toast.success(`Akun admin "${formData.fullName}" berhasil disimpan ke database!`);
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

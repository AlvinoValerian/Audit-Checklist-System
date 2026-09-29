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
import { Plus } from "lucide-react";
import { toast } from "sonner";

export default function KelolaAdminPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
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

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (admin: AdminUser) => {
    setSelectedAdminToEdit(admin);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (admin: AdminUser) => {
    setDeleteTargetAdmin(admin);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = (formData: {
    fullName: string;
    email: string;
    phone?: string;
    role: "Admin" | "Super Admin" | "Staff";
    workspaceName: string;
    status: "Aktif" | "Nonaktif";
    password?: string;
  }) => {
    AdminService.create({
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone || "-",
      role: formData.role || "Admin",
      workspaceName: formData.workspaceName,
      status: formData.status || "Aktif",
    });
    toast.success(`Admin "${formData.fullName}" berhasil ditambahkan!`);
    setIsCreateModalOpen(false);
    refreshData();
  };

  const handleEditSubmit = (formData: {
    fullName: string;
    email: string;
    phone?: string;
    role: AdminRole;
    workspaceName: string;
    status: "Aktif" | "Nonaktif";
    password?: string;
  }) => {
    if (!selectedAdminToEdit) return;

    AdminService.update(selectedAdminToEdit.id, {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone || "-",
      role: formData.role || selectedAdminToEdit.role,
      workspaceName: formData.workspaceName,
      status: formData.status,
    });
    toast.success(`Admin "${formData.fullName}" berhasil diperbarui!`);
    setIsEditModalOpen(false);
    setSelectedAdminToEdit(null);
    refreshData();
  };

  const handleConfirmDelete = () => {
    if (!deleteTargetAdmin) return;
    const isCurrentlyActive = deleteTargetAdmin.status === "Aktif";
    const nextStatus = isCurrentlyActive ? "Nonaktif" : "Aktif";

    AdminService.update(deleteTargetAdmin.id, { status: nextStatus });

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
    refreshData();
  };

  return (
    <DashboardLayout>
      <Header
        title="Kelola Admin"
        subtitle="Kelola akun Admin dan penugasan workspace operasional"
        action={
          <button
            onClick={handleOpenCreateModal}
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
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
      />

      {/* Modal Tambah Admin Baru */}
      <CreateAdminModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        workspaces={workspaces}
        onSubmit={handleCreateSubmit}
      />

      {/* Modal Edit Admin */}
      <EditAdminModal
        isOpen={isEditModalOpen}
        admin={selectedAdminToEdit}
        workspaces={workspaces}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedAdminToEdit(null);
        }}
        onSubmit={handleEditSubmit}
      />

      {/* Modal Konfirmasi Nonaktifkan / Aktifkan Admin */}
      <DeleteAdminModal
        isOpen={isDeleteModalOpen}
        admin={deleteTargetAdmin}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetAdmin(null);
        }}
        onConfirm={handleConfirmDelete}
      />
    </DashboardLayout>
  );
}

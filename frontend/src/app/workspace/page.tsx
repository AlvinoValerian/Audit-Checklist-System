"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import WorkspaceStats from "./components/WorkspaceStats";
import WorkspaceTable from "./components/WorkspaceTable";
import CreateWorkspaceModal from "./components/CreateWorkspaceModal";
import EditWorkspaceModal from "./components/EditWorkspaceModal";
import DeleteWorkspaceModal from "./components/DeleteWorkspaceModal";
import Modal from "@/components/ui/Modal";
import { WorkspaceService } from "@/services/workspace.service";
import { Workspace, WorkspaceStatsData } from "@/types/workspace";
import {
  Pencil,
  Building2,
  Store,
  User,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export default function WorkspacePage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [stats, setStats] = useState<WorkspaceStatsData>({
    totalWorkspaces: 0,
    activeWorkspaces: 0,
    inactiveWorkspaces: 0,
    totalStores: 0,
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkspaceToEdit, setSelectedWorkspaceToEdit] =
    useState<Workspace | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetWorkspace, setDeleteTargetWorkspace] =
    useState<Workspace | null>(null);

  const [selectedDetailWorkspace, setSelectedDetailWorkspace] =
    useState<Workspace | null>(null);

  const refreshData = async () => {
    const cached = WorkspaceService.getAll();
    setWorkspaces(cached);
    setStats(WorkspaceService.getStats(cached));

    const list = await WorkspaceService.fetchAll();
    setWorkspaces(list);
    setStats(WorkspaceService.getStats(list));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (ws: Workspace) => {
    setSelectedWorkspaceToEdit(ws);
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (ws: Workspace) => {
    setDeleteTargetWorkspace(ws);
    setIsDeleteModalOpen(true);
  };

  const handleCreateSubmit = async (formData: {
    name: string;
    companyName: string;
    category: string;
    description: string;
    headquartersAddress: string;
    status: "Aktif" | "Nonaktif";
  }) => {
    await WorkspaceService.createAsync({
      name: formData.name,
      companyName: formData.companyName,
      category: formData.category,
      companyCategory: formData.category,
      companyDescription: formData.description,
      description: formData.description,
      headquartersAddress: formData.headquartersAddress || "-",
      picName: "Hendra Gunawan",
      picPhone: "+62 812-8899-1023",
      storeCount: 0,
      status: formData.status || "Aktif",
    });
    toast.success(`Workspace "${formData.name}" berhasil ditambahkan!`);
    setIsCreateModalOpen(false);
    refreshData();
  };

  const handleEditSubmit = async (formData: Partial<Workspace>) => {
    if (!selectedWorkspaceToEdit) return;
    await WorkspaceService.updateAsync(selectedWorkspaceToEdit.id, formData);
    toast.success(
      `Workspace "${formData.companyName || formData.name}" berhasil diperbarui!`
    );
    setIsEditModalOpen(false);
    setSelectedWorkspaceToEdit(null);
    refreshData();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetWorkspace) return;
    const isDeactivating = deleteTargetWorkspace.status === "Aktif";
    const newStatus = isDeactivating ? "Nonaktif" : "Aktif";

    await WorkspaceService.updateAsync(deleteTargetWorkspace.id, { status: newStatus });
    toast.success(
      isDeactivating
        ? `Workspace "${deleteTargetWorkspace.name}" berhasil dinonaktifkan.`
        : `Workspace "${deleteTargetWorkspace.name}" berhasil diaktifkan kembali.`
    );
    setIsDeleteModalOpen(false);
    setDeleteTargetWorkspace(null);
    refreshData();
  };

  return (
    <DashboardLayout>
      <Header
        title="Workspace"
        subtitle="Kelola data unit kerja dan statistik audit toko"
      />

      <WorkspaceStats stats={stats} />

      <WorkspaceTable
        workspaces={workspaces}
        onAdd={handleOpenCreateModal}
        onDetail={(ws) => setSelectedDetailWorkspace(ws)}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
      />

      {/* 1. Modal Tambah Workspace (Create) */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      {/* 2. Modal Edit Workspace (Edit) */}
      <EditWorkspaceModal
        isOpen={isEditModalOpen}
        workspace={selectedWorkspaceToEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedWorkspaceToEdit(null);
        }}
        onSubmit={handleEditSubmit}
      />

      {/* 2. Modal Delete (Soft Delete) */}
      <DeleteWorkspaceModal
        isOpen={isDeleteModalOpen}
        workspace={deleteTargetWorkspace}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTargetWorkspace(null);
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* 3. Modal Detail Workspace */}
      {selectedDetailWorkspace && (() => {
        const initials =
          selectedDetailWorkspace.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "WS";

        const adminEmail =
          selectedDetailWorkspace.adminEmail ||
          `admin.${selectedDetailWorkspace.name.toLowerCase().replace(/\s+/g, "")}@auditpro.com`;

        const picName = selectedDetailWorkspace.picName || "Hendra Gunawan";
        const picPhone = selectedDetailWorkspace.picPhone || "+62 812-8899-1023";

        const existingStores = selectedDetailWorkspace.stores || [];
        const targetCount = Math.max(
          selectedDetailWorkspace.storeCount || 0,
          existingStores.length
        );
        const storeList: string[] = [...existingStores];

        if (storeList.length < targetCount) {
          const isHub =
            selectedDetailWorkspace.name.toLowerCase().includes("hub") ||
            (existingStores.length > 0 && existingStores[0].startsWith("Hub"));
          const prefix = isHub ? "Hub" : "Toko";
          const code =
            selectedDetailWorkspace.name.replace(/[^A-Za-z0-9]/g, "").slice(-1).toUpperCase() || "A";

          const defaultLocations = [
            "Gudang Cimahi Sentral",
            "Distribusi Pasteur Express",
            "Depo Ujung Berung",
            "Hub Transit Padalarang",
            "Gudang Kopo Sayati",
            "Cabang Buah Batu",
            "Cabang Setiabudi",
            "Cabang Dago",
            "Cabang Cihampelas",
            "Cabang Soekarno Hatta",
          ];

          for (let i = storeList.length + 1; i <= targetCount; i++) {
            const num = String(i).padStart(2, "0");
            const loc = defaultLocations[(i - 1) % defaultLocations.length];
            storeList.push(`${prefix} ${code}-${num}: ${loc}`);
          }
        }

        return (
          <Modal
            isOpen={Boolean(selectedDetailWorkspace)}
            onClose={() => setSelectedDetailWorkspace(null)}
            title="Detail Workspace"
            subtitle="Informasi lengkap dan konfigurasi entitas workspace"
            icon={<Building2 className="w-5 h-5 text-sky-600" />}
            maxWidth="max-w-2xl"
          >
            <div className="space-y-4">
              {/* Workspace Identity Card */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#193f53] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                    {initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-slate-900 text-base leading-tight">
                        {selectedDetailWorkspace.name}
                      </div>
                      {selectedDetailWorkspace.status === "Nonaktif" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedDetailWorkspace.companyName || "PT Sumber Retail Sejahtera"}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
                  <div className="text-slate-400">
                    Dibuat:{" "}
                    <span className="text-slate-700 font-medium">
                      {selectedDetailWorkspace.createdAt}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    Admin:{" "}
                    <span className="text-slate-700 font-medium">
                      {adminEmail}
                    </span>
                  </div>
                </div>
              </div>

              {/* Soft Delete Notice if Inactive */}
              {selectedDetailWorkspace.status === "Nonaktif" && (
                <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Workspace ini berstatus <strong>Nonaktif (Soft Delete)</strong>. Mode hanya detail dan tidak dapat diedit sebelum diaktifkan kembali.
                  </span>
                </div>
              )}

              {/* Total Toko Terdaftar Card */}
              <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      TOTAL TOKO TERDAFTAR
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Jumlah toko dan outlet ritel yang terhubung dalam workspace ini
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">
                    {selectedDetailWorkspace.storeCount}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Outlet Aktif
                  </span>
                </div>
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* Deskripsi Workspace */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      DESKRIPSI WORKSPACE
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed min-h-[75px]">
                      {selectedDetailWorkspace.companyDescription ||
                        selectedDetailWorkspace.description}
                    </div>
                  </div>

                  {/* Kontak Person (PIC) */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      KONTAK PERSON (PIC)
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5 text-xs text-slate-700 font-medium">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>
                        {picName} • {picPhone}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {/* Alamat Kantor Pusat */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      ALAMAT KANTOR PUSAT
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed min-h-[75px]">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span>
                        {selectedDetailWorkspace.headquartersAddress ||
                          "Gedung Wisma Niaga Lt. 8, Jl. TB Simatupang No. 18, Jakarta Selatan 12560"}
                      </span>
                    </div>
                  </div>

                  {/* Toko Terdaftar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        TOKO TERDAFTAR
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        {storeList.length} Toko Terdaftar
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {storeList.length > 0 ? (
                        storeList.map((storeName, i) => (
                          <div
                            key={i}
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium hover:border-slate-300 transition-colors"
                          >
                            {storeName}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 italic py-3 text-center bg-slate-50 border border-slate-100 rounded-lg">
                          Belum ada toko yang terdaftar
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDetailWorkspace(null)}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                {selectedDetailWorkspace.status !== "Nonaktif" && (
                  <button
                    type="button"
                    onClick={() => {
                      const wsToEdit = selectedDetailWorkspace;
                      setSelectedDetailWorkspace(null);
                      handleOpenEditModal(wsToEdit);
                    }}
                    className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit Workspace</span>
                  </button>
                )}
              </div>
            </div>
          </Modal>
        );
      })()}
    </DashboardLayout>
  );
}

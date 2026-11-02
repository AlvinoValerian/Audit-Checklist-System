"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { AuthService } from "@/lib/auth";
import {
  Pencil,
  Building2,
  Store,
  User,
  MapPin,
  AlertCircle,
  Loader2,
  LayoutGrid,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  Info,
  X,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export default function WorkspacePage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State Banner Panduan Masuk Workspace
  const [showGuideBanner, setShowGuideBanner] = useState(true);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem("dismissed_workspace_guide_v1");
      if (dismissed === "true") {
        setShowGuideBanner(false);
      }
    } catch {}
  }, []);

  const handleDismissGuide = () => {
    setShowGuideBanner(false);
    try {
      localStorage.setItem("dismissed_workspace_guide_v1", "true");
    } catch {}
  };

  const handleShowGuide = () => {
    setShowGuideBanner(true);
    try {
      localStorage.removeItem("dismissed_workspace_guide_v1");
    } catch {}
  };

  /**
   * Mengambil data workspace langsung dari database PostgreSQL via backend API
   */
  const refreshData = async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;
    if (!isSilent && workspaces.length === 0) {
      setIsLoading(true);
    }
    try {
      const list = await WorkspaceService.fetchAll();
      setWorkspaces(list);
      setStats(WorkspaceService.getStats(list));
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Gagal memuat data workspace.";
      console.error("Gagal mengambil data workspace:", errorMessage);
      if (!isSilent) toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();

    // Auto-refresh silent polling di background setiap 5 detik
    const interval = setInterval(() => {
      if (!isCreateModalOpen && !isEditModalOpen && !isDeleteModalOpen && !selectedDetailWorkspace) {
        refreshData({ silent: true });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isCreateModalOpen, isEditModalOpen, isDeleteModalOpen, selectedDetailWorkspace]);

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

  const handleEnterWorkspace = (ws: Workspace) => {
    if (ws.status === "Nonaktif") {
      toast.error(`Workspace "${ws.name}" sedang dinonaktifkan. Seluruh sistem untuk workspace ini diberhentikan.`);
      return;
    }
    AuthService.setActiveWorkspace({
      id: ws.id,
      name: ws.name,
      companyName: ws.companyName || ws.name,
    });
    setSelectedDetailWorkspace(null);
    toast.success(`Memasuki workspace "${ws.name}"...`);
    router.push(`/dashboard-monitoring?workspaceId=${ws.id}`);
  };

  const handleCreateSubmit = async (formData: {
    name: string;
    companyName: string;
    category: string;
    description: string;
    headquartersAddress: string;
    picName: string;
    picPhone: string;
    status: "Aktif" | "Nonaktif";
  }) => {
    setIsSubmitting(true);
    try {
      await WorkspaceService.createAsync({
        name: formData.name,
        companyName: formData.companyName,
        category: formData.category,
        companyCategory: formData.category,
        companyDescription: formData.description,
        description: formData.description,
        headquartersAddress: formData.headquartersAddress || "-",
        picName: formData.picName || "-",
        picPhone: formData.picPhone || "-",
        storeCount: 0,
        status: formData.status || "Aktif",
      });
      toast.success(`Workspace "${formData.name}" berhasil disimpan ke database!`);
      setIsCreateModalOpen(false);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan workspace";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (formData: Partial<Workspace>) => {
    if (!selectedWorkspaceToEdit) return;
    setIsSubmitting(true);
    try {
      await WorkspaceService.updateAsync(selectedWorkspaceToEdit.id, formData);
      toast.success(
        `Workspace "${formData.companyName || formData.name || selectedWorkspaceToEdit.name}" berhasil diperbarui!`
      );
      setIsEditModalOpen(false);
      setSelectedWorkspaceToEdit(null);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui workspace";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetWorkspace) return;
    const isDeactivating = deleteTargetWorkspace.status === "Aktif";
    const newStatus = isDeactivating ? "Nonaktif" : "Aktif";

    setIsSubmitting(true);
    try {
      await WorkspaceService.updateAsync(deleteTargetWorkspace.id, { status: newStatus });
      toast.success(
        isDeactivating
          ? `Workspace "${deleteTargetWorkspace.name}" berhasil dinonaktifkan.`
          : `Workspace "${deleteTargetWorkspace.name}" berhasil diaktifkan kembali.`
      );
      setIsDeleteModalOpen(false);
      setDeleteTargetWorkspace(null);
      await refreshData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengubah status workspace";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <Header
        title="Workspace"
        subtitle="Kelola data unit kerja dan statistik audit toko"
      />

      <WorkspaceStats stats={stats} />

      {/* Modern Notice: Panduan Masuk Workspace untuk Super Admin */}
      {showGuideBanner ? (
        <div className="mb-5 sm:mb-6 rounded-2xl border border-sky-200/80 bg-gradient-to-r from-sky-50/90 via-white to-blue-50/40 p-4 sm:p-5 shadow-2xs relative overflow-hidden transition-all duration-300">
          {/* Subtle background decorative glow */}
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-36 h-36 bg-sky-200/40 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-3 sm:gap-4 relative z-10">
            <div className="flex items-start gap-3 sm:gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#193f53] to-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                <Sparkles className="w-4 h-4 text-sky-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200/80">
                    <ShieldCheck className="w-3 h-3 text-sky-600" />
                    Panduan Super Admin
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                    • Navigasi Ruang Kerja
                  </span>
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  Cara Memasuki Ruang Kerja (Workspace) Toko
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Sebagai Super Admin, Anda dapat berpindah dan mengelola data audit gerai toko pada workspace yang dituju dengan 2 cara:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-3">
                  {/* Cara 1 */}
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/95 border border-sky-100 shadow-3xs hover:border-sky-300 transition-colors">
                    <div className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Klik Langsung Judul Workspace</span>
                      <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                        Klik tautan nama workspace pada tabel berikon <ExternalLink className="w-3 h-3 inline text-sky-600 mx-0.5 -translate-y-px" /> untuk langsung berpindah ke Dashboard Monitoring.
                      </p>
                    </div>
                  </div>

                  {/* Cara 2 */}
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/95 border border-sky-100 shadow-3xs hover:border-sky-300 transition-colors">
                    <div className="w-5 h-5 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="text-xs">
                      <span className="font-bold text-slate-800">Melalui Modal Detail Workspace</span>
                      <p className="text-slate-500 text-[11px] mt-0.5 leading-snug">
                        Klik tombol mata (Lihat Detail) pada kolom Action, lalu pilih tombol <strong className="text-sky-700">&quot;Masuk Workspace&quot;</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tombol Tutup Banner */}
            <button
              type="button"
              onClick={handleDismissGuide}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Tutup panduan ini"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end mb-3">
          <button
            type="button"
            onClick={handleShowGuide}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100/80 border border-sky-200/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5 text-sky-600" />
            <span>Panduan Akses Workspace</span>
          </button>
        </div>
      )}

      <WorkspaceTable
        workspaces={workspaces}
        isLoading={isLoading}
        onAdd={handleOpenCreateModal}
        onDetail={(ws) => setSelectedDetailWorkspace(ws)}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
      />

      {/* 1. Modal Tambah Workspace (Create) */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        isSubmitting={isSubmitting}
        onClose={() => {
          if (!isSubmitting) setIsCreateModalOpen(false);
        }}
        onSubmit={handleCreateSubmit}
      />

      {/* 2. Modal Edit Workspace (Edit) */}
      <EditWorkspaceModal
        isOpen={isEditModalOpen}
        isSubmitting={isSubmitting}
        workspace={selectedWorkspaceToEdit}
        onClose={() => {
          if (!isSubmitting) {
            setIsEditModalOpen(false);
            setSelectedWorkspaceToEdit(null);
          }
        }}
        onSubmit={handleEditSubmit}
      />

      {/* 3. Modal Delete (Soft Delete) */}
      <DeleteWorkspaceModal
        isOpen={isDeleteModalOpen}
        isSubmitting={isSubmitting}
        workspace={deleteTargetWorkspace}
        onClose={() => {
          if (!isSubmitting) {
            setIsDeleteModalOpen(false);
            setDeleteTargetWorkspace(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* 4. Modal Detail Workspace (Tanpa data dummy/mock) */}
      {selectedDetailWorkspace && (() => {
        const initials =
          selectedDetailWorkspace.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "WS";

        const adminEmail = selectedDetailWorkspace.adminEmail || "-";
        const picName = selectedDetailWorkspace.picName || "-";
        const picPhone = selectedDetailWorkspace.picPhone || "-";
        const address = selectedDetailWorkspace.headquartersAddress || "-";
        const storeList: string[] = selectedDetailWorkspace.stores || [];

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
                      <button
                        type="button"
                        onClick={() => handleEnterWorkspace(selectedDetailWorkspace)}
                        className="font-bold text-slate-900 text-base leading-tight hover:text-blue-600 hover:underline flex items-center gap-1.5 text-left group/name cursor-pointer transition-colors"
                        title="Masuk ke Dashboard Monitoring"
                      >
                        <span>{selectedDetailWorkspace.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/name:text-blue-600 transition-colors" />
                      </button>
                      {selectedDetailWorkspace.status === "Nonaktif" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          Nonaktif
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedDetailWorkspace.companyName || selectedDetailWorkspace.name}
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
                      {selectedDetailWorkspace.description ||
                        selectedDetailWorkspace.companyDescription ||
                        "-"}
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
                        {picName} {picPhone !== "-" ? `• ${picPhone}` : ""}
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
                      <span>{address}</span>
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
                          Belum ada toko yang terdaftar di workspace ini
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleEnterWorkspace(selectedDetailWorkspace)}
                  className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-sky-600 to-[#193f53] hover:from-sky-700 hover:to-[#143343] rounded-lg transition-all shadow-xs flex items-center gap-2 cursor-pointer"
                  title="Masuk ke Dashboard Monitoring Workspace ini"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-sky-200" />
                  <span>Masuk Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 text-sky-200 ml-0.5" />
                </button>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailWorkspace(null)}
                    className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
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
                      className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit Workspace</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        );
      })()}
    </DashboardLayout>
  );
}

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
import WorkspaceSubscriptionModal from "./components/WorkspaceSubscriptionModal";
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
  CreditCard,
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

  // SparkPay Snap.js Subscription Modal State
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionTargetWorkspace, setSubscriptionTargetWorkspace] =
    useState<Workspace | null>(null);
  const [isPaidUser, setIsPaidUser] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // State Banner Panduan Masuk Workspace
  const [showGuideBanner, setShowGuideBanner] = useState(true);

  // Periksa status pembayaran & picu modal otomatis saat masuk dari registrasi/login (Eksklusif Super Admin)
  useEffect(() => {
    try {
      const currentUser = AuthService.getCurrentUser();
      const isSuperAdmin = !currentUser?.role || currentUser?.role === "Super Admin";
      const isPaid = localStorage.getItem("superadmin_paid") === "true";
      const requireModal = localStorage.getItem("show_payment_modal_on_workspace") === "true";
      const pendingPayment = localStorage.getItem("pending_superadmin_payment") === "true";
      setIsPaidUser(isPaid);

      // Munculkan modal otomatis HANYA untuk Super Admin jika belum bayar
      if (isSuperAdmin && (requireModal || pendingPayment || !isPaid)) {
        setIsSubscriptionModalOpen(true);
      }

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
      if (!subscriptionTargetWorkspace && list.length > 0) {
        setSubscriptionTargetWorkspace(list[0]);
      }
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

  const handleOpenSubscriptionModal = (ws: Workspace) => {
    setSubscriptionTargetWorkspace(ws);
    setIsSubscriptionModalOpen(true);
  };

  /**
   * Saat Super Admin masuk ke Workspace:
   * Menampilkan dialog aktivasi paket SparkPay Snap.js sesuai dokumen .md
   */
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
    toast.success(`Berhasil beralih ke ruang kerja "${ws.name}"`);
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
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/60 transition-colors shrink-0"
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

      {/* 3. Modal Konfirmasi Hapus/Nonaktifkan Workspace (Soft Delete) */}
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

      {/* 4. Modal Detail Workspace */}
      {selectedDetailWorkspace && (() => {
        const picName = selectedDetailWorkspace.picName || "-";
        const picPhone = selectedDetailWorkspace.picPhone || "-";
        const address = selectedDetailWorkspace.headquartersAddress || "-";

        const storeList: string[] = Array.isArray(selectedDetailWorkspace.stores)
          ? selectedDetailWorkspace.stores
              .map((s: { name?: string; store_name?: string } | string) =>
                typeof s === "string" ? s : s.name || s.store_name || ""
              )
              .filter(Boolean)
          : [];

        return (
          <Modal
            isOpen={!!selectedDetailWorkspace}
            onClose={() => setSelectedDetailWorkspace(null)}
            title="Detail Informasi Workspace"
            maxWidth="max-w-2xl"
          >
            <div className="space-y-4">
              {/* Header Profile Workspace */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 via-slate-50 to-white border border-slate-200/90">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#193f53] text-white flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                    <Building2 className="w-5 h-5 text-sky-200" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                      {selectedDetailWorkspace.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-500 font-medium">
                        {selectedDetailWorkspace.companyName ||
                          selectedDetailWorkspace.name}
                      </span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-sky-700 font-semibold">
                        {selectedDetailWorkspace.category ||
                          selectedDetailWorkspace.companyCategory ||
                          "Ritel Modern"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
                  <Store className="w-4 h-4 text-[#193f53]" />
                  <span className="font-bold text-xs text-slate-800">
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
                <div className="flex items-center gap-2">
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
                </div>

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

      {/* 5. Modal Aktivasi & Pembayaran Paket Workspace via SparkPay (Snap.js Sesuai .md) */}
      <WorkspaceSubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        workspace={subscriptionTargetWorkspace}
        onSuccess={() => {
          setIsPaidUser(true);
          refreshData({ silent: true });
        }}
      />
    </DashboardLayout>
  );
}

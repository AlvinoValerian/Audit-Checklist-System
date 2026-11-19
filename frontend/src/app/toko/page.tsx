"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import {
  Store,
  Check,
  XCircle,
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Loader2,
  Building2,
} from "lucide-react";
import { TokoService } from "@/services/toko.service";
import { WorkspaceService } from "@/services/workspace.service";
import { StoreItem, StoreStats } from "@/types/toko";
import { Workspace } from "@/types/workspace";
import { AuthService } from "@/lib/auth";
import { toast } from "sonner";
import ActionButtons from "@/components/ui/ActionButtons";
import CreateStoreModal from "./components/CreateStoreModal";
import EditStoreModal from "./components/EditStoreModal";
import DetailStoreModal from "./components/DetailStoreModal";
import SoftDeleteModal from "./components/SoftDeleteModal";
import RestoreStoreModal from "./components/RestoreStoreModal";
import SmartAuditPagination from "@/components/ui/SmartAuditPagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import EmptyStateTable from "@/components/ui/EmptyStateTable";
import DecryptedImage from "@/components/DecryptedImage";

export default function TokoPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [currentWorkspaceName, setCurrentWorkspaceName] = useState<string>("Workspace");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  const [stats, setStats] = useState<StoreStats>({
    total: 0,
    active: 0,
    inactive: 0,
    activePercentage: 0,
  });

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [storeToEdit, setStoreToEdit] = useState<StoreItem | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStoreToView, setSelectedStoreToView] = useState<StoreItem | null>(null);

  // Soft Delete / Nonaktifkan Modal State
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [storeToDeactivate, setStoreToDeactivate] = useState<StoreItem | null>(null);

  // Restore / Aktifkan Kembali Modal State
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [storeToRestore, setStoreToRestore] = useState<StoreItem | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);

  const isFiltered = Boolean(searchTerm.trim() || filterStatus !== "Semua");
  const handleResetFilters = () => {
    setSearchTerm("");
    setFilterStatus("Semua");
    setCurrentPage(1);
  };

  const refreshData = async (customWsId?: string) => {
    const wsId = customWsId !== undefined ? customWsId : selectedWorkspaceId;
    try {
      const list = await TokoService.fetchAll(wsId);
      setStores(list);
      setStats(TokoService.getStats(list));
    } catch (err) {
      console.error("Gagal merefresh toko:", err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const user = AuthService.getCurrentUser();
      const activeWs = AuthService.getActiveWorkspace();
      const isSA = user?.role === "Super Admin";
      setIsSuperAdmin(isSA);

      let targetWsId = activeWs?.id || user?.workspaceId || "";
      let targetWsName = activeWs?.name || user?.workspaceName || "Workspace";

      if (isSA) {
        try {
          const wsList = await WorkspaceService.fetchAll();
          setWorkspaces(wsList);
          if (wsList.length > 0) {
            const matched = wsList.find((w) => w.id === targetWsId && w.status !== "Nonaktif");
            if (matched) {
              targetWsId = matched.id;
              targetWsName = matched.companyName || matched.name;
            } else {
              const firstActive = wsList.find((w) => w.status !== "Nonaktif") || wsList[0];
              targetWsId = firstActive.id;
              targetWsName = firstActive.companyName || firstActive.name;
              AuthService.setActiveWorkspace({
                id: firstActive.id,
                name: targetWsName,
              });
            }
          }
        } catch (err) {
          console.warn("Gagal memuat daftar workspace:", err);
        }
      }

      setSelectedWorkspaceId(targetWsId);
      setCurrentWorkspaceName(targetWsName);

      try {
        const storeList = await TokoService.fetchAll(targetWsId);
        setStores(storeList);
        setStats(TokoService.getStats(storeList));
      } catch (err) {
        console.error("Gagal memuat toko:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  const handleWorkspaceChange = async (newWsId: string) => {
    const chosen = workspaces.find((w) => w.id === newWsId);
    if (chosen?.status === "Nonaktif") {
      toast.error(`Workspace "${chosen.companyName || chosen.name}" sedang nonaktif dan tidak dapat dipilih.`);
      return;
    }

    setSelectedWorkspaceId(newWsId);
    if (chosen) {
      const name = chosen.companyName || chosen.name;
      setCurrentWorkspaceName(name);
      AuthService.setActiveWorkspace({ id: chosen.id, name });
    }
    setIsLoading(true);
    setCurrentPage(1);
    try {
      const list = await TokoService.fetchAll(newWsId);
      setStores(list);
      setStats(TokoService.getStats(list));
      toast.info(`Menampilkan toko untuk workspace "${chosen?.companyName || chosen?.name}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memuat data toko";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStore = async (newStoreData: Omit<StoreItem, "id">) => {
    try {
      const created = await TokoService.createAsync({
        ...newStoreData,
        workspaceId: selectedWorkspaceId,
        workspace: currentWorkspaceName,
      });
      // Realtime State Update: tampil seketika di tabel
      setStores((prev) => {
        const next = [created, ...prev];
        setStats(TokoService.getStats(next));
        return next;
      });
      toast.success(`Toko "${newStoreData.name}" berhasil disimpan ke database!`);
      setIsCreateModalOpen(false);
      refreshData().catch(console.warn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan toko ke server";
      toast.error(msg);
    }
  };

  const handleUpdateStore = async (updatedData: Partial<StoreItem>) => {
    if (!storeToEdit) return;
    try {
      const updated = await TokoService.updateAsync(storeToEdit.id, updatedData);
      // Realtime State Update: langsung berubah di tabel seketika tanpa delay
      setStores((prev) => {
        const next = prev.map((s) => (s.id === storeToEdit.id ? { ...s, ...updated } : s));
        setStats(TokoService.getStats(next));
        return next;
      });
      toast.success(`Data toko "${updatedData.name || storeToEdit.name}" berhasil diperbarui!`);
      setIsEditModalOpen(false);
      setStoreToEdit(null);
      refreshData().catch(console.warn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui data toko";
      toast.error(msg);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!storeToDeactivate) return;
    setIsSubmittingModal(true);
    try {
      const updated = await TokoService.updateAsync(storeToDeactivate.id, { status: "Nonaktif" });
      setStores((prev) => {
        const next = prev.map((s) => (s.id === storeToDeactivate.id ? { ...s, ...updated } : s));
        setStats(TokoService.getStats(next));
        return next;
      });
      toast.success(`Toko "${storeToDeactivate.name}" berhasil dinonaktifkan.`);
      setIsDeactivateModalOpen(false);
      setStoreToDeactivate(null);
      refreshData().catch(console.warn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menonaktifkan toko";
      toast.error(msg);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!storeToRestore) return;
    setIsSubmittingModal(true);
    try {
      const updated = await TokoService.updateAsync(storeToRestore.id, { status: "Aktif" });
      setStores((prev) => {
        const next = prev.map((s) => (s.id === storeToRestore.id ? { ...s, ...updated } : s));
        setStats(TokoService.getStats(next));
        return next;
      });
      toast.success(`Toko "${storeToRestore.name}" berhasil diaktifkan kembali.`);
      setIsRestoreModalOpen(false);
      setStoreToRestore(null);
      refreshData().catch(console.warn);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal mengaktifkan toko";
      toast.error(msg);
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Filter Logic
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchesSearch =
        store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (store.city && store.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
        store.timezone.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "Semua" ? true : store.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [stores, searchTerm, filterStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredStores.length / itemsPerPage) || 1;
  const paginatedStores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStores.slice(start, start + itemsPerPage);
  }, [filteredStores, currentPage, itemsPerPage]);

  const startIndex = filteredStores.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredStores.length);

  return (
    <DashboardLayout>
      <Header
        title="Data Toko"
        subtitle={`Daftar seluruh toko yang berada di ${currentWorkspaceName}.`}
        action={
          isSuperAdmin && workspaces.length > 1 ? (
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
              <span className="text-xs font-semibold text-slate-600 shrink-0">Workspace:</span>
              <select
                value={selectedWorkspaceId}
                onChange={(e) => handleWorkspaceChange(e.target.value)}
                className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer pr-1"
              >
                {workspaces.map((w) => {
                  const isInactive = w.status === "Nonaktif";
                  return (
                    <option
                      key={w.id}
                      value={w.id}
                      disabled={isInactive}
                      className={isInactive ? "text-slate-400 bg-slate-100 italic" : "text-slate-800"}
                    >
                      {w.companyName || w.name} {isInactive ? "(Nonaktif)" : `(${w.storeCount} Toko)`}
                    </option>
                  );
                })}
              </select>
            </div>
          ) : undefined
        }
      />

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mb-5 sm:mb-6">
        {/* Card 1: TOTAL TOKO */}
        <div className="relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-sky-400/12 via-sky-300/5 to-transparent blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex justify-between items-start relative z-10">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              TOTAL TOKO
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-100 shadow-2xs">
                Semua Cabang
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 relative z-10">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Unit cabang terdaftar di workspace
            </p>
          </div>
        </div>

        {/* Card 2: TOKO AKTIF */}
        <div className="relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-emerald-400/15 via-emerald-300/5 to-transparent blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex justify-between items-start relative z-10">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              TOKO AKTIF
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/70 shadow-2xs">
                <TrendingUp className="w-2.5 h-2.5 stroke-[2.5]" />
                <span>{stats.activePercentage}% aktif</span>
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 relative z-10">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.active}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {stats.active} dari {stats.total} toko beroperasi normal
            </p>
          </div>
        </div>

        {/* Card 3: TOKO NONAKTIF */}
        <div className="relative overflow-hidden bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between group">
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br from-rose-400/12 via-rose-300/5 to-transparent blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
          <div className="flex justify-between items-start relative z-10">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              TOKO NONAKTIF
            </h3>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200/70 shadow-2xs">
                {stats.total > 0 ? 100 - stats.activePercentage : 0}% nonaktif
              </span>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
          </div>
          <div className="mt-3 sm:mt-4 relative z-10">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.inactive}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Operasional ditutup / dihentikan
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Container Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Toolbar: Search, Filter & Add Store */}
        <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama toko atau lokasi..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 bg-white border ${
                  filterStatus !== "Semua"
                    ? "border-sky-500 text-sky-600"
                    : "border-slate-200 text-slate-700"
                } rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{filterStatus === "Semua" ? "Filter" : filterStatus}</span>
              </button>

              {isFilterOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsFilterOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 overflow-hidden">
                    {(["Semua", "Aktif", "Nonaktif"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setFilterStatus(status);
                          setIsFilterOpen(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition-colors ${
                          filterStatus === status
                            ? "bg-sky-50 text-sky-600 font-semibold"
                            : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Tambah Toko Button (Opens Modal) */}
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193f53] hover:bg-[#123040] text-white rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Toko</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">NAMA TOKO</th>
                <th className="py-3 px-4">ALAMAT LENGKAP</th>
                <th className="py-3 px-4">TIMEZONE</th>
                <th className="py-3 px-4 text-center">TEMUAN</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {isLoading ? (
                <TableSkeleton rows={itemsPerPage} cols={6} hasThumbnail={false} />
              ) : paginatedStores.length === 0 ? (
                <EmptyStateTable
                  colSpan={6}
                  icon={<Store className="w-6 h-6 text-slate-400 stroke-[1.8]" />}
                  title={isFiltered ? "Tidak Ada Toko Yang Cocok" : `Tidak Ada Toko di ${currentWorkspaceName}`}
                  description={
                    isFiltered
                      ? "Tidak ada toko yang sesuai dengan kata kunci pencarian atau filter status yang dipilih."
                      : "Belum ada cabang toko yang terdaftar di workspace ini. Tambahkan toko baru sekarang."
                  }
                  isFiltered={isFiltered}
                  onResetFilters={isFiltered ? handleResetFilters : undefined}
                  onAction={() => setIsCreateModalOpen(true)}
                  actionLabel="Tambah Toko Baru"
                />
              ) : (
                paginatedStores.map((store) => {
                  const initialLetter =
                    store.name.replace(/toko\s*/i, "").charAt(0) || store.name.charAt(0);
                  const isInactive = store.status === "Nonaktif";

                  return (
                    <tr
                      key={store.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* NAMA TOKO */}
                      <td className={`relative py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap ${isInactive ? "opacity-40 grayscale" : ""}`}>
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#193f53] rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden shadow-2xs relative">
                            {store.storePicture ? (
                              <DecryptedImage
                                src={store.storePicture}
                                alt={store.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              initialLetter.toUpperCase()
                            )}
                          </div>
                          <div>
                            <span>{store.name}</span>
                            {store.city && (
                              <p className="text-[10px] text-slate-400 font-normal leading-tight">
                                {store.city}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ALAMAT LENGKAP */}
                      <td className={`py-3.5 px-4 text-slate-600 max-w-sm sm:max-w-md text-xs leading-relaxed ${isInactive ? "opacity-40 grayscale" : ""}`}>
                        {store.address}
                      </td>

                      {/* TIMEZONE */}
                      <td className={`py-3.5 px-4 text-slate-600 whitespace-nowrap text-xs ${isInactive ? "opacity-40 grayscale" : ""}`}>
                        {store.timezone}
                      </td>

                      {/* TEMUAN */}
                      <td className={`py-3.5 px-4 text-center whitespace-nowrap ${isInactive ? "opacity-40 grayscale" : ""}`}>
                        {store.findingsCount === 0 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 font-bold text-xs">
                            0
                          </span>
                        ) : store.findingsCount <= 5 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-50 text-orange-600 border border-orange-200 font-bold text-xs">
                            {store.findingsCount}
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-bold text-xs">
                            {store.findingsCount}
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {store.status === "Aktif" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* ACTION BUTTONS */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <ActionButtons
                          alignRestoreWithDelete={false}
                          onView={() => {
                            setSelectedStoreToView(store);
                            setIsDetailModalOpen(true);
                          }}
                          onEdit={
                            isInactive
                              ? undefined
                              : () => {
                                  setStoreToEdit(store);
                                  setIsEditModalOpen(true);
                                }
                          }
                          onDelete={
                            isInactive
                              ? undefined
                              : () => {
                                  setStoreToDeactivate(store);
                                  setIsDeactivateModalOpen(true);
                                }
                          }
                          onRestore={
                            isInactive
                              ? () => {
                                  setStoreToRestore(store);
                                  setIsRestoreModalOpen(true);
                                }
                              : undefined
                          }
                          viewTitle="Lihat Detail Toko"
                          editTitle="Edit Toko"
                          deleteTitle="Nonaktifkan Toko"
                          restoreTitle="Aktifkan Kembali Toko"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <SmartAuditPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredStores.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
          pageSizeOptions={[7, 14, 21, 35]}
          itemName="toko"
        />
      </div>

      {/* Create Store Modal */}
      <CreateStoreModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateStore}
        workspaceName={currentWorkspaceName}
        workspaceId={selectedWorkspaceId}
      />

      {/* Edit Store Modal */}
      <EditStoreModal
        isOpen={isEditModalOpen}
        store={storeToEdit}
        onClose={() => {
          setIsEditModalOpen(false);
          setStoreToEdit(null);
        }}
        onSubmit={handleUpdateStore}
      />

      {/* Detail Modal */}
      <DetailStoreModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedStoreToView(null);
        }}
        store={selectedStoreToView}
        onEdit={() => {
          if (selectedStoreToView) {
            setStoreToEdit(selectedStoreToView);
            setIsDetailModalOpen(false);
            setIsEditModalOpen(true);
          }
        }}
      />

      {/* Soft Delete (Nonaktifkan) Modal */}
      <SoftDeleteModal
        isOpen={isDeactivateModalOpen}
        onClose={() => {
          setIsDeactivateModalOpen(false);
          setStoreToDeactivate(null);
        }}
        onConfirm={handleConfirmDeactivate}
        store={storeToDeactivate}
        isSubmitting={isSubmittingModal}
      />

      {/* Restore (Aktifkan Kembali) Modal */}
      <RestoreStoreModal
        isOpen={isRestoreModalOpen}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setStoreToRestore(null);
        }}
        onConfirm={handleConfirmRestore}
        store={storeToRestore}
        isSubmitting={isSubmittingModal}
      />
    </DashboardLayout>
  );
}

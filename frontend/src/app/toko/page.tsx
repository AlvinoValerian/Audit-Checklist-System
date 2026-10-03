"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import {
  Store,
  Check,
  XCircle,
  Ban,
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { TokoService } from "@/services/toko.service";
import { StoreItem, StoreStatus, StoreStats } from "@/types/toko";
import { toast } from "sonner";
import ActionButtons from "@/components/ui/ActionButtons";
import CreateStoreModal from "./components/CreateStoreModal";
import EditStoreModal from "./components/EditStoreModal";
import DetailStoreModal from "./components/DetailStoreModal";
import SoftDeleteModal from "./components/SoftDeleteModal";
import RestoreStoreModal from "./components/RestoreStoreModal";

export default function TokoPage() {
  const [stores, setStores] = useState<StoreItem[]>([]);
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

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [filterStatus, setFilterStatus] = useState<"Semua" | StoreStatus>("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const refreshData = () => {
    const list = TokoService.getAll();
    setStores(list);
    setStats(TokoService.getStats(list));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCreateStore = (newStoreData: Omit<StoreItem, "id">) => {
    TokoService.create(newStoreData);
    toast.success(`Toko "${newStoreData.name}" berhasil ditambahkan!`);
    setIsCreateModalOpen(false);
    refreshData();
  };

  const handleUpdateStore = (updatedData: Partial<StoreItem>) => {
    if (storeToEdit) {
      TokoService.update(storeToEdit.id, updatedData);
      toast.success(`Data toko "${updatedData.name || storeToEdit.name}" berhasil diperbarui!`);
      setIsEditModalOpen(false);
      setStoreToEdit(null);
      refreshData();
    }
  };

  const handleConfirmDeactivate = () => {
    if (storeToDeactivate) {
      TokoService.update(storeToDeactivate.id, { status: "Nonaktif" });
      toast.success(`Toko "${storeToDeactivate.name}" berhasil dinonaktifkan.`);
      setIsDeactivateModalOpen(false);
      setStoreToDeactivate(null);
      refreshData();
    }
  };

  const handleConfirmRestore = () => {
    if (storeToRestore) {
      TokoService.update(storeToRestore.id, { status: "Aktif" });
      toast.success(`Toko "${storeToRestore.name}" berhasil diaktifkan kembali.`);
      setIsRestoreModalOpen(false);
      setStoreToRestore(null);
      refreshData();
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
  }, [filteredStores, currentPage]);

  const startIndex = filteredStores.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredStores.length);

  return (
    <DashboardLayout>
      <Header
        title="Data Toko"
        subtitle="Daftar seluruh toko yang berada di Workspace A."
      />

      {/* 3 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mb-5 sm:mb-6">
        {/* Card 1: TOTAL TOKO */}
        <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              TOTAL TOKO
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.total}
            </div>
          </div>
        </div>

        {/* Card 2: TOKO AKTIF */}
        <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              TOKO AKTIF
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.active}
            </span>
            <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
              <TrendingUp className="w-3 h-3" />
              <span>{stats.activePercentage}% dari total</span>
            </span>
          </div>
        </div>

        {/* Card 3: TOKO NONAKTIF / MAINTENANCE */}
        <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              TOKO NONAKTIF
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              TOKO NONAKTIF / MAINTENANCE
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.inactive}
            </div>
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
                    {(["Semua", "Aktif", "Nonaktif", "Maintenance"] as const).map((status) => (
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
              <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">NAMA TOKO</th>
                <th className="py-3 px-4">ALAMAT LENGKAP</th>
                <th className="py-3 px-4">TIMEZONE</th>
                <th className="py-3 px-4 text-center">TEMUAN</th>
                <th className="py-3 px-4 text-center">STATUS</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {paginatedStores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Store className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="font-semibold text-slate-600 text-sm">Tidak ada toko ditemukan</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Coba sesuaikan kata kunci pencarian atau filter status.
                    </p>
                  </td>
                </tr>
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
                      <td className={`py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap ${isInactive ? "opacity-40 grayscale" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {initialLetter.toUpperCase()}
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

                      {/* STATUS (kecuali status, tidak diberi opacity-40 grayscale) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {store.status === "Aktif" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Aktif
                          </span>
                        )}
                        {store.status === "Maintenance" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Maintenance
                          </span>
                        )}
                        {store.status === "Nonaktif" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* ACTION */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <ActionButtons
                          onView={
                            isInactive
                              ? undefined
                              : () => {
                                  setSelectedStoreToView(store);
                                  setIsDetailModalOpen(true);
                                }
                          }
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

        {/* Table Footer & Pagination */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Menampilkan <span className="font-semibold text-slate-700">{startIndex}-{endIndex}</span> dari{" "}
            <span className="font-semibold text-slate-700">{filteredStores.length}</span> toko
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    currentPage === pageNum
                      ? "bg-[#193f53] text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-xs font-medium"
              >
                Selanjutnya
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Halaman Selanjutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create Store Modal */}
      <CreateStoreModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateStore}
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
      />
    </DashboardLayout>
  );
}

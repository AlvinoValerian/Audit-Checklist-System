"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import {
  Users,
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
import { StaffService } from "@/services/staff.service";
import { StaffUser, StaffStatus, StaffStats } from "@/types/staff";
import { Workspace } from "@/types/workspace";
import { WorkspaceService } from "@/services/workspace.service";
import { AuthService } from "@/lib/auth";
import { toast } from "sonner";
import ActionButtons from "@/components/ui/ActionButtons";
import CreateStaffModal from "./components/CreateStaffModal";
import DetailStaffModal from "./components/DetailStaffModal";
import SoftDeleteModal from "./components/SoftDeleteModal";
import RestoreStaffModal from "./components/RestoreStaffModal";

export default function StaffPage() {
  const [staffs, setStaffs] = useState<StaffUser[]>([]);
  const [stats, setStats] = useState<StaffStats>({
    total: 0,
    active: 0,
    inactive: 0,
    activePercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal States
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [staffToEdit, setStaffToEdit] = useState<StaffUser | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedStaffToView, setSelectedStaffToView] = useState<StaffUser | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState<StaffUser | null>(null);

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [staffToRestore, setStaffToRestore] = useState<StaffUser | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"Semua" | StaffStatus>("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Workspace Switcher States (Super Admin)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [currentWorkspaceName, setCurrentWorkspaceName] = useState<string>("Workspace");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const refreshData = async (targetWs?: string, showLoading = false) => {
    if (showLoading) setIsLoading(true);
    const targetWsId = targetWs !== undefined ? targetWs : selectedWorkspaceId;
    try {
      const list = await StaffService.fetchAll(targetWsId);
      setStaffs(list);
      setStats(StaffService.getStats(list));
    } catch (err) {
      console.warn("⚠️ Gagal memuat data staf dari backend:", err);
      const fallbackList = StaffService.getAll(targetWsId);
      setStaffs(fallbackList);
      setStats(StaffService.getStats(fallbackList));
    } finally {
      setIsLoading(false);
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
      await refreshData(targetWsId, false);
      setIsLoading(false);
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
      toast.info(`Menampilkan data staf untuk workspace "${name}"`);
    }
    await refreshData(newWsId, true);
  };

  const handleSaveStaff = async (staffData: Omit<StaffUser, "id">) => {
    setIsSubmitting(true);
    try {
      if (staffToEdit) {
        await StaffService.updateAsync(staffToEdit.id, staffData);
        toast.success(`Data staf ${staffData.fullName} berhasil diperbarui.`);
      } else {
        await StaffService.createAsync({
          ...staffData,
          workspaceId: selectedWorkspaceId || staffData.workspaceId,
        });
        toast.success(`Staf baru ${staffData.fullName} berhasil ditambahkan.`);
      }
      await refreshData();
      setIsStaffModalOpen(false);
      setStaffToEdit(null);
    } catch (err: any) {
      toast.error(err?.message || "Gagal menyimpan data staf.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    setIsSubmitting(true);
    try {
      await StaffService.deleteAsync(staffToDelete.id);
      toast.success(`Staf ${staffToDelete.fullName} dinonaktifkan.`);
      setIsDeleteModalOpen(false);
      setStaffToDelete(null);
      await refreshData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal menonaktifkan staf.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!staffToRestore) return;
    setIsSubmitting(true);
    try {
      await StaffService.restoreAsync(staffToRestore.id);
      toast.success(`Staf ${staffToRestore.fullName} berhasil diaktifkan kembali.`);
      setIsRestoreModalOpen(false);
      setStaffToRestore(null);
      await refreshData();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengaktifkan kembali staf.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter Logic
  const filteredStaffs = useMemo(() => {
    return staffs.filter((staff) => {
      const matchesSearch =
        staff.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.storeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        staff.storeLocation.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "Semua" ? true : staff.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [staffs, searchTerm, filterStatus]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredStaffs.length / itemsPerPage) || 1;
  const paginatedStaffs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStaffs.slice(start, start + itemsPerPage);
  }, [filteredStaffs, currentPage]);

  const startIndex = filteredStaffs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredStaffs.length);

  return (
    <DashboardLayout>
      <Header
        title="Staff"
        subtitle={`Kelola data staf auditor, penugasan toko, dan hak akses operasional di ${currentWorkspaceName}.`}
        action={
          isSuperAdmin && workspaces.length > 0 ? (
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

      {/* 3 Metric Summary Cards - Compact libur-toko style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 mb-5 sm:mb-6">
        {/* Card 1: TOTAL STAFF */}
        <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              TOTAL STAFF
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <div className="w-8 h-6 bg-slate-200 rounded animate-pulse" />
              ) : (
                stats.total
              )}
            </div>
          </div>
        </div>

        {/* Card 2: STAFF AKTIF */}
        <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              STAFF AKTIF
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-baseline gap-2">
            {isLoading ? (
              <div className="w-8 h-6 bg-slate-200 rounded animate-pulse" />
            ) : (
              <>
                <span className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  {stats.active}
                </span>
                <span className="inline-flex items-center gap-1 text-emerald-600 text-[11px] font-semibold">
                  <TrendingUp className="w-3 h-3" />
                  <span>{stats.activePercentage}% dari total</span>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Card 3: STAFF NONAKTIF */}
        <div className="bg-[#fefdfa] rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <h3 className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">
              STAFF NONAKTIF
            </h3>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isLoading ? (
                <div className="w-8 h-6 bg-slate-200 rounded animate-pulse" />
              ) : (
                stats.inactive
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container Card - Compact libur-toko style */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Toolbar: Search, Filter & Add Staff */}
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
              placeholder="Cari nama staff atau toko..."
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

            {/* Tambah Staff Button */}
            <button
              type="button"
              onClick={() => {
                setStaffToEdit(null);
                setIsStaffModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193f53] hover:bg-[#143343] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Tambah Staff</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-3">NAMA STAFF</th>
                <th className="px-5 py-3">EMAIL</th>
                <th className="px-5 py-3">PENEMPATAN TOKO</th>
                <th className="px-5 py-3">POSISI</th>
                <th className="px-5 py-3 text-center">STATUS</th>
                <th className="px-5 py-3 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <div className="flex flex-col items-center justify-center gap-2.5">
                      <Loader2 className="w-6 h-6 animate-spin text-[#193f53]" />
                      <span className="text-xs font-semibold text-slate-600">
                        Memuat data staf dari backend PostgreSQL...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedStaffs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                    {searchTerm || filterStatus !== "Semua"
                      ? "Tidak ada data staff yang sesuai dengan filter pencarian."
                      : "Belum ada data staff yang terdaftar pada workspace ini."}
                  </td>
                </tr>
              ) : (
                paginatedStaffs.map((staff) => {
                  const isSoftDeleted = staff.status === "Nonaktif";
                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* 1. NAMA STAFF */}
                      <td className={`px-5 py-3.5 ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                        <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                          {staff.fullName}
                        </span>
                      </td>

                      {/* 2. EMAIL */}
                      <td className={`px-5 py-3.5 text-slate-500 font-normal text-xs ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                        {staff.email}
                      </td>

                      {/* 3. PENEMPATAN TOKO */}
                      <td className={`px-5 py-3.5 ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                        <div className="font-bold text-slate-900 text-xs leading-tight">
                          {staff.storeName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {staff.storeLocation}
                        </div>
                      </td>

                      {/* 4. POSISI */}
                      <td className={`px-5 py-3.5 ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                        <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                          {staff.position}
                        </span>
                      </td>

                      {/* 5. STATUS */}
                      <td className="px-5 py-3.5 text-center">
                        {staff.status === "Aktif" ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* 6. ACTION */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <ActionButtons
                          onView={
                            isSoftDeleted
                              ? undefined
                              : () => {
                                  setSelectedStaffToView(staff);
                                  setIsDetailModalOpen(true);
                                }
                          }
                          onEdit={
                            isSoftDeleted
                              ? undefined
                              : () => {
                                  setStaffToEdit(staff);
                                  setIsStaffModalOpen(true);
                                }
                          }
                          onDelete={
                            isSoftDeleted
                              ? undefined
                              : () => {
                                  setStaffToDelete(staff);
                                  setIsDeleteModalOpen(true);
                                }
                          }
                          onRestore={
                            isSoftDeleted
                              ? () => {
                                  setStaffToRestore(staff);
                                  setIsRestoreModalOpen(true);
                                }
                              : undefined
                          }
                          restoreTitle="Aktifkan Kembali Staff"
                          deleteTitle="Nonaktifkan Staff"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer - Compact libur-toko style */}
        <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Menampilkan{" "}
            <span className="font-bold text-slate-900">
              {startIndex}-{endIndex}
            </span>{" "}
            dari{" "}
            <span className="font-bold text-slate-900">{filteredStaffs.length}</span>{" "}
            staff
          </p>

          <div className="flex gap-1 text-[11px]">
            {/* Prev Button */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-colors cursor-pointer ${
                  currentPage === pageNum
                    ? "bg-[#193f53] text-white shadow-2xs"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {pageNum}
              </button>
            ))}

            {/* Next Button */}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 h-7 flex items-center gap-1 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold ml-1 cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateStaffModal
        key={`${selectedWorkspaceId}-${staffToEdit?.id || "create"}`}
        isOpen={isStaffModalOpen}
        staffToEdit={staffToEdit}
        isSubmitting={isSubmitting}
        workspaceId={selectedWorkspaceId}
        onClose={() => {
          if (!isSubmitting) {
            setIsStaffModalOpen(false);
            setStaffToEdit(null);
          }
        }}
        onSubmit={handleSaveStaff}
      />

      <DetailStaffModal
        isOpen={isDetailModalOpen}
        staff={selectedStaffToView}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedStaffToView(null);
        }}
        onEdit={(staff) => {
          setStaffToEdit(staff);
          setIsStaffModalOpen(true);
        }}
      />

      <SoftDeleteModal
        isOpen={isDeleteModalOpen}
        staff={staffToDelete}
        isSubmitting={isSubmitting}
        onClose={() => {
          if (!isSubmitting) {
            setIsDeleteModalOpen(false);
            setStaffToDelete(null);
          }
        }}
        onConfirm={handleConfirmDelete}
      />

      <RestoreStaffModal
        isOpen={isRestoreModalOpen}
        staff={staffToRestore}
        isSubmitting={isSubmitting}
        onClose={() => {
          if (!isSubmitting) {
            setIsRestoreModalOpen(false);
            setStaffToRestore(null);
          }
        }}
        onConfirm={handleConfirmRestore}
      />
    </DashboardLayout>
  );
}

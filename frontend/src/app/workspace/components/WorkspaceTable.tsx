"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ExternalLink,
  Building2,
} from "lucide-react";
import { Workspace } from "@/types/workspace";
import ActionButtons from "@/components/ui/ActionButtons";
import { AuthService } from "@/lib/auth";
import SmartAuditPagination from "@/components/ui/SmartAuditPagination";
import TableSkeleton from "@/components/ui/TableSkeleton";
import EmptyStateTable from "@/components/ui/EmptyStateTable";

interface WorkspaceTableProps {
  workspaces: Workspace[];
  isLoading?: boolean;
  onAdd?: () => void;
  onDetail?: (workspace: Workspace) => void;
  onEdit?: (workspace: Workspace) => void;
  onDelete?: (workspace: Workspace) => void;
}

export default function WorkspaceTable({
  workspaces,
  isLoading = false,
  onAdd,
  onDetail,
  onEdit,
  onDelete,
}: WorkspaceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(7);

  const isFiltered = Boolean(searchQuery.trim() || statusFilter !== "Semua");
  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("Semua");
    setCurrentPage(1);
  };

  // Filter Logic
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter((ws) => {
      const matchesSearch =
        ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ws.companyName && ws.companyName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ws.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "Semua" ? true : ws.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workspaces, searchQuery, statusFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredWorkspaces.length / itemsPerPage) || 1;
  const paginatedWorkspaces = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredWorkspaces.slice(start, start + itemsPerPage);
  }, [filteredWorkspaces, currentPage, itemsPerPage]);

  const startIndex = filteredWorkspaces.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredWorkspaces.length);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Toolbar: Search, Filter & Add Workspace */}
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari workspace atau perusahaan..."
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
              className={`flex items-center gap-1.5 px-3 py-2 bg-white border ${statusFilter !== "Semua"
                ? "border-sky-500 text-sky-600"
                : "border-slate-200 text-slate-700"
                } rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{statusFilter === "Semua" ? "Filter" : statusFilter}</span>
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
                        setStatusFilter(status);
                        setIsFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition-colors ${statusFilter === status
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

          {/* Tambah Workspace Button */}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193f53] hover:bg-[#143343] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Tambah Workspace</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3 whitespace-nowrap">WORKSPACE</th>
              <th className="px-5 py-3 whitespace-nowrap">TOTAL TOKO</th>
              <th className="px-5 py-3 text-center whitespace-nowrap">DESKRIPSI OPERASIONAL</th>
              <th className="px-5 py-3 text-center whitespace-nowrap">STATUS</th>
              <th className="px-5 py-3 whitespace-nowrap">TANGGAL DIBUAT</th>
              <th className="px-5 py-3 text-right whitespace-nowrap">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isLoading ? (
              <TableSkeleton rows={itemsPerPage} cols={6} hasThumbnail={true} />
            ) : paginatedWorkspaces.length === 0 ? (
              <EmptyStateTable
                colSpan={6}
                icon={<Building2 className="w-6 h-6 text-slate-400 stroke-[1.8]" />}
                title={isFiltered ? "Tidak Ada Workspace Yang Cocok" : "Belum Ada Workspace Terdaftar"}
                description={
                  isFiltered
                    ? "Tidak ada data workspace yang sesuai dengan pencarian atau filter status yang dipilih."
                    : "Belum ada workspace perusahaan yang dibuat. Buat workspace baru sekarang."
                }
                isFiltered={isFiltered}
                onResetFilters={isFiltered ? handleResetFilters : undefined}
                onAction={onAdd}
                actionLabel="Buat Workspace Baru"
              />
            ) : (
              paginatedWorkspaces.map((ws) => {
                const isSoftDeleted = ws.status === "Nonaktif";
                return (
                  <tr
                    key={ws.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* 1. WORKSPACE */}
                    <td className={`relative px-5 py-3.5 ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#193f53] rounded-r opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isSoftDeleted ? (
                              <span
                                className="font-bold text-slate-500 text-xs sm:text-[13px] inline-flex items-center gap-1.5 cursor-not-allowed select-none"
                                title="Workspace ini dinonaktifkan - Sistem operasional diberhentikan"
                              >
                                <span className="line-through text-slate-400">{ws.name}</span>
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-200/90 border border-slate-300 px-1.5 py-0.5 rounded">
                                  Nonaktif
                                </span>
                              </span>
                            ) : (
                              <Link
                                href={`/dashboard-monitoring?workspaceId=${ws.id}`}
                                onClick={() => {
                                  AuthService.setActiveWorkspace({
                                    id: ws.id,
                                    name: ws.name,
                                    companyName: ws.companyName || ws.name,
                                  });
                                }}
                                className="font-bold text-slate-900 text-xs sm:text-[13px] hover:text-sky-600 transition-colors inline-flex items-center gap-1.5 group/link cursor-pointer"
                                title={`Klik untuk masuk ke dashboard monitoring ${ws.name}`}
                              >
                                <span className="group-hover/link:underline">{ws.name}</span>
                                <ExternalLink className="w-3.5 h-3.5 text-sky-500 opacity-75 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all shrink-0" />
                              </Link>
                            )}
                          </div>
                          {ws.companyName && (
                            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                              {ws.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. TOTAL TOKO */}
                    <td className={`px-5 py-3.5 ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                        {ws.storeCount} Toko
                      </span>
                    </td>

                    {/* 3. DESKRIPSI OPERASIONAL */}
                    <td className={`px-5 py-3.5 max-w-sm ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                      <p
                        className="text-slate-500 font-normal text-xs line-clamp-2 leading-relaxed"
                        title={ws.description}
                      >
                        {ws.description || "-"}
                      </p>
                    </td>

                    {/* 4. STATUS */}
                    <td className="px-5 py-3.5 text-center">
                      {ws.status === "Aktif" ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* 5. TANGGAL DIBUAT */}
                    <td className={`px-5 py-3.5 text-slate-500 font-normal text-xs whitespace-nowrap ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                      {ws.createdAt}
                    </td>

                    {/* 6. ACTION */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <ActionButtons
                        alignRestoreWithDelete={false}
                        onView={() => onDetail?.(ws)}
                        onEdit={isSoftDeleted ? undefined : () => onEdit?.(ws)}
                        onDelete={isSoftDeleted ? undefined : () => onDelete?.(ws)}
                        onRestore={isSoftDeleted ? () => onDelete?.(ws) : undefined}
                        viewTitle="Lihat Detail & Masuk Workspace"
                        editTitle="Edit Workspace"
                        deleteTitle="Nonaktifkan Workspace"
                        restoreTitle="Aktifkan Kembali Workspace"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <SmartAuditPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredWorkspaces.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={setItemsPerPage}
        pageSizeOptions={[7, 14, 21, 35]}
        itemName="workspace"
      />
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Workspace } from "@/types/workspace";
import ActionButtons from "@/components/ui/ActionButtons";

interface WorkspaceTableProps {
  workspaces: Workspace[];
  onAdd?: () => void;
  onDetail?: (workspace: Workspace) => void;
  onEdit?: (workspace: Workspace) => void;
  onDelete?: (workspace: Workspace) => void;
}

export default function WorkspaceTable({
  workspaces,
  onAdd,
  onDetail,
  onEdit,
  onDelete,
}: WorkspaceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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
  }, [filteredWorkspaces, currentPage]);

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
            {paginatedWorkspaces.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                  Tidak ada data workspace yang sesuai.
                </td>
              </tr>
            ) : (
              paginatedWorkspaces.map((ws) => {
                const isSoftDeleted = ws.status === "Nonaktif";
                return (
                  <tr
                    key={ws.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* 1. WORKSPACE */}
                    <td className={`px-5 py-3.5 ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                      <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                        {ws.name}
                      </span>
                      {ws.companyName && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {ws.companyName}
                        </div>
                      )}
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
                        onView={() => onDetail?.(ws)}
                        onEdit={isSoftDeleted ? undefined : () => onEdit?.(ws)}
                        onDelete={isSoftDeleted ? undefined : () => onDelete?.(ws)}
                        onRestore={isSoftDeleted ? () => onDelete?.(ws) : undefined}
                        viewTitle="Lihat Detail Workspace"
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
      <div className="p-3.5 sm:p-4 border-t border-slate-100 flex flex-wrap gap-4 items-center justify-between">
        <p className="text-[11px] text-slate-500">
          Menampilkan{" "}
          <span className="font-bold text-slate-900">
            {startIndex}-{endIndex}
          </span>{" "}
          dari{" "}
          <span className="font-bold text-slate-900">{filteredWorkspaces.length}</span>{" "}
          workspace
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
              className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-bold transition-colors cursor-pointer ${currentPage === pageNum
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
  );
}

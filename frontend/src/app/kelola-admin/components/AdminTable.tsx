"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AdminUser } from "@/types/admin";
import ActionButtons from "@/components/ui/ActionButtons";

interface AdminTableProps {
  admins: AdminUser[];
  onAdd?: () => void;
  onEdit?: (admin: AdminUser) => void;
  onDelete?: (admin: AdminUser) => void;
  onToggleStatus?: (admin: AdminUser) => void;
}

export default function AdminTable({
  admins,
  onAdd,
  onEdit,
  onDelete,
  onToggleStatus,
}: AdminTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("Semua");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isWorkspaceFilterOpen, setIsWorkspaceFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const workspaceOptions = useMemo(() => {
    const set = new Set<string>();
    admins.forEach((a) => {
      if (a.workspaceName) set.add(a.workspaceName);
    });
    return Array.from(set);
  }, [admins]);

  // Filter Logic
  const filteredAdmins = useMemo(() => {
    return admins.filter((adm) => {
      const matchesSearch =
        adm.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        adm.workspaceName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesWorkspace =
        workspaceFilter === "Semua" ? true : adm.workspaceName === workspaceFilter;

      const matchesStatus =
        statusFilter === "Semua" ? true : adm.status === statusFilter;

      return matchesSearch && matchesWorkspace && matchesStatus;
    });
  }, [admins, searchQuery, workspaceFilter, statusFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage) || 1;
  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAdmins.slice(start, start + itemsPerPage);
  }, [filteredAdmins, currentPage]);

  const startIndex = filteredAdmins.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = Math.min(currentPage * itemsPerPage, filteredAdmins.length);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Toolbar: Search, Filters & Add Admin */}
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
            placeholder="Cari nama admin atau workspace..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Workspace Filter Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsWorkspaceFilterOpen(!isWorkspaceFilterOpen)}
              className={`flex items-center gap-1.5 px-3 py-2 bg-white border ${workspaceFilter !== "Semua"
                ? "border-sky-500 text-sky-600"
                : "border-slate-200 text-slate-700"
                } rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span className="max-w-[120px] truncate">{workspaceFilter === "Semua" ? "Workspace" : workspaceFilter}</span>
            </button>

            {isWorkspaceFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsWorkspaceFilterOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1.5 z-20 overflow-hidden max-h-60 overflow-y-auto">
                  {["Semua", ...workspaceOptions].map((ws) => (
                    <button
                      key={ws}
                      type="button"
                      onClick={() => {
                        setWorkspaceFilter(ws);
                        setIsWorkspaceFilterOpen(false);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left px-3.5 py-1.5 text-xs font-medium transition-colors ${workspaceFilter === ws
                        ? "bg-sky-50 text-sky-600 font-semibold"
                        : "text-slate-600 hover:bg-slate-50"
                        }`}
                    >
                      {ws === "Semua" ? "Semua Workspace" : ws}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Status Filter Dropdown */}
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
              <span>{statusFilter === "Semua" ? "Status" : statusFilter}</span>
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

          {/* Tambah Admin Button */}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#193f53] hover:bg-[#143343] text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Tambah Admin</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3 whitespace-nowrap">NAMA ADMIN</th>
              <th className="px-5 py-3 whitespace-nowrap">WORKSPACE</th>
              <th className="px-5 py-3 whitespace-nowrap ">EMAIL</th>
              <th className="px-5 py-3 whitespace-nowrap">ROLE</th>
              <th className="px-5 py-3 text-center whitespace-nowrap">STATUS</th>
              <th className="px-5 py-3 text-right whitespace-nowrap">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {paginatedAdmins.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 text-xs">
                  Tidak ada data admin yang sesuai.
                </td>
              </tr>
            ) : (
              paginatedAdmins.map((adm) => {
                const isSoftDeleted = adm.status === "Nonaktif";
                return (
                  <tr
                    key={adm.id}
                    className="hover:bg-slate-50/60 transition-colors group"
                  >
                    {/* 1. NAMA ADMIN */}
                    <td className={`px-5 py-3.5 ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                      <span className="font-bold text-slate-900 text-xs sm:text-[13px]">
                        {adm.fullName}
                      </span>
                      {adm.phone && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {adm.phone}
                        </div>
                      )}
                    </td>

                    {/* 2. WORKSPACE */}
                    <td className={`px-5 py-3.5 ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                      <div className="font-bold text-slate-900 text-xs leading-tight">
                        {adm.workspaceName}
                      </div>
                    </td>

                    {/* 3. EMAIL */}
                    <td className={`px-5 py-3.5 text-slate-500 font-normal text-xs ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                      {adm.email}
                    </td>

                    {/* 4. ROLE */}
                    <td className={`px-5 py-3.5 ${isSoftDeleted ? "opacity-40 grayscale" : ""}`}>
                      <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                        {adm.role}
                      </span>
                    </td>

                    {/* 5. STATUS */}
                    <td className="px-5 py-3.5 text-center">
                      {adm.status === "Aktif" ? (
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
                        onEdit={isSoftDeleted ? undefined : () => onEdit?.(adm)}
                        onDelete={isSoftDeleted ? undefined : () => (onToggleStatus || onDelete)?.(adm)}
                        onRestore={isSoftDeleted ? () => (onToggleStatus || onDelete)?.(adm) : undefined}
                        editTitle="Edit Admin"
                        deleteTitle="Nonaktifkan Admin"
                        restoreTitle="Aktifkan Kembali Admin"
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
          <span className="font-bold text-slate-900">{filteredAdmins.length}</span>{" "}
          admin
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

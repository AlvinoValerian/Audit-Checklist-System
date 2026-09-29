"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, Pencil, Trash2, RotateCcw } from "lucide-react";
import { AdminUser } from "@/types/admin";

interface AdminTableProps {
  admins: AdminUser[];
  onEdit?: (admin: AdminUser) => void;
  onDelete?: (admin: AdminUser) => void;
  onToggleStatus?: (admin: AdminUser) => void;
}

export default function AdminTable({
  admins,
  onEdit,
  onDelete,
  onToggleStatus,
}: AdminTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("Semua");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");

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

  // Pagination
  const itemsPerPage = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredAdmins.length / itemsPerPage) || 1;
  const paginatedAdmins = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAdmins.slice(start, start + itemsPerPage);
  }, [filteredAdmins, currentPage]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Search & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari admin..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Workspace Filter */}
          <div className="relative flex-1 sm:flex-initial sm:w-48">
            <select
              value={workspaceFilter}
              onChange={(e) => {
                setWorkspaceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg px-3.5 py-2 pr-8 outline-none focus:border-[#193f53] cursor-pointer"
            >
              <option value="Semua">Semua Workspace</option>
              {workspaceOptions.map((ws) => (
                <option key={ws} value={ws}>
                  {ws}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 sm:flex-initial sm:w-40">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium rounded-lg px-3.5 py-2 pr-8 outline-none focus:border-[#193f53] cursor-pointer"
            >
              <option value="Semua">Semua Status</option>
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3.5 px-6">NAMA ADMIN</th>
              <th className="py-3.5 px-6">WORKSPACE</th>
              <th className="py-3.5 px-6">EMAIL</th>
              <th className="py-3.5 px-6 text-center">STATUS</th>
              <th className="py-3.5 px-6 text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {paginatedAdmins.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  Tidak ada data admin ditemukan.
                </td>
              </tr>
            ) : (
              paginatedAdmins.map((adm) => (
                <tr
                  key={adm.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* 1. NAMA ADMIN */}
                  <td className="py-4 px-6">
                    <span className="font-bold text-slate-900 text-sm">
                      {adm.fullName}
                    </span>
                  </td>

                  {/* 2. WORKSPACE */}
                  <td className="py-4 px-6 text-slate-600 text-sm">
                    {adm.workspaceName}
                  </td>

                  {/* 3. EMAIL */}
                  <td className="py-4 px-6 text-slate-600 text-sm">
                    {adm.email}
                  </td>

                  {/* 4. STATUS */}
                  <td className="py-4 px-6 text-center">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        adm.status === "Aktif"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50"
                          : "bg-rose-50 text-rose-600 border border-rose-200/50"
                      }`}
                    >
                      {adm.status}
                    </span>
                  </td>

                  {/* 5. ACTION */}
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => onEdit?.(adm)}
                        title="Edit Admin"
                        className="text-sky-500 hover:text-sky-600 p-1 hover:bg-sky-50 rounded transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {adm.status === "Aktif" ? (
                        <button
                          onClick={() => (onToggleStatus || onDelete)?.(adm)}
                          title="Nonaktifkan Admin"
                          className="text-rose-500 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => (onToggleStatus || onDelete)?.(adm)}
                          title="Aktifkan Kembali Admin"
                          className="text-emerald-600 hover:text-emerald-700 p-1 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Menampilkan{" "}
          <span className="font-semibold text-slate-700">
            {filteredAdmins.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
          </span>{" "}
          -{" "}
          <span className="font-semibold text-slate-700">
            {Math.min(currentPage * itemsPerPage, filteredAdmins.length)}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-slate-700">
            {filteredAdmins.length}
          </span>{" "}
          admin
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Sebelumnya
          </button>
          <span className="px-2 font-medium text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
}

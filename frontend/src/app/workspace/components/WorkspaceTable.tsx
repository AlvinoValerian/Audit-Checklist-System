"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Workspace } from "@/types/workspace";

interface WorkspaceTableProps {
  workspaces: Workspace[];
  onDetail?: (workspace: Workspace) => void;
  onEdit?: (workspace: Workspace) => void;
  onDelete?: (workspace: Workspace) => void;
}

export default function WorkspaceTable({
  workspaces,
  onDetail,
  onEdit,
  onDelete,
}: WorkspaceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Cari nama, perusahaan, atau deskripsi..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <div className="relative w-full sm:w-44">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as "Semua" | "Aktif" | "Nonaktif");
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
            <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50">
              <th className="py-3.5 px-6 text-center">WORKSPACE</th>
              <th className="py-3.5 px-4 text-center">TOTAL TOKO</th>
              <th className="py-3.5 px-5 text-center">DESKRIPSI OPERASIONAL</th>
              <th className="py-3.5 px-4 text-center">STATUS</th>
              <th className="py-3.5 px-5 text-center">TANGGAL DIBUAT</th>
              <th className="py-3.5 px-6 text-center">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {paginatedWorkspaces.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  Tidak ada data workspace ditemukan.
                </td>
              </tr>
            ) : (
              paginatedWorkspaces.map((ws) => (
                <tr
                  key={ws.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  {/* 1. Workspace Identity (Di tengah) */}
                  <td className="py-4 px-6 text-center">
                    <div className="min-w-0 mx-auto text-center">
                      <div className="font-semibold text-slate-900 text-sm truncate">
                        {ws.name}
                      </div>
                      {ws.companyName && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {ws.companyName}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* 2. Total Toko (Angka polos di tengah) */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <span className="font-semibold text-slate-900 text-sm">
                      {ws.storeCount}
                    </span>
                  </td>

                  {/* 3. Deskripsi Operasional (Di tengah) */}
                  <td className="py-4 px-5 text-center max-w-sm">
                    <p
                      className="text-xs text-slate-600 line-clamp-2 leading-relaxed mx-auto text-center"
                      title={ws.description}
                    >
                      {ws.description || "-"}
                    </p>
                  </td>

                  {/* 4. Status (Di tengah) */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        ws.status === "Aktif"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50"
                          : "bg-rose-50 text-rose-600 border border-rose-200/50"
                      }`}
                    >
                      {ws.status}
                    </span>
                  </td>

                  {/* 5. Dibuat (Di tengah) */}
                  <td className="py-4 px-5 text-slate-600 text-xs text-center whitespace-nowrap">
                    {ws.createdAt}
                  </td>

                  {/* 6. Aksi (Di tengah) */}
                  <td className="py-4 px-6 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {/* Detail */}
                      <button
                        onClick={() => onDetail?.(ws)}
                        title="Lihat Detail Workspace"
                        className="text-slate-400 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => onEdit?.(ws)}
                        title="Edit Workspace"
                        className="text-sky-500 hover:text-sky-600 p-1.5 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete / Soft Delete / Toggle Status */}
                      {ws.status === "Aktif" ? (
                        <button
                          onClick={() => onDelete?.(ws)}
                          title="Nonaktifkan Workspace (Soft Delete)"
                          className="text-rose-500 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onDelete?.(ws)}
                          title="Aktifkan Kembali Workspace"
                          className="text-emerald-600 hover:text-emerald-700 p-1.5 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
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
      <div className="p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div>
          Menampilkan{" "}
          <span className="font-semibold text-slate-700">
            {filteredWorkspaces.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
          </span>{" "}
          -{" "}
          <span className="font-semibold text-slate-700">
            {Math.min(currentPage * itemsPerPage, filteredWorkspaces.length)}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-slate-700">
            {filteredWorkspaces.length}
          </span>{" "}
          workspace
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Sebelumnya
          </button>
          <span className="px-2 font-medium text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
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
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari workspace..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Status Dropdown Filter */}
        <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto">
          <div className="relative w-full sm:w-44">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
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
              <th className="py-3.5 px-5">NAMA</th>
              <th className="py-3.5 px-4 text-center">JUMLAH TOKO</th>
              <th className="py-3.5 px-4">DESKRIPSI</th>
              <th className="py-3.5 px-4">STATUS</th>
              <th className="py-3.5 px-4">DIBUAT</th>
              <th className="py-3.5 px-5 text-center">AKSI</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {filteredWorkspaces.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Tidak ada data workspace ditemukan.
                </td>
              </tr>
            ) : (
              filteredWorkspaces.map((ws) => (
                <tr
                  key={ws.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  {/* Nama */}
                  <td className="py-4 px-5">
                    <div className="font-semibold text-slate-900 text-sm">
                      {ws.name}
                    </div>
                  </td>

                  {/* Jumlah Toko */}
                  <td className="py-4 px-4 text-center">
                    <span className="font-semibold text-slate-900 text-sm">
                      {ws.storeCount}
                    </span>
                  </td>

                  {/* Deskripsi */}
                  <td className="py-4 px-4 max-w-xs text-slate-500 truncate" title={ws.description}>
                    {ws.description}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {ws.status === "Aktif" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Nonaktif
                      </span>
                    )}
                  </td>

                  {/* Dibuat */}
                  <td className="py-4 px-4 text-slate-500 text-xs whitespace-nowrap">
                    {ws.createdAt}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {/* View Detail Modal Button */}
                      <button
                        onClick={() => onDetail?.(ws)}
                        title="Lihat Detail Workspace"
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => onEdit?.(ws)}
                        title="Edit Workspace"
                        className="p-1.5 text-slate-400 hover:text-[#193f53] rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete / Soft Delete */}
                      <button
                        onClick={() => onDelete?.(ws)}
                        title="Nonaktifkan Workspace (Soft Delete)"
                        className="p-1.5 text-rose-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
            1 - {filteredWorkspaces.length}
          </span>{" "}
          dari{" "}
          <span className="font-semibold text-slate-700">
            {workspaces.length}
          </span>{" "}
          data
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span>Tampilkan:</span>
            <select className="border border-slate-200 rounded-md px-2 py-1 text-slate-700 text-xs bg-white outline-none cursor-pointer">
              <option value="10">10 / hal</option>
              <option value="25">25 / hal</option>
              <option value="50">50 / hal</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled
              className="px-2.5 py-1 text-slate-300 font-medium cursor-not-allowed"
            >
              &lt; Sebelumnya
            </button>
            <button className="w-7 h-7 flex items-center justify-center rounded-md bg-[#193f53] text-white font-bold text-xs">
              1
            </button>
            <button
              disabled
              className="px-2.5 py-1 text-slate-300 font-medium cursor-not-allowed"
            >
              Selanjutnya &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

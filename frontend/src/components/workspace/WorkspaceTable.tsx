"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Building2,
  Store,
  User,
  MapPin,
} from "lucide-react";
import { Workspace } from "@/types/workspace";
import { toast } from "sonner";

interface WorkspaceTableProps {
  workspaces: Workspace[];
  onUpdate: (id: string, data: Partial<Workspace>) => void;
  onDelete: (id: string, name: string) => void;
}

export default function WorkspaceTable({
  workspaces,
  onUpdate,
  onDelete,
}: WorkspaceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Semua" | "Aktif" | "Nonaktif">("Semua");

  // Detail Modal State
  const [selectedDetailWorkspace, setSelectedDetailWorkspace] = useState<Workspace | null>(null);

  // Soft Delete Modal State
  const [softDeleteWorkspace, setSoftDeleteWorkspace] = useState<Workspace | null>(null);

  const handleConfirmSoftDelete = () => {
    if (!softDeleteWorkspace) return;
    onUpdate(softDeleteWorkspace.id, { status: "Nonaktif" });
    toast.success(
      `Workspace "${softDeleteWorkspace.name}" berhasil dinonaktifkan.`
    );
    setSoftDeleteWorkspace(null);
  };

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    companyName: "",
    picName: "",
    picPhone: "",
    description: "",
    headquartersAddress: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

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

  const handleEditClick = (ws: Workspace) => {
    setSelectedWorkspace(ws);
    setEditFormData({
      name: ws.name,
      companyName: ws.companyName || "",
      picName: ws.picName || "Hendra Gunawan",
      picPhone: ws.picPhone || "+62 812-8899-1023",
      description: ws.description || ws.companyDescription || "",
      headquartersAddress:
        ws.headquartersAddress ||
        "Gedung Wisma Niaga Lt. 8, Jl. TB Simatupang No. 18, Jakarta Selatan 12560",
      status: ws.status,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkspace) return;

    onUpdate(selectedWorkspace.id, {
      name: editFormData.name,
      companyName: editFormData.companyName,
      picName: editFormData.picName,
      picPhone: editFormData.picPhone,
      description: editFormData.description,
      companyDescription: editFormData.description,
      headquartersAddress: editFormData.headquartersAddress,
      status: editFormData.status,
    });

    toast.success(`Workspace "${editFormData.name}" berhasil diperbarui!`);
    setIsEditModalOpen(false);
  };

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
              <th className="py-3.5 px-5">DESKRIPSI</th>
              <th className="py-3.5 px-4 text-center">STATUS</th>
              <th className="py-3.5 px-4">DIBUAT</th>
              <th className="py-3.5 px-5 text-center">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
            {filteredWorkspaces.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400">
                  Tidak ada workspace yang ditemukan.
                </td>
              </tr>
            ) : (
              filteredWorkspaces.map((ws) => (
                <tr
                  key={ws.id}
                  className="hover:bg-slate-50/60 transition-colors"
                >
                  {/* Nama with detail modal trigger */}
                  <td className="py-4 px-5 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedDetailWorkspace(ws)}
                      className="font-bold text-slate-900 hover:text-[#193f53] hover:underline transition-colors text-left cursor-pointer"
                    >
                      {ws.name}
                    </button>
                  </td>

                  {/* Jumlah Toko */}
                  <td className="py-4 px-4 font-semibold text-slate-700 text-center whitespace-nowrap">
                    {ws.storeCount}
                  </td>

                  {/* Deskripsi */}
                  <td className="py-4 px-5 text-slate-600 text-xs sm:text-[13px] leading-relaxed max-w-md">
                    {ws.description}
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    {ws.status === "Aktif" ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Aktif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
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
                        onClick={() => setSelectedDetailWorkspace(ws)}
                        title="Lihat Detail Workspace"
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => handleEditClick(ws)}
                        title="Edit Workspace"
                        className="p-1.5 text-slate-400 hover:text-[#193f53] rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      {/* Delete / Soft Delete */}
                      <button
                        onClick={() => setSoftDeleteWorkspace(ws)}
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

      {/* Edit Workspace Modal */}
      {isEditModalOpen && selectedWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-6 max-h-[94vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                  <Pencil className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Edit Workspace
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    Perbarui informasi dan konfigurasi entitas workspace
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Row 1: Nama Workspace * & Nama Perusahaan * */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Workspace <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Workspace A"
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Perusahaan <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="PT Sumber Retail Sejahtera"
                    value={editFormData.companyName}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        companyName: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Row 2: Kontak Person (PIC) & Nomor Telepon */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kontak Person (PIC)
                  </label>
                  <input
                    type="text"
                    placeholder="Hendra Gunawan"
                    value={editFormData.picName}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, picName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nomor Telepon
                  </label>
                  <input
                    type="text"
                    placeholder="+62 812-8899-1023"
                    value={editFormData.picPhone}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        picPhone: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Row 3: Deskripsi Workspace * */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deskripsi Workspace <span className="text-rose-500 font-bold">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Klaster gerai ritel & supermarket regional Jabodetabek. Fokus pada audit SOP kasir, stok fresh goods, dan kepatuhan standar kebersihan toko harian."
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800 font-medium resize-none leading-relaxed"
                />
              </div>

              {/* Row 4: Alamat Lengkap */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  placeholder="Gedung Wisma Niaga Lt. 8, Jl. TB Simatupang No. 18, Jakarta Selatan 12560"
                  value={editFormData.headquartersAddress}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      headquartersAddress: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800 font-medium"
                />
              </div>

              {/* Row 5: Status Workspace */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Status Workspace
                </label>
                <div className="relative">
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status: e.target.value as "Aktif" | "Nonaktif",
                      })
                    }
                    className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all text-slate-800 cursor-pointer font-medium"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soft Delete Modal (Matching Figma) */}
      {softDeleteWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-500 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    Konfirmasi Nonaktifkan Workspace
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-normal">
                    Hapus Sementara (Soft Delete)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSoftDeleteWorkspace(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
              Apakah Anda yakin ingin menonaktifkan workspace{" "}
              <span className="font-bold text-slate-900">
                {softDeleteWorkspace.name}
              </span>{" "}
              ? Data workspace dan toko terkait akan diarsipkan serta disembunyikan
              dari aktivitas operasional aktif, namun dapat dipulihkan kembali
              oleh Super Admin kapan saja.
            </p>

            {/* Warning Alert Box */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 mb-6">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                Tindakan ini adalah soft delete dan tidak menghapus data secara permanen.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSoftDeleteWorkspace(null)}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSoftDelete}
                className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#cc0000] hover:bg-[#b30000] rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                Ya, Nonaktifkan Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Workspace Modal (Matching Figma) */}
      {selectedDetailWorkspace && (() => {
        const initials =
          selectedDetailWorkspace.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase() || "WS";

        const adminEmail =
          selectedDetailWorkspace.adminEmail ||
          `admin.${selectedDetailWorkspace.name.toLowerCase().replace(/\s+/g, "")}@auditpro.com`;

        const picName = selectedDetailWorkspace.picName || "Hendra Gunawan";
        const picPhone = selectedDetailWorkspace.picPhone || "+62 812-8899-1023";

        const previewStores =
          selectedDetailWorkspace.stores && selectedDetailWorkspace.stores.length > 0
            ? selectedDetailWorkspace.stores
            : [
                `Toko ${selectedDetailWorkspace.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4)}-01: Cabang Pondok Indah`,
                `Toko ${selectedDetailWorkspace.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4)}-02: Cabang Kelapa Gading`,
                `Toko ${selectedDetailWorkspace.name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4)}-03: Cabang Bintaro Sektor 7`,
              ];

        const remainingStoresCount = Math.max(
          0,
          selectedDetailWorkspace.storeCount - previewStores.length
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-5 sm:p-6 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="flex items-start justify-between gap-4 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                        Detail Workspace
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          selectedDetailWorkspace.status === "Aktif"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50"
                            : "bg-rose-50 text-rose-600 border border-rose-200/50"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            selectedDetailWorkspace.status === "Aktif"
                              ? "bg-emerald-500"
                              : "bg-rose-500"
                          }`}
                        />
                        {selectedDetailWorkspace.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-normal">
                      Informasi lengkap dan konfigurasi entitas workspace
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDetailWorkspace(null)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Workspace Identity Card */}
              <div className="mt-4 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#193f53] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                    {initials}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-base leading-tight">
                      {selectedDetailWorkspace.name}
                    </div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">
                      {selectedDetailWorkspace.companyName || "PT Sumber Retail Sejahtera"}
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right text-xs text-slate-500 space-y-0.5">
                  <div className="text-slate-400">
                    Dibuat: <span className="text-slate-700 font-medium">{selectedDetailWorkspace.createdAt}</span>
                  </div>
                  <div className="text-slate-500">
                    Admin: <span className="text-slate-700 font-medium">{adminEmail}</span>
                  </div>
                </div>
              </div>

              {/* Total Toko Terdaftar Card */}
              <div className="mt-2.5 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                      TOTAL TOKO TERDAFTAR
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Jumlah toko dan outlet ritel yang terhubung dalam workspace ini
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-slate-900">
                    {selectedDetailWorkspace.storeCount}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Outlet Aktif
                  </span>
                </div>
              </div>

              {/* 2-Column Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3.5">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* Deskripsi Workspace */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      DESKRIPSI WORKSPACE
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed min-h-[75px]">
                      {selectedDetailWorkspace.companyDescription || selectedDetailWorkspace.description}
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
                        {picName} • {picPhone}
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
                      <span>
                        {selectedDetailWorkspace.headquartersAddress ||
                          "Gedung Wisma Niaga Lt. 8, Jl. TB Simatupang No. 18, Jakarta Selatan 12560"}
                      </span>
                    </div>
                  </div>

                  {/* Toko Terdaftar (Preview) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        TOKO TERDAFTAR (PREVIEW)
                      </span>
                      <Link
                        href={`/workspaces/${selectedDetailWorkspace.id}`}
                        onClick={() => setSelectedDetailWorkspace(null)}
                        className="text-xs text-slate-500 hover:text-[#193f53] font-medium transition-colors"
                      >
                        Lihat Semua ({selectedDetailWorkspace.storeCount})
                      </Link>
                    </div>

                    <div className="space-y-1.5">
                      {previewStores.map((storeName, i) => (
                        <div
                          key={i}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-medium"
                        >
                          {storeName}
                        </div>
                      ))}
                    </div>

                    {remainingStoresCount > 0 && (
                      <div className="text-[11px] text-slate-400 italic mt-1 pl-1">
                        +{remainingStoresCount} toko lainnya dalam klaster ini
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedDetailWorkspace(null)}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const wsToEdit = selectedDetailWorkspace;
                    setSelectedDetailWorkspace(null);
                    handleEditClick(wsToEdit);
                  }}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Edit Workspace</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

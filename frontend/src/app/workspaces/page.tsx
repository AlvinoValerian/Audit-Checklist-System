"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import WorkspaceStats from "@/components/workspace/WorkspaceStats";
import WorkspaceTable from "@/components/workspace/WorkspaceTable";
import { WorkspaceService } from "@/services/workspace.service";
import { Workspace, WorkspaceStatsData } from "@/types/workspace";
import { Plus, X, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [stats, setStats] = useState<WorkspaceStatsData>({
    totalWorkspaces: 0,
    activeWorkspaces: 0,
    inactiveWorkspaces: 0,
    totalStores: 0,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    name: "",
    companyName: "",
    companyDescription: "",
    headquartersAddress: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  // Load from WorkspaceService (localStorage backed)
  const refreshData = () => {
    const list = WorkspaceService.getAll();
    setWorkspaces(list);
    setStats(WorkspaceService.getStats(list));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.name.trim()) {
      toast.error("Nama workspace wajib diisi!");
      return;
    }

    if (!createFormData.companyName.trim()) {
      toast.error("Nama perusahaan wajib diisi!");
      return;
    }

    if (!createFormData.companyDescription.trim()) {
      toast.error("Deskripsi perusahaan wajib diisi!");
      return;
    }

    WorkspaceService.create({
      name: createFormData.name.trim(),
      companyName: createFormData.companyName.trim(),
      companyDescription: createFormData.companyDescription.trim(),
      headquartersAddress: createFormData.headquartersAddress.trim() || "-",
      description:
        createFormData.companyDescription.trim() || "Klaster audit toko",
      storeCount: 0,
      status: createFormData.status,
    });

    toast.success(`Workspace "${createFormData.name}" berhasil ditambahkan!`);
    setIsCreateModalOpen(false);
    setCreateFormData({
      name: "",
      companyName: "",
      companyDescription: "",
      headquartersAddress: "",
      status: "Aktif",
    });
    refreshData();
  };

  const handleUpdate = (id: string, data: Partial<Workspace>) => {
    WorkspaceService.update(id, data);
    refreshData();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus workspace "${name}"?`)) {
      WorkspaceService.delete(id);
      toast.info(`Workspace "${name}" telah dihapus.`);
      refreshData();
    }
  };

  return (
    <DashboardLayout>
      <Header
        title="Workspace"
        subtitle="Kelola data unit kerja dan statistik audit toko"
        action={
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#193f53] hover:bg-[#143343] text-white text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Workspace</span>
          </button>
        }
      />

      <WorkspaceStats stats={stats} />

      <WorkspaceTable
        workspaces={workspaces}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />

      {/* Create Workspace Modal (Exact match to Figma design) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5">
              <h3 className="font-bold text-slate-900 text-lg sm:text-xl tracking-tight">
                Tambah Workspace Baru
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="px-6 pb-6 space-y-4">
              {/* Row 1: Nama Workspace & Nama Perusahaan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Nama Perusahaan <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama Perusahaan"
                    value={createFormData.name}
                    onChange={(e) =>
                      setCreateFormData({ ...createFormData, name: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    Kategori Perusahaan<span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Masukkan kategori perusahaan"
                    value={createFormData.companyName}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        companyName: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
                  />
                </div>
              </div>

              {/* Row 2: Deskripsi Perusahaan */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Deskripsi Perusahaan <span className="text-rose-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama entitas perusahaan"
                  value={createFormData.companyDescription}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      companyDescription: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>

              {/* Row 3: Alamat Kantor Pusat */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Alamat Kantor Pusat
                </label>
                <input
                  type="text"
                  placeholder="Alamat kantor pusat"
                  value={createFormData.headquartersAddress}
                  onChange={(e) =>
                    setCreateFormData({
                      ...createFormData,
                      headquartersAddress: e.target.value,
                    })
                  }
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
                />
              </div>

              {/* Row 4: Status Awal */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  Status Awal
                </label>
                <div className="relative">
                  <select
                    value={createFormData.status}
                    onChange={(e) =>
                      setCreateFormData({
                        ...createFormData,
                        status: e.target.value as "Aktif" | "Nonaktif",
                      })
                    }
                    className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all text-slate-800 cursor-pointer"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Row 5: Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs cursor-pointer"
                >
                  Simpan Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

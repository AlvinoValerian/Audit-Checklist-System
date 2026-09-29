"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    name: string;
    companyName: string;
    category: string;
    description: string;
    headquartersAddress: string;
    status: "Aktif" | "Nonaktif";
  }) => void;
}

export default function CreateWorkspaceModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateWorkspaceModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    headquartersAddress: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: "",
        category: "",
        description: "",
        headquartersAddress: "",
        status: "Aktif",
      });
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Nama Workspace / Perusahaan wajib diisi!");
      return;
    }

    if (!formData.category.trim()) {
      toast.error("Kategori Perusahaan wajib diisi!");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Deskripsi Perusahaan wajib diisi!");
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      companyName: formData.name.trim(),
      category: formData.category.trim(),
      description: formData.description.trim(),
      headquartersAddress: formData.headquartersAddress.trim() || "-",
      status: formData.status,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Workspace Baru"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Nama Workspace / Perusahaan & Kategori Perusahaan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Nama Workspace / Perusahaan <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Masukkan nama Perusahaan"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Kategori Perusahaan <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Masukkan kategori perusahaan"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
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
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
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
            value={formData.headquartersAddress}
            onChange={(e) =>
              setFormData({ ...formData, headquartersAddress: e.target.value })
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
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
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

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-center"
          >
            Batal
          </button>
          <button
            type="submit"
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] rounded-lg transition-colors shadow-2xs cursor-pointer text-center"
          >
            Simpan Workspace
          </button>
        </div>
      </form>
    </Modal>
  );
}

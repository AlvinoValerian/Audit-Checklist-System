"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Workspace } from "@/types/workspace";
import { Pencil, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface EditWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  onSubmit: (formData: Partial<Workspace>) => void;
}

export default function EditWorkspaceModal({
  isOpen,
  onClose,
  workspace,
  onSubmit,
}: EditWorkspaceModalProps) {
  const [formData, setFormData] = useState({
    companyName: "",
    category: "",
    picName: "",
    picPhone: "",
    description: "",
    headquartersAddress: "",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  useEffect(() => {
    if (workspace) {
      setFormData({
        companyName:
          workspace.companyName || workspace.name || "PT Sumber Retail Sejahtera",
        category: workspace.category || workspace.companyCategory || "Retail",
        picName: workspace.picName || "Hendra Gunawan",
        picPhone: workspace.picPhone || "+62 812-8899-1023",
        description:
          workspace.description ||
          workspace.companyDescription ||
          "Klaster gerai ritel & supermarket regional Jabodetabek. Fokus pada audit SOP kasir, stok fresh goods, dan kepatuhan standar kebersihan toko harian.",
        headquartersAddress:
          workspace.headquartersAddress ||
          "Gedung Wisma Niaga Lt. 8, Jl. TB Simatupang No. 18, Jakarta Selatan 12560",
        status: workspace.status || "Aktif",
      });
    }
  }, [workspace, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName.trim()) {
      toast.error("Nama Perusahaan wajib diisi!");
      return;
    }

    if (!formData.category.trim()) {
      toast.error("Kategori Perusahaan wajib diisi!");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("Deskripsi Workspace wajib diisi!");
      return;
    }

    onSubmit({
      name: formData.companyName.trim(),
      companyName: formData.companyName.trim(),
      category: formData.category.trim(),
      companyCategory: formData.category.trim(),
      picName: formData.picName.trim(),
      picPhone: formData.picPhone.trim(),
      description: formData.description.trim(),
      companyDescription: formData.description.trim(),
      headquartersAddress: formData.headquartersAddress.trim() || "-",
      status: formData.status,
    });
  };

  if (!workspace) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Workspace"
      subtitle="Perbarui informasi dan konfigurasi entitas workspace"
      icon={<Pencil className="w-5 h-5 text-sky-600" />}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1: Nama Perusahaan & Kategori Perusahaan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Nama Perusahaan <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="PT Sumber Retail Sejahtera"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
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
              placeholder="Retail"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>
        </div>

        {/* Row 2: Kontak Person (PIC) & Nomor Telepon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Kontak Person (PIC)
            </label>
            <input
              type="text"
              placeholder="Hendra Gunawan"
              value={formData.picName}
              onChange={(e) =>
                setFormData({ ...formData, picName: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Nomor Telepon
            </label>
            <input
              type="text"
              placeholder="+62 812-8899-1023"
              value={formData.picPhone}
              onChange={(e) =>
                setFormData({ ...formData, picPhone: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
            />
          </div>
        </div>

        {/* Row 3: Deskripsi Workspace (textarea) */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Deskripsi Workspace <span className="text-rose-500 font-bold">*</span>
          </label>
          <textarea
            required
            rows={3}
            placeholder="Klaster gerai ritel & supermarket regional Jabodetabek..."
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800 leading-relaxed"
          />
        </div>

        {/* Row 4: Alamat Lengkap */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Alamat Lengkap
          </label>
          <input
            type="text"
            placeholder="Gedung Wisma Niaga Lt. 8, Jl. TB Simatupang No. 18, Jakarta Selatan 12560"
            value={formData.headquartersAddress}
            onChange={(e) =>
              setFormData({ ...formData, headquartersAddress: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>

        {/* Row 5: Status Workspace */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Status Workspace
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
            Simpan Perubahan
          </button>
        </div>
      </form>
    </Modal>
  );
}

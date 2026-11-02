"use client";

import React, { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { Workspace } from "@/types/workspace";
import { Pencil, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EditWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  isSubmitting?: boolean;
  onSubmit: (formData: Partial<Workspace>) => void;
}

export default function EditWorkspaceModal({
  isOpen,
  onClose,
  workspace,
  isSubmitting = false,
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
        companyName: workspace.companyName || workspace.name || "",
        category: workspace.category || workspace.companyCategory || "",
        picName: workspace.picName && workspace.picName !== "-" ? workspace.picName : "",
        picPhone: workspace.picPhone && workspace.picPhone !== "-" ? workspace.picPhone : "",
        description: workspace.description || workspace.companyDescription || "",
        headquartersAddress: workspace.headquartersAddress && workspace.headquartersAddress !== "-" ? workspace.headquartersAddress : "",
        status: workspace.status || "Aktif",
      });
    }
  }, [workspace, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

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
      onClose={isSubmitting ? () => {} : onClose}
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
              disabled={isSubmitting}
              placeholder="PT Sumber Retail Sejahtera"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Kategori Perusahaan <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              placeholder="F&B, Retail, Swalayan, dsb"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Row 2: Deskripsi Workspace */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Deskripsi Workspace <span className="text-rose-500 font-bold">*</span>
          </label>
          <input
            type="text"
            required
            disabled={isSubmitting}
            placeholder="Keterangan singkat operasional unit kerja"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800"
          />
        </div>

        {/* Row 3: Alamat Kantor Pusat */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Alamat Kantor Pusat
          </label>
          <input
            type="text"
            disabled={isSubmitting}
            placeholder="Alamat kantor pusat operasional"
            value={formData.headquartersAddress}
            onChange={(e) =>
              setFormData({ ...formData, headquartersAddress: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800"
          />
        </div>

        {/* Row 4: PIC Name & PIC Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Nama PIC (Penanggung Jawab)
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              placeholder="Contoh: Budi Santoso"
              value={formData.picName}
              onChange={(e) =>
                setFormData({ ...formData, picName: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5">
              Nomor Telepon / Kontak PIC
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              placeholder="Contoh: 0812-3456-7890"
              value={formData.picPhone}
              onChange={(e) =>
                setFormData({ ...formData, picPhone: e.target.value })
              }
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Row 5: Status Workspace */}
        <div>
          <label className="block text-xs font-semibold text-slate-800 mb-1.5">
            Status Workspace
          </label>
          <div className="relative">
            <select
              disabled={isSubmitting}
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as "Aktif" | "Nonaktif",
                })
              }
              className="w-full appearance-none px-3.5 py-2.5 pr-10 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-[#193f53] focus:ring-1 focus:ring-[#193f53]/20 disabled:bg-slate-50 disabled:opacity-70 transition-all text-slate-800 cursor-pointer"
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
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 rounded-lg transition-colors cursor-pointer text-center"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#193f53] hover:bg-[#143343] disabled:opacity-70 rounded-lg transition-colors shadow-2xs cursor-pointer text-center flex items-center justify-center gap-2 min-w-[160px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>Simpan Perubahan</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

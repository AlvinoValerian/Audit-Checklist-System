"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import { Workspace } from "@/types/workspace";
import { Trash2, AlertCircle } from "lucide-react";

interface DeleteWorkspaceModalProps {
  isOpen: boolean;
  workspace: Workspace | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteWorkspaceModal({
  isOpen,
  workspace,
  onClose,
  onConfirm,
}: DeleteWorkspaceModalProps) {
  if (!workspace) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfirmasi Nonaktifkan Workspace"
      subtitle="Hapus Sementara (Soft Delete)"
      icon={<Trash2 className="w-5 h-5 text-rose-500 stroke-[2]" />}
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Apakah Anda yakin ingin menonaktifkan workspace{" "}
          <span className="font-bold text-slate-900">{workspace.name}</span>? Data
          workspace dan toko terkait akan diarsipkan serta disembunyikan dari
          aktivitas operasional aktif, namun dapat dipulihkan kembali oleh Super
          Admin kapan saja.
        </p>

        {/* Warning Alert Box */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium leading-relaxed">
            Tindakan ini adalah soft delete dan tidak menghapus data secara
            permanen.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-center"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-white bg-[#cc0000] hover:bg-[#b30000] rounded-lg transition-colors shadow-2xs cursor-pointer text-center"
          >
            Ya, Nonaktifkan Workspace
          </button>
        </div>
      </div>
    </Modal>
  );
}

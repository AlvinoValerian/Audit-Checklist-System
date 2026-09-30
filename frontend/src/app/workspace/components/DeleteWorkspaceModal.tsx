"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import { Workspace } from "@/types/workspace";
import { Trash2, AlertCircle, RotateCcw, CheckCircle2 } from "lucide-react";

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

  const isDeactivating = workspace.status === "Aktif";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isDeactivating ? "Konfirmasi Nonaktifkan Workspace" : "Konfirmasi Aktifkan Workspace"}
      subtitle={isDeactivating ? "Hapus Sementara (Soft Delete)" : "Aktifkan Kembali Unit Kerja"}
      icon={
        isDeactivating ? (
          <Trash2 className="w-5 h-5 text-rose-500 stroke-[2]" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2]" />
        )
      }
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {isDeactivating ? (
          <>
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
                permanen. Anda dapat mengaktifkan kembali workspace ini kapan saja.
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin mengaktifkan kembali workspace{" "}
              <span className="font-bold text-slate-900">{workspace.name}</span>? Seluruh
              data unit kerja dan akses audit toko terkait akan dipulihkan ke status operasional aktif.
            </p>

            {/* Info Alert Box */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                Workspace ini akan kembali berstatus Aktif dan dapat diakses kembali untuk kegiatan audit.
              </p>
            </div>
          </>
        )}

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
            className={`w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg transition-colors shadow-2xs cursor-pointer text-center ${
              isDeactivating
                ? "bg-[#cc0000] hover:bg-[#b30000]"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isDeactivating ? "Ya, Nonaktifkan Workspace" : "Ya, Aktifkan Workspace"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

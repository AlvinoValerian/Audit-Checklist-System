"use client";

import React from "react";
import Modal from "@/components/ui/Modal";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Holiday } from "@/types/holiday";

interface DeleteHolidayModalProps {
  isOpen: boolean;
  holiday: Holiday | null;
  onClose: () => void;
  onConfirm: () => void;  
}

export default function DeleteHolidayModal({
  isOpen,
  holiday,
  onClose,
  onConfirm,
}: DeleteHolidayModalProps) {
  if (!holiday) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hapus Jadwal Libur"
      icon={<AlertTriangle className="w-5 h-5 text-red-600" />}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 leading-relaxed">
          Apakah Anda yakin ingin menghapus jadwal libur untuk 
          <strong className="text-slate-900 font-bold mx-1">
            {holiday.storeName}
          </strong>?
        </p>

        <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-xs text-red-800">
          Tindakan ini tidak dapat dibatalkan. Data jadwal libur ini akan dihapus secara permanen dari sistem.
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-2xs cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Hapus Jadwal
          </button>
        </div>
      </div>
    </Modal>
  );
}

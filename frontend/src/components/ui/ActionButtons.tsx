"use client";

import React from "react";
import { Eye, Pencil, Trash2, RotateCcw } from "lucide-react";

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  
  viewTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
  restoreTitle?: string;
}

export default function ActionButtons({
  onView,
  onEdit,
  onDelete,
  onRestore,
  viewTitle = "Lihat Detail",
  editTitle = "Edit",
  deleteTitle = "Hapus",
  restoreTitle = "Aktifkan Kembali",
}: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-end gap-2.5">
      {onView && (
        <button
          onClick={onView}
          title={viewTitle}
          className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      
      {onEdit && (
        <button
          onClick={onEdit}
          title={editTitle}
          className="text-sky-500 hover:text-sky-600 p-1 hover:bg-sky-50 rounded transition-colors cursor-pointer"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}

      {onDelete && (
        <button
          onClick={onDelete}
          title={deleteTitle}
          className="text-rose-500 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {onRestore && (
        <button
          onClick={onRestore}
          title={restoreTitle}
          className="text-emerald-600 hover:text-emerald-700 p-1 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

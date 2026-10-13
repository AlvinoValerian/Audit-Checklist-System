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
  align?: "center" | "end" | "start";
  className?: string;
  alignRestoreWithDelete?: boolean;
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
  align = "end",
  className = "",
  alignRestoreWithDelete = true,
}: ActionButtonsProps) {
  const justifyClass =
    align === "center"
      ? "justify-center"
      : align === "start"
      ? "justify-start"
      : "justify-end";

  return (
    <div className={`flex items-center ${justifyClass} gap-2.5 ${className}`}>
      {onView && (
        <button
          onClick={onView}
          title={viewTitle}
          className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
      
      {/* Invisible placeholder if only onRestore is present, so it aligns with onDelete */}
      {alignRestoreWithDelete && onRestore && !onDelete && !onEdit && (
        <div className="w-6 h-6 pointer-events-none select-none invisible" aria-hidden="true" />
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

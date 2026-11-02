"use client";

import React from "react";
import { Eye, Pencil, Trash2, RotateCcw, Loader2 } from "lucide-react";

interface ActionButtonsProps {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  
  viewTitle?: string;
  editTitle?: string;
  deleteTitle?: string;
  restoreTitle?: string;
  editDisabled?: boolean;
  editDisabledTitle?: string;
  deleteDisabled?: boolean;
  deleteDisabledTitle?: string;
  align?: "center" | "end" | "start";
  className?: string;
  alignRestoreWithDelete?: boolean;
  hasViewSlot?: boolean;
  isRestoring?: boolean;
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
  editDisabled = false,
  editDisabledTitle,
  deleteDisabled = false,
  deleteDisabledTitle,
  align = "end",
  className = "",
  alignRestoreWithDelete = true,
  hasViewSlot = true,
  isRestoring = false,
}: ActionButtonsProps) {
  const justifyClass =
    align === "center"
      ? "justify-center"
      : align === "start"
      ? "justify-start"
      : "justify-end";

  return (
    <div className={`flex items-center ${justifyClass} gap-2.5 ${className}`}>
      {/* Slot 1: View Button or Placeholder when restoring */}
      {onView ? (
        <button
          onClick={onView}
          title={viewTitle}
          className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-100 rounded transition-colors cursor-pointer"
        >
          <Eye className="w-4 h-4" />
        </button>
      ) : (
        alignRestoreWithDelete && onRestore && !onDelete && !onEdit && hasViewSlot && (
          <div className="w-6 h-6 pointer-events-none select-none invisible" aria-hidden="true" />
        )
      )}
      
      {/* Slot 2: Edit Button or Placeholder when restoring */}
      {onEdit ? (
        <button
          onClick={editDisabled ? undefined : onEdit}
          disabled={editDisabled}
          title={editDisabled ? (editDisabledTitle || editTitle) : editTitle}
          className={`p-1 rounded transition-colors ${editDisabled ? "text-slate-300 cursor-not-allowed" : "text-sky-500 hover:text-sky-600 hover:bg-sky-50 cursor-pointer"}`}
        >
          <Pencil className="w-4 h-4" />
        </button>
      ) : (
        alignRestoreWithDelete && onRestore && !onDelete && (
          <div className="w-6 h-6 pointer-events-none select-none invisible" aria-hidden="true" />
        )
      )}

      {/* Slot 3: Delete Button */}
      {onDelete && (
        <button
          onClick={deleteDisabled ? undefined : onDelete}
          disabled={deleteDisabled}
          title={deleteDisabled ? (deleteDisabledTitle || deleteTitle) : deleteTitle}
          className={`p-1 rounded transition-colors ${deleteDisabled ? "text-slate-300 cursor-not-allowed" : "text-rose-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"}`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}

      {/* Slot 3 (Alternative): Restore Button (aligned with Delete) */}
      {onRestore && (
        <button
          onClick={onRestore}
          disabled={isRestoring}
          title={restoreTitle}
          className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50 p-1 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
        >
          {isRestoring ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
          ) : (
            <RotateCcw className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );
}

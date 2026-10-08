"use client";

import React from "react";
import {
  X,
  User,
  Mail,
  Briefcase,
  Store,
  CheckCircle2,
  XCircle,
  Pencil,
} from "lucide-react";
import { StaffUser } from "@/types/staff";

interface DetailStaffModalProps {
  isOpen: boolean;
  staff: StaffUser | null;
  onClose: () => void;
  onEdit?: (staff: StaffUser) => void;
}

export default function DetailStaffModal({
  isOpen,
  staff,
  onClose,
  onEdit,
}: DetailStaffModalProps) {
  if (!isOpen || !staff) return null;

  const isAktif = staff.status === "Aktif";
  const initials = staff.fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="bg-white rounded-2xl w-full max-w-lg relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-3 relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Detail Staff
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Informasi profil, penugasan toko, dan status operasional staf auditor.
          </p>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-3 space-y-4">
          {/* Top Profile Summary Card */}
          <div className="bg-slate-50/60 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar Initials */}
              <div className="w-11 h-11 rounded-full bg-sky-100 text-sky-700 font-bold text-sm flex items-center justify-center shrink-0">
                {initials || "ST"}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {staff.fullName}
                </h3>
                <span className="inline-block mt-0.5 px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                  {staff.position}
                </span>
              </div>
            </div>

            {/* Status Pill */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${
                isAktif
                  ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                  : "bg-rose-50 text-rose-600 border-rose-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isAktif ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              {staff.status}
            </span>
          </div>

          {/* 2x2 Information Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-4 pt-1">
            {/* 1. Nama Lengkap */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                NAMA LENGKAP
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{staff.fullName}</span>
              </div>
            </div>

            {/* 2. Email Staff */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                EMAIL STAFF
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-900">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-900">{staff.email}</span>
              </div>
            </div>

            {/* 3. Posisi / Peran */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                POSISI / PERAN
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{staff.position}</span>
              </div>
            </div>

            {/* 4. Status Akun */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 tracking-wider uppercase mb-1">
                STATUS AKUN
              </div>
              <div
                className={`flex items-center gap-1.5 text-xs font-bold ${
                  isAktif ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {isAktif ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Aktif (Siap ditugaskan jadwal audit)</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>Nonaktif (Tidak ditugaskan jadwal audit)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Section: Penempatan Toko */}
          <div className="pt-1">
            <div className="text-xs font-bold text-slate-900 mb-2">
              Penempatan Toko
            </div>
            <div className="border border-slate-100 bg-slate-50/50 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {staff.storeName}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {staff.storeLocation}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 flex justify-end items-center gap-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Tutup
          </button>
          {onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(staff);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#193f53] hover:bg-[#143343] text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Data Staff</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

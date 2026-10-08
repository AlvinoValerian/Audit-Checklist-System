"use client";

import React, { useState, useEffect } from "react";
import { X, ChevronDown, CheckCircle2 } from "lucide-react";
import { StaffUser, StaffStatus } from "@/types/staff";
import { toast } from "sonner";

export const STORE_OPTIONS = [
  { name: "Cabang Sudirman", location: "Jakarta Pusat" },
  { name: "Cabang Thamrin", location: "Jakarta Pusat" },
  { name: "Cabang Kemang", location: "Jakarta Selatan" },
  { name: "Cabang Senayan", location: "Jakarta Pusat" },
  { name: "Cabang PIK", location: "Jakarta Utara" },
  { name: "Cabang Kelapa Gading", location: "Jakarta Utara" },
  { name: "Cabang Puri Indah", location: "Jakarta Barat" },
  { name: "Cabang Pondok Indah", location: "Jakarta Selatan" },
  { name: "Cabang Bintaro", location: "Tangerang Selatan" },
  { name: "Cabang Serpong", location: "Tangerang Selatan" },
  { name: "Cabang Grand Indonesia", location: "Jakarta Pusat" },
  { name: "Cabang Central Park", location: "Jakarta Barat" },
];

export const POSITION_OPTIONS = [
  "Auditor Lapangan",
  "Senior Auditor",
  "Lead Auditor",
  "Quality Control",
  "Store Supervisor",
];

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (staffData: Omit<StaffUser, "id">) => void;
  staffToEdit?: StaffUser | null;
}

export default function CreateStaffModal({
  isOpen,
  onClose,
  onSubmit,
  staffToEdit,
}: CreateStaffModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("Auditor Lapangan");
  const [selectedStore, setSelectedStore] = useState("");
  const [isActive, setIsActive] = useState(true);

  const isEditMode = Boolean(staffToEdit);

  useEffect(() => {
    if (staffToEdit && isOpen) {
      setFullName(staffToEdit.fullName || "");
      setEmail(staffToEdit.email || "");
      setPosition(staffToEdit.position || "Auditor Lapangan");
      setSelectedStore(staffToEdit.storeName || "");
      setIsActive(staffToEdit.status === "Aktif");
    } else if (isOpen) {
      setFullName("");
      setEmail("");
      setPosition("Auditor Lapangan");
      setSelectedStore("");
      setIsActive(true);
    }
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Nama lengkap staff wajib diisi.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Email staff valid wajib diisi.");
      return;
    }

    if (!selectedStore) {
      toast.error("Silakan pilih penempatan toko.");
      return;
    }

    const matchedStore = STORE_OPTIONS.find((s) => s.name === selectedStore);
    const storeLocation = matchedStore
      ? matchedStore.location
      : staffToEdit?.storeLocation || "Jakarta";

    const status: StaffStatus = isActive ? "Aktif" : "Nonaktif";

    onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      storeName: selectedStore,
      storeLocation,
      position,
      status,
      phone: staffToEdit?.phone || "0812-3456-7890",
      joinDate:
        staffToEdit?.joinDate ||
        new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl w-full max-w-lg relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-2 relative">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {isEditMode ? "Edit Data Staff" : "Tambah Staff Baru"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isEditMode
              ? "Perbarui informasi profil dan penugasan toko staf auditor di Workspace A."
              : "Lengkapi data identitas dan penugasan staf auditor baru ke dalam Workspace A."}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {/* Row 1: Nama Lengkap & Email Staff */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Andi Wijaya"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Staff <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama.staff@auditpro.com"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all"
                  required
                />
              </div>
            </div>

            {/* Row 2: Posisi / Peran */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Posisi / Peran <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full appearance-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all pr-8 cursor-pointer"
                >
                  {POSITION_OPTIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Row 3: Penempatan Toko */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Penempatan Toko <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="w-full appearance-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] transition-all pr-8 cursor-pointer"
                  required
                >
                  <option value="" disabled>
                    Pilih Penempatan Toko
                  </option>
                  {STORE_OPTIONS.map((store) => (
                    <option key={store.name} value={store.name}>
                      {isEditMode
                        ? `${store.name} - ${store.location}`
                        : `${store.name} (${store.location})`}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Row 4: Status Akun toggle */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-xs font-semibold text-slate-800">
                  {isEditMode ? "Status Akun" : "Status Awal Akun"}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isEditMode
                    ? isActive
                      ? "Staff aktif dan dapat ditugaskan jadwal audit"
                      : "Staff dinonaktifkan dari penugasan jadwal audit"
                    : "Staff langsung aktif dan dapat ditugaskan jadwal audit"}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? "bg-blue-600" : "bg-slate-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-100 flex justify-end items-center gap-2.5 bg-slate-50/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#193f53] hover:bg-[#143343] text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEditMode ? "Simpan Perubahan" : "Simpan Staff"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

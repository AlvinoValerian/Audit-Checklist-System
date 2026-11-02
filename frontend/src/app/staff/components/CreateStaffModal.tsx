"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ChevronDown,
  CheckCircle2,
  Loader2,
  Phone,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { StaffUser, StaffStatus } from "@/types/staff";
import { TokoService } from "@/services/toko.service";
import { AuthService } from "@/lib/auth";
import { toast } from "sonner";

export const POSITION_OPTIONS = [
  "Auditor Lapangan",
  "Senior Auditor",
  "Lead Auditor",
  "Quality Control",
  "Store Supervisor",
];

interface StoreOption {
  id: string;
  name: string;
  location: string;
}

interface CreateStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (staffData: Omit<StaffUser, "id">) => Promise<void> | void;
  staffToEdit?: StaffUser | null;
  isSubmitting?: boolean;
  workspaceId?: string;
}

export default function CreateStaffModal({
  isOpen,
  onClose,
  onSubmit,
  staffToEdit,
  isSubmitting = false,
  workspaceId,
}: CreateStaffModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("Auditor Lapangan");
  const [selectedStoreName, setSelectedStoreName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);

  // Password & Konfirmasi Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isEditMode = Boolean(staffToEdit);
  const activeWorkspace = AuthService.getActiveWorkspace();

  // Load toko dari backend
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadStores = async () => {
      setIsLoadingStores(true);
      try {
        const rawStores = await TokoService.fetchAll(workspaceId);
        if (isMounted) {
          const mapped: StoreOption[] = (rawStores || []).map((s) => ({
            id: s.id,
            name: s.name || s.storeName || `Toko #${s.id}`,
            location: s.city || s.address || "Indonesia",
          }));
          setStores(mapped);
        }
      } catch (err) {
        console.warn("⚠️ Gagal memuat daftar toko:", err);
      } finally {
        if (isMounted) setIsLoadingStores(false);
      }
    };

    loadStores();
    return () => {
      isMounted = false;
    };
  }, [isOpen, workspaceId]);

  useEffect(() => {
    if (staffToEdit && isOpen) {
      setFullName(staffToEdit.fullName || "");
      setEmail(staffToEdit.email || "");
      setPhone(staffToEdit.phone && staffToEdit.phone !== "-" ? staffToEdit.phone : "");
      setPosition(staffToEdit.position || "Auditor Lapangan");
      setSelectedStoreName(staffToEdit.storeName || "");
      setIsActive(staffToEdit.status === "Aktif");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
    } else if (isOpen) {
      setFullName("");
      setEmail("");
      setPhone("");
      setPosition("Auditor Lapangan");
      setSelectedStoreName("");
      setIsActive(true);
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
    }
  }, [staffToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!fullName.trim()) {
      toast.error("Nama lengkap staff wajib diisi.");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      toast.error("Email staff valid wajib diisi.");
      return;
    }

    // Validasi Password
    if (!isEditMode) {
      // Tambah Staff Baru: Password Wajib
      if (!password.trim()) {
        toast.error("Password staff wajib diisi.");
        return;
      }
      if (password.length < 6) {
        toast.error("Password minimal 6 karakter.");
        return;
      }
      if (password !== confirmPassword) {
        toast.error("Konfirmasi password tidak cocok.");
        return;
      }
    } else {
      // Edit Data Staff: Password Opsional
      if (password.trim() !== "") {
        if (password.length < 6) {
          toast.error("Password baru minimal 6 karakter.");
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Konfirmasi password baru tidak cocok.");
          return;
        }
      }
    }

    if (!selectedStoreName) {
      toast.error("Silakan pilih penempatan toko.");
      return;
    }

    const matchedStore = stores.find((s) => s.name === selectedStoreName);
    const storeLocation = matchedStore
      ? matchedStore.location
      : staffToEdit?.storeLocation || "Indonesia";

    const status: StaffStatus = isActive ? "Aktif" : "Nonaktif";

    await onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      storeId: matchedStore?.id || staffToEdit?.storeId,
      storeName: selectedStoreName,
      storeLocation,
      position,
      status,
      phone: phone.trim() || staffToEdit?.phone || "-",
      password: password.trim() ? password.trim() : undefined,
      workspaceId: workspaceId || staffToEdit?.workspaceId,
      joinDate:
        staffToEdit?.joinDate ||
        new Date().toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-2.5 relative shrink-0">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 disabled:opacity-40 transition-colors p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {isEditMode ? "Edit Data Staff" : "Tambah Staff Baru"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isEditMode
              ? `Perbarui informasi profil, penugasan toko, dan kredensial staf auditor di ${activeWorkspace?.name || "workspace ini"}.`
              : `Lengkapi data identitas, kredensial login, dan penugasan staf auditor baru ke dalam ${activeWorkspace?.name || "workspace ini"}.`}
          </p>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-6 py-4 space-y-3.5 overflow-y-auto flex-1">
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
                  placeholder="Contoh: Dina Lestari"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] disabled:bg-slate-50 disabled:opacity-70 transition-all"
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
                  placeholder="staff@gacoan.com"
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] disabled:bg-slate-50 disabled:opacity-70 transition-all"
                  required
                />
              </div>
            </div>

            {/* Row 2: No. Telepon / WhatsApp & Posisi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  No. Telepon / WhatsApp
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="081234567890"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] disabled:bg-slate-50 disabled:opacity-70 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Posisi / Peran <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full appearance-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] disabled:bg-slate-50 disabled:opacity-70 transition-all pr-8 cursor-pointer"
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
            </div>

            {/* Row 3: Password & Konfirmasi Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>
                    {isEditMode ? "Password Baru" : "Password"}{" "}
                    {!isEditMode && <span className="text-rose-500">*</span>}
                  </span>
                  {isEditMode && (
                    <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
                  )}
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isEditMode ? "Kosongkan jika tak diubah" : "Minimal 6 karakter"}
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] disabled:bg-slate-50 disabled:opacity-70 transition-all"
                    required={!isEditMode}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isEditMode ? "Konfirmasi Password Baru" : "Konfirmasi Password"}{" "}
                  {(!isEditMode || Boolean(password)) && (
                    <span className="text-rose-500">*</span>
                  )}
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    disabled={isSubmitting}
                    className="w-full pl-9 pr-9 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] disabled:bg-slate-50 disabled:opacity-70 transition-all"
                    required={!isEditMode || Boolean(password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {isEditMode && (
                <div className="col-span-1 sm:col-span-2">
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    💡 <em>Tips:</em> Biarkan kolom password dan konfirmasi password kosong jika Anda tidak ingin memperbarui password staf.
                  </p>
                </div>
              )}
            </div>

            {/* Row 4: Penempatan Toko (Dynamic from DB) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>
                  Penempatan Toko <span className="text-rose-500">*</span>
                </span>
                {isLoadingStores && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1 font-normal">
                    <Loader2 className="w-3 h-3 animate-spin" /> Memuat toko...
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  value={selectedStoreName}
                  onChange={(e) => setSelectedStoreName(e.target.value)}
                  disabled={isSubmitting || isLoadingStores}
                  className="w-full appearance-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#193f53]/15 focus:border-[#193f53] disabled:bg-slate-50 disabled:opacity-70 transition-all pr-8 cursor-pointer"
                  required
                >
                  <option value="" disabled>
                    {isLoadingStores ? "Memuat data toko..." : "Pilih Penempatan Toko"}
                  </option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.name}>
                      {store.name} ({store.location})
                    </option>
                  ))}
                  {/* Fallback jika toko edit tidak ada di list */}
                  {selectedStoreName && !stores.some((s) => s.name === selectedStoreName) && (
                    <option value={selectedStoreName}>
                      {selectedStoreName} ({staffToEdit?.storeLocation || "Indonesia"})
                    </option>
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Row 5: Status Akun toggle */}
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
                disabled={isSubmitting}
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                  isActive ? "bg-emerald-600" : "bg-slate-200"
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
          <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-100 flex justify-end items-center gap-2.5 bg-slate-50/50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#193f53] hover:bg-[#143343] disabled:opacity-70 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer min-w-[130px] justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditMode ? "Simpan Perubahan" : "Simpan Staff"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

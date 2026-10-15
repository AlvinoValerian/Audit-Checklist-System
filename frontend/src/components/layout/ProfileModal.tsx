"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  User,
  Camera,
  Pencil,
  Check,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/lib/auth";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName?: string;
  adminRole?: string;
  adminEmail?: string;
  workspaceName?: string;
  avatarUrl?: string | null;
  onUpdateProfile?: (data: { name?: string; avatar?: string | null }) => void;
}

function getInitials(name: string): string {
  if (!name) return "AD";
  if (name === "Admin Utama") return "AD";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ProfileModal({
  isOpen,
  onClose,
  adminName: defaultName = "Admin Utama",
  adminEmail = "admin@storeaudit.com",
  avatarUrl = null,
  onUpdateProfile,
}: ProfileModalProps) {
  const [currentName, setCurrentName] = useState(defaultName);
  const [email, setEmail] = useState(adminEmail);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(defaultName);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state from storage / auth on mount and modal open
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const currentUser = AuthService.getCurrentUser();
      const storedName = localStorage.getItem("audit_pro_admin_name");
      const storedAvatar = localStorage.getItem("audit_pro_avatar");

      const resolvedName = storedName || currentUser?.fullName || defaultName;
      setCurrentName(resolvedName);
      setNameInput(resolvedName);

      if (currentUser?.email) {
        setEmail(currentUser.email);
      } else {
        setEmail(adminEmail);
      }

      if (storedAvatar) {
        setAvatar(storedAvatar);
      } else {
        setAvatar(avatarUrl);
      }

      setIsEditingName(false);
    }
  }, [isOpen, defaultName, adminEmail, avatarUrl]);

  // Handle image upload from file picker
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, atau WEBP)");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("Ukuran foto maksimal 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setAvatar(dataUrl);
      if (typeof window !== "undefined") {
        localStorage.setItem("audit_pro_avatar", dataUrl);
      }
      onUpdateProfile?.({ avatar: dataUrl });
      toast.success("Foto profil berhasil diperbarui!");
    };
    reader.readAsDataURL(file);

    e.target.value = "";
  };

  // Handle removing uploaded photo
  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAvatar(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("audit_pro_avatar");
    }
    onUpdateProfile?.({ avatar: null });
    toast.success("Foto profil berhasil dihapus");
  };

  // Handle saving edited admin name
  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast.error("Nama admin tidak boleh kosong");
      return;
    }

    setCurrentName(trimmed);
    setIsEditingName(false);

    if (typeof window !== "undefined") {
      localStorage.setItem("audit_pro_admin_name", trimmed);
      const currentUser = AuthService.getCurrentUser();
      if (currentUser) {
        AuthService.setCurrentUser({ ...currentUser, fullName: trimmed });
      }
    }

    onUpdateProfile?.({ name: trimmed });
    toast.success("Nama admin berhasil disimpan!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="bg-white rounded-3xl w-full max-w-lg relative flex flex-col shadow-2xl border border-slate-100 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-6 pb-4 relative border-b border-slate-100">
          <button
            onClick={onClose}
            type="button"
            className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-center">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
              <User className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                Profil Pengguna
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Informasi akun dan penugasan akses sistem
              </p>
            </div>
          </div>
        </div>

        {/* Content Body: Sesuai Tata Letak Wireframe */}
        <div className="p-6 space-y-4">
          {/* Baris Atas: 1 (Foto Profil) di kiri, 2 (Nama), 3 (Email), 4 (Hak Akses) di kanan */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
            {/* 1: Foto Profil */}
            <div className="sm:col-span-5 relative rounded-2xl bg-slate-50 border border-slate-200/90 overflow-hidden flex flex-col items-center justify-center min-h-[175px] sm:min-h-[195px] shadow-2xs group">
              {avatar ? (
                <img
                  src={avatar}
                  alt={currentName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#193f53] text-white p-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-2xl shadow-inner mb-1.5">
                    {getInitials(currentName)}
                  </div>
                  <span className="text-[11px] font-medium text-slate-300">
                    Belum ada foto
                  </span>
                </div>
              )}

              {/* Tombol Hapus Foto (jika ada foto) */}
              {avatar && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                  title="Hapus Foto Profil"
                  aria-label="Hapus Foto Profil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Kolom Kanan: 2 (Nama), 3 (Email), 4 (Hak Akses) */}
            <div className="sm:col-span-7 flex flex-col justify-between gap-2.5">
              {/* 2: Nama Admin yang Sedang Login */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-center min-h-[58px]">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Nama
                  </span>
                  {!isEditingName && (
                    <button
                      type="button"
                      onClick={() => {
                        setNameInput(currentName);
                        setIsEditingName(true);
                      }}
                      className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer transition-colors"
                      title="Edit Nama"
                      aria-label="Edit Nama"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {!isEditingName ? (
                  <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {currentName}
                  </p>
                ) : (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveName();
                        if (e.key === "Escape") setIsEditingName(false);
                      }}
                      className="text-xs font-bold text-slate-900 px-2 py-0.5 bg-white rounded-md border border-slate-300 focus:outline-none focus:border-[#193f53] w-full"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveName}
                      className="p-1 bg-[#193f53] text-white rounded cursor-pointer"
                      title="Simpan"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingName(false)}
                      className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Batal"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* 3: Email */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-center min-h-[58px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Email
                </span>
                <p className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                  {email}
                </p>
              </div>

              {/* 4: Hak Akses */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between min-h-[58px]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Hak Akses
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#193f53]">
                    Admin
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Aktif
                </span>
              </div>
            </div>
          </div>

          {/* Baris Bawah: 5 (Edit Foto) di kiri bawah, 7 (Tutup) di kanan bawah */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center pt-2">
            {/* 5: Edit untuk Ganti Foto Profil */}
            <div className="sm:col-span-5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#193f53] hover:bg-[#123040] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Ganti Foto</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Spacer tengah */}
            <div className="hidden sm:block sm:col-span-3" />

            {/* 7: Tombol untuk Tutup Profil */}
            <div className="sm:col-span-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#193f53] hover:bg-[#123040] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  Lock,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/lib/auth";
import { ApiAuthService } from "@/services/auth.service";
import { CryptoService } from "@/lib/crypto";
import { optimizeAndResizeImage } from "@/lib/image-crypto";
import DecryptedImage from "@/components/DecryptedImage";

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
  if (!name || name === "Admin Utama" || name === "Admin") return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatDateIndo(date: Date): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

export default function ProfileModal({
  isOpen,
  onClose,
  adminName: propName = "",
  adminRole: propRole = "",
  adminEmail: propEmail = "",
  workspaceName = "",
  avatarUrl = null,
  onUpdateProfile,
}: ProfileModalProps) {
  const [currentName, setCurrentName] = useState(propName);
  const [email, setEmail] = useState(propEmail);
  const [role, setRole] = useState(propRole);
  const [avatar, setAvatar] = useState<string | null>(avatarUrl);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(propName);
  const [isEncryptedAvatar, setIsEncryptedAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Periode Paket Langganan
  const [purchasedPlan, setPurchasedPlan] = useState("Standard Plan");
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<Date>(new Date());
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [daysRemaining, setDaysRemaining] = useState<number>(30);

  // Sync state from storage / auth on mount and modal open
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      const storedName = localStorage.getItem("audit_pro_admin_name");
      if (storedName === "Admin Utama" || storedName === "Admin") {
        localStorage.removeItem("audit_pro_admin_name");
      }
      const validStoredName = localStorage.getItem("audit_pro_admin_name");
      const currentUser = AuthService.getCurrentUser();
      const storedAvatar = localStorage.getItem("audit_pro_avatar") || currentUser?.profilePicture;

      const resolvedName = validStoredName || currentUser?.fullName || propName || "Pengguna";
      setCurrentName(resolvedName);
      setNameInput(resolvedName);

      const resolvedEmail = currentUser?.email || propEmail || "-";
      setEmail(resolvedEmail);

      const resolvedRole = currentUser?.role || propRole || "Super Admin";
      setRole(resolvedRole);

      if (storedAvatar) {
        if (CryptoService.isEncrypted(storedAvatar)) {
          setIsEncryptedAvatar(true);
          CryptoService.decryptImage(storedAvatar)
            .then((dec) => {
              setAvatar(dec);
            })
            .catch(() => {
              setAvatar(null);
              setIsEncryptedAvatar(false);
            });
        } else {
          setAvatar(storedAvatar);
          setIsEncryptedAvatar(false);
        }
      } else if (avatarUrl) {
        setAvatar(avatarUrl);
        setIsEncryptedAvatar(false);
      } else {
        setAvatar(null);
        setIsEncryptedAvatar(false);
      }

      // Sinkronisasi data paket langganan (Eksklusif Super Admin - Teknis & role lain tidak memiliki paket)
      if (resolvedRole === "Super Admin") {
        try {
          const plan =
            localStorage.getItem("active_subscription_plan") ||
            localStorage.getItem("selected_checkout_plan");
          const billingCycle = localStorage.getItem("selected_billing_cycle");
          const durationDaysStored = localStorage.getItem("subscription_duration_days");
          const isYearly =
            billingCycle === "yearly" ||
            billingCycle === "annual" ||
            billingCycle === "tahunan" ||
            durationDaysStored === "365";
          const durationDays = durationDaysStored ? parseInt(durationDaysStored, 10) : isYearly ? 365 : 30;

          const basePlanName = plan
            ? plan.toLowerCase() === "lite"
              ? "Lite Plan"
              : plan.toLowerCase() === "pro"
              ? "Pro Plan"
              : "Standard Plan"
            : "Standard Plan";

          setPurchasedPlan(`${basePlanName} (${isYearly ? "Tahunan" : "Bulanan"})`);

          // Tanggal mulai langganan (default ke waktu akun terdaftar / pembayaran)
          let start = new Date();
          const storedStart =
            localStorage.getItem("subscription_start_date") ||
            (currentUser?.email ? localStorage.getItem(`subscription_start_date_${currentUser.email}`) : null);

          if (storedStart) {
            const parsed = new Date(storedStart);
            if (!isNaN(parsed.getTime())) start = parsed;
          } else {
            localStorage.setItem("subscription_start_date", start.toISOString());
            if (currentUser?.email) {
              localStorage.setItem(`subscription_start_date_${currentUser.email}`, start.toISOString());
            }
          }
          setSubscriptionStartDate(start);

          // Tanggal berakhir (periode 30 hari untuk bulanan, 365 hari untuk tahunan)
          const end = new Date(start);
          end.setDate(end.getDate() + durationDays);
          setSubscriptionEndDate(end);

          // Sisa hari aktif
          const now = new Date();
          const diffMs = end.getTime() - now.getTime();
          const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          setDaysRemaining(days);
        } catch {}
      } else {
        setPurchasedPlan("");
      }

      setIsEditingName(false);
    }
  }, [isOpen, propName, propEmail, propRole, avatarUrl]);

  // Handle image upload from file picker: Resize -> Encrypt AES-256 -> Simpan ke Database
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, atau WEBP)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Ukuran file foto maksimal 10MB");
      return;
    }

    try {
      toast.loading("Mengompresi & mengenkripsi foto profil...", { id: "profile-upload" });

      // 1. Resize proporsional & kompresi foto terlebih dahulu sebelum disimpan (maksimal 512x512)
      const resizedBase64 = await optimizeAndResizeImage(file, 512, 512, 0.85);
      if (!resizedBase64) {
        toast.error("Gagal memproses gambar foto profil.", { id: "profile-upload" });
        return;
      }

      // 2. Enkripsi foto hasil resize menggunakan algoritma AES-256-GCM
      const encrypted = await CryptoService.encryptImage(resizedBase64);

      // 3. Simpan foto hasil resize yang telah terenkripsi ke database server
      await ApiAuthService.updateProfile({ profilePicture: encrypted });

      // 4. Perbarui preview lokal, TopBar, dan storage setelah penyimpanan ke database berhasil
      if (typeof window !== "undefined") {
        localStorage.setItem("audit_pro_avatar", encrypted);
      }
      setAvatar(resizedBase64);
      setIsEncryptedAvatar(true);
      onUpdateProfile?.({ avatar: resizedBase64 });

      toast.success("Foto profil berhasil di-resize, dienkripsi (AES-256) & disimpan!", { id: "profile-upload" });
    } catch (err) {
      console.warn("Gagal memproses foto profil:", err);
      toast.error(
        err instanceof Error ? err.message : "Terjadi kesalahan saat memproses foto profil.",
        { id: "profile-upload" }
      );
    } finally {
      e.target.value = "";
    }
  };

  // Handle removing uploaded photo
  const handleRemovePhoto = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      // Hapus foto profil dari database server terlebih dahulu
      await ApiAuthService.updateProfile({ profilePicture: null });

      setAvatar(null);
      setIsEncryptedAvatar(false);
      if (typeof window !== "undefined") {
        localStorage.removeItem("audit_pro_avatar");
      }
      onUpdateProfile?.({ avatar: null });
      toast.success("Foto profil berhasil dihapus");
    } catch (err) {
      console.warn("Gagal menghapus foto profil:", err);
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus foto profil dari database."
      );
    }
  };

  // Handle saving edited admin name
  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      toast.error("Nama admin tidak boleh kosong");
      return;
    }

    try {
      // Simpan nama baru ke database server terlebih dahulu
      await ApiAuthService.updateProfile({ name: trimmed });

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
    } catch (err) {
      console.warn("Gagal menyimpan nama profil:", err);
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan nama profil ke database."
      );
    }
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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  Profil Pengguna
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  AES-256 Encrypted
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Informasi akun dan penugasan akses sistem
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Baris Atas */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
            {/* 1: Foto Profil */}
            <div className="sm:col-span-5 relative rounded-2xl bg-slate-50 border border-slate-200/90 overflow-hidden flex flex-col items-center justify-center min-h-[175px] sm:min-h-[195px] shadow-2xs group">
              {avatar ? (
                <>
                  <DecryptedImage
                    src={avatar}
                    alt={currentName || "Foto Profil"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-medium flex items-center gap-1 shadow-xs pointer-events-none">
                    <Lock className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Terenkripsi</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#193f53] text-white p-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-2xl shadow-inner mb-1.5">
                    {getInitials(currentName) ? (
                      <span>{getInitials(currentName)}</span>
                    ) : (
                      <User className="w-8 h-8 stroke-[1.8] text-white/80" />
                    )}
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

            {/* Kolom Kanan: Nama, Email, Hak Akses */}
            <div className="sm:col-span-7 flex flex-col justify-between gap-2.5">
              {/* Nama Admin */}
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
                    {currentName || "-"}
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

              {/* Email */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-center min-h-[58px]">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  Email
                </span>
                <p className="text-xs sm:text-sm font-medium text-slate-800 truncate">
                  {email || "-"}
                </p>
              </div>

              {/* Hak Akses */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/90 flex items-center justify-between min-h-[58px]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Hak Akses
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-[#193f53]">
                    {role || "Super Admin"}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Aktif
                </span>
              </div>
            </div>
          </div>

          {/* Masa Periode Paket Langganan (Eksklusif Khusus Super Admin - Tidak Ditampilkan ke Teknis/Staff/Admin) */}
          {role === "Super Admin" && purchasedPlan && (
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-sky-50/50 to-blue-50/30 border border-sky-200/90 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                    ⚡
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Paket Langganan Super Admin
                    </span>
                    <span className="text-xs sm:text-sm font-extrabold text-[#193f53]">
                      {purchasedPlan}
                    </span>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold tracking-wide">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Aktif &amp; Terverifikasi
                </span>
              </div>

              {/* Masa Periode Paket: Dari Kapan sampai Kapan */}
              <div className="p-2.5 sm:p-3 rounded-xl bg-white border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <Calendar className="w-3 h-3 text-sky-600" />
                    <span>Masa Mulai</span>
                  </div>
                  <p className="font-bold text-slate-800 text-xs sm:text-[13px]">
                    {formatDateIndo(subscriptionStartDate)}
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    <Calendar className="w-3 h-3 text-amber-600" />
                    <span>Masa Berakhir</span>
                  </div>
                  <p className="font-bold text-slate-800 text-xs sm:text-[13px]">
                    {formatDateIndo(subscriptionEndDate)}
                  </p>
                </div>
              </div>

              {/* Sisa Masa Aktif */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5 px-1">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  <span>Sisa Waktu Aktif:</span>
                  <strong className="text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {daysRemaining} Hari
                  </strong>
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  SparkPay Gateway
                </span>
              </div>
            </div>
          )}

          {/* Baris Bawah */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center pt-2">
            {/* Edit untuk Ganti Foto Profil */}
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

            {/* Tombol Tutup Profil */}
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

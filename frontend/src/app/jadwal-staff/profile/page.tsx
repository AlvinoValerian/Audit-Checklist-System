"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Store as StoreIcon,
  MapPin,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  LogOut,
  Smartphone,
  Maximize2,
  RotateCcw,
  Camera,
  Loader2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { AuthService, AuthUser } from "@/lib/auth";
import StaffBottomNav from "../components/StaffBottomNav";
import DecryptedImage from "@/components/DecryptedImage";
import { optimizeAndResizeImage, encryptImageData } from "@/lib/image-crypto";

function ProfileContent() {
  const router = useRouter();

  const [isFullscreenMode, setIsFullscreenMode] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [logoutNotice, setLogoutNotice] = useState<{ show: boolean; message: string }>({
    show: false,
    message: "",
  });

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);

    // Ambil data profil staf terbaru langsung dari database PostgreSQL secara realtime
    const fetchLatestProfile = async () => {
      try {
        const token = AuthService.getToken();
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        let res = await fetch("/api/auth/me", { headers });
        if (!res.ok) {
          res = await fetch("http://127.0.0.1:5000/api/auth/me", { headers });
        }
        if (res.ok) {
          const json = await res.json();
          if (json.status === "success" && json.data?.user) {
            setCurrentUser(json.data.user);
            AuthService.setCurrentUser(json.data.user);
          }
        }
      } catch (e) {
        console.warn("Gagal memuat profil terbaru:", e);
      }
    };

    fetchLatestProfile();
  }, []);

  const handleLogout = () => {
    setLogoutNotice({
      show: true,
      message: "Anda telah berhasil keluar dari akun. Mengalihkan...",
    });
    AuthService.logout();
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      } else {
        router.push("/login");
      }
    }, 1100);
  };

  // Handler Ganti Foto Profil: Resize -> Encrypt AES-GCM -> Simpan ke Database
  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingPhoto(true);
      toast.loading("Memproses & mengoptimasi foto profil...", { id: "profile-upload" });

      // 1. Resize dan kompresi foto proporsional (max 512x512)
      const optimizedBase64 = await optimizeAndResizeImage(file, 512, 512, 0.85);

      // 2. Enkripsi foto profil menggunakan AES-256-GCM
      const encryptedPhoto = await encryptImageData(optimizedBase64);

      // 3. Simpan ke database PostgreSQL via endpoint API
      const token = AuthService.getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (currentUser?.id) headers["x-user-id"] = currentUser.id;
      if (currentUser?.email) headers["x-user-email"] = currentUser.email;

      let res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          profilePicture: encryptedPhoto,
        }),
      });

      if (!res.ok) {
        res = await fetch("http://127.0.0.1:5000/api/auth/profile", {
          method: "PUT",
          headers,
          body: JSON.stringify({
            profilePicture: encryptedPhoto,
          }),
        });
      }

      if (res.ok) {
        const json = await res.json();
        const updatedUser = {
          ...currentUser!,
          profilePicture: encryptedPhoto,
        };
        setCurrentUser(updatedUser);
        AuthService.setCurrentUser(updatedUser);
        toast.success("Foto profil berhasil diperbarui & dienkripsi dengan aman!", { id: "profile-upload" });
      } else {
        const errJson = await res.json().catch(() => null);
        toast.error(errJson?.message || "Gagal memperbarui foto profil ke server.", { id: "profile-upload" });
      }
    } catch (err: any) {
      console.error("Error updating profile photo:", err);
      toast.error("Terjadi kesalahan saat memproses foto profil.", { id: "profile-upload" });
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = "";
    }
  };

  // Data murni dari akun & database PostgreSQL (Hapus semua data statis)
  const displayName = currentUser?.fullName || "Memuat...";
  const displayRole =
    currentUser?.position ||
    (currentUser?.role === "Staff" ? "Auditor Lapangan" : currentUser?.role) ||
    "Auditor Lapangan";
  const displayEmail = currentUser?.email || "-";
  const displayPhone = currentUser?.phone && currentUser.phone !== "-" ? currentUser.phone : "-";
  const displayStore = currentUser?.storeName || "Belum Ditugaskan";
  const displayStoreCode = currentUser?.storeCode || "-";
  const displayAddress =
    currentUser?.storeAddress && currentUser.storeAddress !== "-"
      ? currentUser.storeAddress
      : "Alamat gerai belum diatur di database";
  const displayWorkspace = currentUser?.workspaceName || "Mie Gacoan";

  const getInitials = (name: string) => {
    if (!name || name === "Memuat...") return "ST";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[#f4f6fc] sm:relative sm:inset-auto sm:min-h-screen sm:bg-[#f3f4fa] sm:flex sm:items-center sm:justify-center sm:py-6 sm:px-4 font-sans antialiased">
      <Toaster position="top-center" richColors />

      {/* Floating Mode Toggle untuk Layar Laptop / Desktop */}
      <div className="hidden sm:flex items-center gap-2 mb-3 bg-slate-800/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 shadow-lg z-30">
        <Smartphone className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-medium text-slate-300">
          Profil Pengguna (Tampilan Mobile HP)
        </span>
        <button
          onClick={() => setIsFullscreenMode(!isFullscreenMode)}
          className="ml-2 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2.5 py-1 rounded-full transition-all flex items-center gap-1 cursor-pointer"
        >
          <Maximize2 className="w-3 h-3" />
          {isFullscreenMode ? "Bingkai HP" : "Layar Penuh"}
        </button>
      </div>

      {/* Smartphone Device Frame Container */}
      <div
        className={`w-full h-full flex flex-col bg-[#f4f6fc] text-slate-900 transition-all duration-300 relative ${
          isFullscreenMode
            ? "max-w-md sm:rounded-none sm:shadow-none sm:h-screen"
            : "sm:h-[844px] sm:max-h-[92vh] sm:max-w-[420px] sm:rounded-[42px] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] sm:border-[9px] sm:border-slate-800 sm:ring-1 sm:ring-white/10 overflow-hidden"
        }`}
      >
        {/* Dynamic Island / Speaker Pill on Desktop Frame */}
        <div className="hidden sm:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-40 pointer-events-none" />

        {/* NOTIFIKASI LOGOUT DI DALAM LAYAR HP */}
        <div
          className={`absolute top-3 inset-x-3 z-50 transition-all duration-300 ease-out transform pointer-events-none ${
            logoutNotice.show
              ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
              : "-translate-y-16 opacity-0 scale-95"
          }`}
        >
          <div className="bg-white/95 backdrop-blur-md border border-rose-200/90 rounded-2xl p-3.5 shadow-[0_10px_30px_-5px_rgba(225,29,72,0.25)] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-600">
              <LogOut className="w-4 h-4 stroke-[2.3]" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                Berhasil Logout
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                {logoutNotice.message}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Top Header Bar (Profil Pengguna) */}
        <div className="px-6 pt-3.5 sm:pt-4 pb-3 bg-transparent flex items-center justify-between shrink-0">
          <h1 className="text-lg sm:text-[20px] font-bold text-slate-900 tracking-tight">
            Profil Pengguna
          </h1>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-1 pb-6 space-y-4">
          {/* 3. User Identity Card (Nama + Posisi Auditor Lapangan sesuai database) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex items-center gap-4">
            {/* Avatar Lingkaran dengan Fitur Ganti Foto (Resize & AES-GCM Encrypted) */}
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full bg-[#eff4ff] text-[#193f53] flex items-center justify-center font-bold text-lg border border-blue-100/80 shadow-2xs overflow-hidden relative">
                {currentUser?.profilePicture ? (
                  <DecryptedImage
                    src={currentUser.profilePicture}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials(displayName)}</span>
                )}
              </div>

              {/* Status Online Dot */}
              <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white absolute top-0 right-0 shadow-2xs" />

              {/* Tombol Kamera Ganti Foto Profil */}
              <label
                htmlFor="profile-photo-upload"
                className={`w-6 h-6 bg-[#193f53] hover:bg-[#122f3e] text-white rounded-full border-2 border-white absolute -bottom-1 -right-1 flex items-center justify-center shadow-md cursor-pointer transition-transform active:scale-90 ${
                  isUploadingPhoto ? "opacity-75 pointer-events-none" : ""
                }`}
                title="Ganti Foto Profil"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                ) : (
                  <Camera className="w-3 h-3" />
                )}
              </label>
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingPhoto}
                onChange={handlePhotoChange}
              />
            </div>

            {/* Nama & Posisi Auditor Lapangan */}
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-[17px] font-bold text-slate-900 leading-snug truncate">
                {displayName}
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5 truncate">
                {displayRole}
              </p>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                Ketuk ikon kamera untuk ubah foto
              </p>
            </div>
          </div>

          {/* 4. Card Outlet Tugas & Alamat Lengkap (Tampil Penuh, Tidak Kepotong) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#193f53] flex items-center justify-center shrink-0">
                  <StoreIcon className="w-4 h-4 stroke-[2]" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider leading-none">
                    Outlet Penugasan
                  </p>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug mt-0.5">
                    {displayStore}
                  </h3>
                </div>
              </div>
              {displayStoreCode !== "-" && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  {displayStoreCode}
                </span>
              )}
            </div>

            {/* Alamat Lengkap Outlet di Bawahnya (Tanpa Terpotong) */}
            <div className="p-3 bg-[#f8fafc] rounded-2xl border border-slate-100/90 flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-[#193f53] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-medium text-slate-400 leading-none">
                  Alamat Lengkap Gerai
                </p>
                <p className="text-xs font-medium text-slate-700 leading-relaxed mt-1 break-words">
                  {displayAddress}
                </p>
              </div>
            </div>
          </div>

          {/* 5. Card Informasi Kontak & Penugasan Staf (Realtime Dari Database) */}
          <div className="bg-white rounded-3xl p-5 border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-3.5 divide-y divide-slate-100">
            {/* Email Staf */}
            <div className="flex items-center justify-between pt-0 text-xs">
              <div className="flex items-center gap-2.5 text-slate-500">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium text-[11px]">Email Akun</span>
              </div>
              <span className="font-semibold text-slate-800 text-xs truncate max-w-[190px]">
                {displayEmail}
              </span>
            </div>

            {/* Nomor Telepon */}
            <div className="flex items-center justify-between pt-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-500">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium text-[11px]">Nomor Telepon</span>
              </div>
              <span className="font-semibold text-slate-800 text-xs">
                {displayPhone}
              </span>
            </div>

            {/* Perusahaan / Workspace */}
            <div className="flex items-center justify-between pt-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-500">
                <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium text-[11px]">Perusahaan / Brand</span>
              </div>
              <span className="font-semibold text-slate-800 text-xs truncate max-w-[170px]">
                {displayWorkspace}
              </span>
            </div>

            {/* Status Penugasan */}
            <div className="flex items-center justify-between pt-3.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-500">
                <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-medium text-[11px]">Status Akun</span>
              </div>
              <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-full text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Aktif Bertugas</span>
              </div>
            </div>
          </div>

          {/* 6. Tombol Keluar dari Akun */}
          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full py-3.5 px-4 bg-[#fff1f0] hover:bg-[#ffe4e1] border border-[#ffdcd9] text-[#c2410c] font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-2xs"
            >
              <LogOut className="w-4 h-4 stroke-[2.2]" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </div>

        {/* 7. Bottom Navigation Bar (Checklist, Riwayat, Profile Aktif) */}
        <StaffBottomNav activeTab="profile" showIssues={false} />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f3f4fa] flex items-center justify-center text-slate-800">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <RotateCcw className="w-4 h-4 animate-spin text-[#193f53]" />
            <span>Memuat profil pengguna...</span>
          </div>
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}

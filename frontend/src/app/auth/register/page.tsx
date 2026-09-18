"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Monitor,
  User,
  Mail,
  Phone,
  Building2,
  Lock,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Toaster, toast } from "sonner";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Silakan masukkan Nama Lengkap Anda.");
      return;
    }
    if (!companyEmail.trim()) {
      toast.error("Silakan masukkan Email Perusahaan.");
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error("Silakan masukkan Nomor Telepon.");
      return;
    }
    if (!companyName.trim()) {
      toast.error("Silakan masukkan Nama Perusahaan.");
      return;
    }
    if (!password) {
      toast.error("Silakan masukkan Kata Sandi.");
      return;
    }
    if (password.length < 8) {
      toast.error("Kata Sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Konfirmasi Kata Sandi tidak cocok.");
      return;
    }
    if (!agreeTerms) {
      toast.error(
        "Anda harus menyetujui Syarat & Ketentuan serta Kebijakan Privasi."
      );
      return;
    }

    setIsLoading(true);

    try {
      // Simulate registration request
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success("Pendaftaran berhasil! Silakan login ke akun Anda.");
    } catch {
      toast.error("Terjadi kesalahan saat mendaftar. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-white">
      <Toaster position="top-right" richColors />

      {/* =========================================================================
          LEFT SIDE: Dark Slate/Teal Presentation & Branding Panel
         ========================================================================= */}
      <section className="w-full lg:w-1/2 bg-[#193f53] text-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 min-h-[440px] lg:min-h-screen relative select-none">
        {/* Top: Logo & Brand Name */}
        <div className="flex items-center gap-3.5 z-10">
          <div className="w-10 h-10 rounded-xl border border-white/30 flex items-center justify-center bg-white/[0.04] shadow-xs">
            <Monitor className="w-5 h-5 text-white stroke-[2.2]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Audit Pro
          </span>
        </div>

        {/* Center: Presentation Card */}
        <div className="my-auto py-10 lg:py-0 z-10 max-w-lg w-full">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xs p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-medium text-white/90 mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Platform Audit Jaringan Ritel</span>
            </div>

            {/* Headline */}
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              Sistem Monitoring &amp;
              <br />
              Audit Toko Terintegrasi
            </h1>

            {/* Description */}
            <p className="mt-3.5 text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-sm">
              Tingkatkan efisiensi operasional dan akurasi data audit jaringan
              toko Anda dalam satu platform terpusat.
            </p>

            {/* Subtle background wireframe decoration */}
            <div className="absolute right-[-20px] top-6 w-32 h-10 rounded-lg bg-white/[0.03] pointer-events-none hidden sm:block" />
            <div className="absolute right-[-10px] bottom-6 w-44 h-16 rounded-lg bg-white/[0.02] pointer-events-none hidden sm:block" />
          </div>
        </div>

        {/* Bottom: Copyright Footer */}
        <div className="z-10 pt-4">
          <p className="text-xs text-white/45 font-normal tracking-wide">
            © 2026 Audit Pro Enterprise Monitor. All rights reserved.
          </p>
        </div>
      </section>

      {/* =========================================================================
          RIGHT SIDE: Pure White Registration Form Panel
         ========================================================================= */}
      <main className="w-full lg:w-1/2 flex-1 bg-white flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-[490px] mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-7">
            <h2 className="text-2xl sm:text-[28px] font-bold text-slate-900 tracking-tight">
              Daftar Akun Baru
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
              Lengkapi formulir untuk mulai mengelola audit toko Anda.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nama Lengkap */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center h-11 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 stroke-[1.8]" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  autoComplete="name"
                  required
                  className="w-full h-full pr-4 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* Row 2: Email Perusahaan & Nomor Telepon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="companyEmail"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email Perusahaan <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center h-11 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                  <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <input
                    id="companyEmail"
                    type="email"
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    placeholder="nama@perusahaan.com"
                    autoComplete="email"
                    required
                    className="w-full h-full pr-4 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Nomor Telepon <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center h-11 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                  <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0812-xxxx-xxxx"
                    autoComplete="tel"
                    required
                    className="w-full h-full pr-4 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* Nama Perusahaan */}
            <div>
              <label
                htmlFor="companyName"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nama Perusahaan <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center h-11 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4 stroke-[1.8]" />
                </div>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="PT Retail Pratama Jaya"
                  autoComplete="organization"
                  required
                  className="w-full h-full pr-4 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* Row 4: Kata Sandi & Konfirmasi Kata Sandi */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Kata Sandi <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center h-11 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                  <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="w-full h-full pr-10 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"
                    }
                    className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <Eye className="w-4 h-4 stroke-[1.8]" />
                    ) : (
                      <EyeOff className="w-4 h-4 stroke-[1.8]" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Konfirmasi Kata Sandi <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center h-11 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                  <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                    className="w-full h-full pr-10 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword
                        ? "Sembunyikan konfirmasi sandi"
                        : "Tampilkan konfirmasi sandi"
                    }
                    className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? (
                      <Eye className="w-4 h-4 stroke-[1.8]" />
                    ) : (
                      <EyeOff className="w-4 h-4 stroke-[1.8]" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Checkbox Terms */}
            <div className="pt-1.5">
              <label
                htmlFor="agreeTerms"
                className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none leading-relaxed"
              >
                <input
                  id="agreeTerms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-[#193f53] accent-[#193f53] focus:ring-[#193f53]/20 cursor-pointer shrink-0"
                />
                <span>
                  Saya menyetujui{" "}
                  <a
                    href="#terms"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Syarat &amp; Ketentuan
                  </a>{" "}
                  serta{" "}
                  <a
                    href="#privacy"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Kebijakan Privasi
                  </a>{" "}
                  Audit Pro
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-5 h-11 bg-[#193f53] hover:bg-[#143343] active:bg-[#0f2835] text-white font-medium text-sm rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 active:scale-[0.99]"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Daftar Sekarang</span>
            </button>
          </form>

          {/* Bottom Login Link */}
          <div className="mt-6 text-center text-xs text-slate-500">
            <span>Sudah memiliki akun? </span>
            <Link
              href="/auth/login"
              className="text-blue-600 hover:underline font-semibold transition-colors"
            >
              Masuk sekarang
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

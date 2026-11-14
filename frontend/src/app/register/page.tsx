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
  ShieldCheck,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { ApiAuthService } from "@/services/auth.service";

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
  const [selectedPlan, setSelectedPlan] = useState<string>("standard");
  const [isYearlyBilling, setIsYearlyBilling] = useState<boolean>(false);

  // Deteksi paket langganan dan siklus penagihan (Bulanan vs Tahunan) dari URL
  React.useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const planParam = params.get("plan");
        const billingParam = params.get("billing")?.toLowerCase();
        const isYear =
          billingParam === "yearly" ||
          billingParam === "annual" ||
          billingParam === "tahunan";

        setIsYearlyBilling(isYear);
        localStorage.setItem("selected_billing_cycle", isYear ? "yearly" : "monthly");

        if (planParam && ["lite", "standard", "pro"].includes(planParam.toLowerCase())) {
          const planNorm = planParam.toLowerCase();
          setSelectedPlan(planNorm);
          localStorage.setItem("selected_checkout_plan", planNorm);
          localStorage.setItem("show_payment_modal_on_workspace", "true");
          localStorage.setItem("pending_superadmin_payment", "true");
        } else {
          const saved = localStorage.getItem("selected_checkout_plan");
          if (saved) setSelectedPlan(saved);
        }
      }
    } catch {}
  }, []);

  // 1. Handler Nama Lengkap: Hanya huruf dan spasi (angka & simbol langsung diblokir)
  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z\s]/g, "");
    setFullName(sanitized);
  };

  // 2. Handler Nomor Telepon: Hanya angka (karakter lain langsung diblokir, maks 15 digit)
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/\D/g, "").slice(0, 15);
    setPhoneNumber(sanitized);
  };

  // 3. Handler Nama Perusahaan: Hanya huruf, angka, dan spasi (simbol diblokir)
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9\s]/g, "");
    setCompanyName(sanitized);
  };

  // 4. Handler Password: Hanya huruf dan angka (simbol langsung diblokir)
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
    setPassword(sanitized);
  };

  // 5. Handler Konfirmasi Password: Hanya huruf dan angka
  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
    setConfirmPassword(sanitized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validasi Nama Lengkap
    const cleanName = fullName.trim();
    if (!cleanName) {
      toast.error("Silakan masukkan Nama Lengkap Anda.");
      return;
    }
    if (!/^[a-zA-Z\s]+$/.test(cleanName)) {
      toast.error("Nama Lengkap hanya boleh berisi huruf dan spasi (tanpa angka dan simbol).");
      return;
    }

    // 2. Validasi Email Perusahaan
    const cleanEmail = companyEmail.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Silakan masukkan Email Perusahaan.");
      return;
    }
    // Standar format email: memiliki nama, @, domain, dan ekstensi TLD (.com, .id, .co.id, dll)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error(
        "Format email tidak valid. Pastikan menggunakan domain yang valid (contoh: nama@perusahaan.com atau nama@gmail.com)."
      );
      return;
    }

    // 3. Validasi Nomor Telepon
    if (!phoneNumber) {
      toast.error("Silakan masukkan Nomor Telepon.");
      return;
    }
    if (!/^\d+$/.test(phoneNumber)) {
      toast.error("Nomor Telepon hanya boleh berisi angka.");
      return;
    }
    if (phoneNumber.length < 10 || phoneNumber.length > 15) {
      toast.error("Nomor Telepon harus terdiri dari 10 hingga 15 digit angka.");
      return;
    }

    // 4. Validasi Nama Perusahaan
    const cleanCompany = companyName.trim();
    if (!cleanCompany) {
      toast.error("Silakan masukkan Nama Perusahaan.");
      return;
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(cleanCompany)) {
      toast.error("Nama Perusahaan tidak boleh mengandung simbol.");
      return;
    }

    // 5. Validasi Kata Sandi
    if (!password) {
      toast.error("Silakan masukkan Kata Sandi.");
      return;
    }
    if (password.length < 8) {
      toast.error("Kata Sandi minimal 8 karakter.");
      return;
    }
    if (/[^a-zA-Z0-9]/.test(password)) {
      toast.error("Kata Sandi tidak boleh menggunakan simbol, hanya huruf dan angka.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error("Kata Sandi harus memiliki minimal 1 huruf kapital (huruf besar).");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error("Kata Sandi harus merupakan kombinasi huruf dan angka (keduanya wajib ada).");
      return;
    }

    // 6. Validasi Konfirmasi Sandi
    if (password !== confirmPassword) {
      toast.error("Konfirmasi Kata Sandi tidak cocok.");
      return;
    }

    // 7. Validasi Syarat & Ketentuan
    if (!agreeTerms) {
      toast.error(
        "Anda harus menyetujui Syarat & Ketentuan serta Kebijakan Privasi."
      );
      return;
    }

    setIsLoading(true);

    try {
      const result = await ApiAuthService.register({
        fullName: cleanName,
        companyEmail: cleanEmail,
        phoneNumber,
        companyName: cleanCompany,
        password,
      });

      toast.success(
        result.message || "Pendaftaran berhasil! Akun Super Admin Anda siap digunakan."
      );

      // Simpan preferensi paket langganan dan picu modal pembayaran di workspace
      try {
        localStorage.setItem("selected_checkout_plan", selectedPlan);
        localStorage.setItem("selected_billing_cycle", isYearlyBilling ? "yearly" : "monthly");
        localStorage.setItem("show_payment_modal_on_workspace", "true");
        localStorage.setItem("pending_superadmin_payment", "true");
        localStorage.removeItem("superadmin_paid");
        if (cleanEmail) {
          localStorage.removeItem(`superadmin_paid_${cleanEmail}`);
        }
      } catch {}

      setTimeout(() => {
        window.location.href = "/workspace";
      }, 1000);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mendaftar. Silakan coba lagi.";
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen w-full flex flex-col lg:flex-row font-sans bg-white overflow-y-auto lg:overflow-hidden select-none">
      <Toaster position="top-right" richColors />

      {/* =========================================================================
          LEFT SIDE: Presentation & Branding Panel
         ========================================================================= */}
      <section className="w-full lg:w-1/2 bg-[#193f53] text-white flex flex-col justify-between p-8 sm:p-10 lg:p-12 xl:p-16 h-full relative shrink-0">
        {/* Top: Logo & Brand Name */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center bg-white/[0.06] shadow-xs">
            <Monitor className="w-4.5 h-4.5 text-white stroke-[2.2]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Audit Pro
          </span>
        </div>

        {/* Center: Presentation Card */}
        <div className="my-auto py-8 lg:py-0 z-10 max-w-md w-full">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xs p-6 sm:p-7 relative overflow-hidden shadow-2xl">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[11px] font-medium text-white/90 mb-4">
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
            <p className="mt-3 text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
              Tingkatkan efisiensi operasional dan akurasi data audit jaringan toko Anda dalam satu platform terpusat.
            </p>
          </div>
        </div>

        {/* Bottom: Copyright Footer */}
        <div className="z-10 pt-4">
          <p className="text-xs text-white/40 font-normal tracking-wide">
            © 2026 Audit Pro Enterprise Monitor. All rights reserved.
          </p>
        </div>
      </section>

      {/* =========================================================================
          RIGHT SIDE: Clean, Normal-Sized Form (Comfortable & Validated)
         ========================================================================= */}
      <main className="w-full lg:w-1/2 flex-1 bg-white flex items-center justify-center p-6 sm:p-8 lg:p-10 xl:p-12 h-full overflow-y-auto lg:overflow-hidden">
        <div className="w-full max-w-[460px] mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
              <span>Registrasi Akun Super Admin</span>
            </div>
            <h2 className="text-2xl sm:text-[26px] font-bold text-slate-900 tracking-tight">
              Daftar Akun Baru
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Lengkapi formulir untuk membuat akun Super Admin dan workspace perusahaan Anda.
            </p>
          </div>

          {/* Badge Paket yang Dipilih dari Landing Page */}
          {selectedPlan && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 border border-sky-200/80 flex items-center justify-between text-xs animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  ⚡
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">
                    Paket Langganan Dipilih ({isYearlyBilling ? "Tahunan — Hemat 20%" : "Bulanan"})
                  </span>
                  <span className="font-extrabold text-[#193f53] text-xs sm:text-sm">
                    {isYearlyBilling ? (
                      selectedPlan === "lite"
                        ? "Lite Plan (Rp 480.000 / tahun)"
                        : selectedPlan === "pro"
                        ? "Pro Plan (Rp 3.480.000 / tahun)"
                        : "Standard Plan (Rp 1.440.000 / tahun)"
                    ) : (
                      selectedPlan === "lite"
                        ? "Lite Plan (Rp 50.000 / bulan)"
                        : selectedPlan === "pro"
                        ? "Pro Plan (Rp 360.000 / bulan)"
                        : "Standard Plan (Rp 150.000 / bulan)"
                    )}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-sky-700 bg-white/90 border border-sky-200 px-2 py-1 rounded-full shadow-2xs">
                SparkPay Gateway
              </span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            {/* 1. Nama Lengkap */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nama Lengkap <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center h-10 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4 stroke-[1.8]" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={handleFullNameChange}
                  placeholder="Hanya huruf (contoh: Budi Santoso)"
                  autoComplete="name"
                  required
                  suppressHydrationWarning
                  className="w-full h-full pr-4 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* 2. Email Perusahaan & Nomor Telepon (2 Kolom) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div>
                <label
                  htmlFor="companyEmail"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Email Perusahaan <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center h-10 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
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
                    suppressHydrationWarning
                    className="w-full h-full pr-3 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
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
                <div className="relative flex items-center h-10 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                  <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="0812xxxxxxxx"
                    autoComplete="tel"
                    required
                    suppressHydrationWarning
                    className="w-full h-full pr-3 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                  />
                </div>
              </div>
            </div>

            {/* 3. Nama Perusahaan */}
            <div>
              <label
                htmlFor="companyName"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nama Perusahaan <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center h-10 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4 stroke-[1.8]" />
                </div>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={handleCompanyNameChange}
                  placeholder="Huruf & angka tanpa simbol (PT Retail Jaya)"
                  autoComplete="organization"
                  required
                  suppressHydrationWarning
                  className="w-full h-full pr-4 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* 4. Kata Sandi & Konfirmasi Kata Sandi (2 Kolom) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Kata Sandi <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center h-10 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                  <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder="Min. 8 (Huruf & Angka)"
                    autoComplete="new-password"
                    required
                    suppressHydrationWarning
                    className="w-full h-full pr-9 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                    suppressHydrationWarning
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
                  Konfirmasi Sandi <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center h-10 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                  <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 stroke-[1.8]" />
                  </div>
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    placeholder="Ulangi sandi"
                    autoComplete="new-password"
                    required
                    suppressHydrationWarning
                    className="w-full h-full pr-9 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Sembunyikan konfirmasi sandi" : "Tampilkan konfirmasi sandi"}
                    suppressHydrationWarning
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
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

            {/* Helper Hint untuk Password */}
            <p className="text-[11px] text-slate-500 -mt-1 leading-tight">
              Sandi wajib kombinasi <strong>huruf &amp; angka</strong>, min. 1 huruf <strong>kapital</strong>, tanpa simbol.
            </p>

            {/* Checkbox Terms */}
            <div className="pt-0.5">
              <label
                htmlFor="agreeTerms"
                className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer select-none leading-relaxed"
              >
                <input
                  id="agreeTerms"
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  suppressHydrationWarning
                  className="w-4 h-4 rounded border-slate-300 text-[#193f53] accent-[#193f53] focus:ring-[#193f53]/20 cursor-pointer shrink-0"
                />
                <span>
                  Saya menyetujui{" "}
                  <a href="#terms" className="text-blue-600 hover:underline font-medium">
                    Syarat &amp; Ketentuan
                  </a>{" "}
                  serta{" "}
                  <a href="#privacy" className="text-blue-600 hover:underline font-medium">
                    Kebijakan Privasi
                  </a>
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              suppressHydrationWarning
              className="w-full mt-3.5 h-10.5 bg-[#193f53] hover:bg-[#143343] active:bg-[#0f2835] text-white font-semibold text-sm rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 active:scale-[0.99]"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Daftar Sekarang</span>
            </button>
          </form>

          {/* Bottom Login Link */}
          <div className="mt-3.5 text-center text-xs text-slate-500">
            <span>Sudah memiliki akun? </span>
            <Link
              href="/login"
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

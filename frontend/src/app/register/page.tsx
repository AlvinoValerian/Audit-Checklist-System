"use client";

import React, { useEffect, useRef, useState } from "react";
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
  FileText,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { ApiAuthService } from "@/services/auth.service";
import { PasswordStrength } from "@/components/ui/password-strength";
import Modal from "@/components/ui/Modal";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const passwordSectionRef = useRef<HTMLDivElement | null>(null);
  const isPointerDownRef = useRef(false);
  const pendingCloseRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  // Tunda penutupan indikator password saat mouse/sentuhan sedang ditekan agar elemen di bawahnya (checkbox, tombol) tidak bergeser sebelum klik selesai
  useEffect(() => {
    const handlePointerDown = () => {
      isPointerDownRef.current = true;
    };

    const handlePointerRelease = () => {
      isPointerDownRef.current = false;
      if (pendingCloseRef.current) {
        pendingCloseRef.current = false;
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = window.setTimeout(() => {
          closeTimerRef.current = null;
          if (!passwordSectionRef.current?.contains(document.activeElement)) {
            setIsPasswordFocused(false);
          }
        }, 60);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("pointerup", handlePointerRelease, true);
    window.addEventListener("pointercancel", handlePointerRelease, true);
    window.addEventListener("blur", handlePointerRelease);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("pointerup", handlePointerRelease, true);
      window.removeEventListener("pointercancel", handlePointerRelease, true);
      window.removeEventListener("blur", handlePointerRelease);
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);
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
        plan: selectedPlan,
      });

      toast.success(
        result.message || "Pendaftaran berhasil! Akun Super Admin Anda siap digunakan."
      );

      // Simpan preferensi paket langganan dan picu modal pembayaran di workspace (label paket BELUM aktif sebelum lunas)
      try {
        localStorage.setItem("selected_checkout_plan", selectedPlan);
        localStorage.setItem("selected_billing_cycle", isYearlyBilling ? "yearly" : "monthly");
        localStorage.setItem("show_payment_modal_on_workspace", "true");
        localStorage.setItem("pending_superadmin_payment", "true");
        localStorage.removeItem("superadmin_paid");
        localStorage.removeItem("active_subscription_plan");
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
      <section className="w-full lg:w-1/2 bg-[#193f53] text-white flex flex-col justify-between p-6 sm:p-10 lg:p-16 xl:p-20 lg:h-full relative shrink-0">
        {/* Top: Logo & Brand Name */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center bg-white/[0.06]">
            <Monitor className="w-4.5 h-4.5 text-white stroke-[2.2]" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Audit Pro
          </span>
        </div>

        {/* Center: Main Headline & Description */}
        <div className="my-auto py-7 sm:py-10 lg:py-0 z-10 max-w-xl">
          <h1 className="text-2xl sm:text-4xl xl:text-[42px] font-bold text-white tracking-tight leading-[1.2]">
            Standarisasi Operasional &amp;
            <br />
            Audit Checklist
          </h1>
          <p className="mt-3 sm:mt-5 text-xs sm:text-base text-slate-300 font-normal leading-relaxed max-w-md">
            Instrumen pelaksanaan inspeksi berkala, dokumentasi bukti fisik, dan
            penilaian kepatuhan SOP gerai.
          </p>
        </div>

        {/* Bottom: Copyright Footer */}
        <div className="z-10 pt-2 lg:pt-6">
          <p className="text-xs text-white/45 font-normal tracking-wide">
            © 2026 Audit Pro. All rights reserved.
          </p>
        </div>
      </section>

      {/* =========================================================================
          RIGHT SIDE: Clean, Normal-Sized Form (Comfortable & Validated)
         ========================================================================= */}
      <main className="w-full lg:w-1/2 flex-1 bg-white flex flex-col p-6 sm:p-8 lg:p-10 xl:p-12 lg:h-full overflow-y-auto">
        <div className="w-full max-w-[460px] mx-auto my-auto py-2">
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
            <div
              ref={passwordSectionRef}
              onFocus={() => {
                pendingCloseRef.current = false;
                if (closeTimerRef.current !== null) {
                  window.clearTimeout(closeTimerRef.current);
                  closeTimerRef.current = null;
                }
                setIsPasswordFocused(true);
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  if (isPointerDownRef.current) {
                    pendingCloseRef.current = true;
                  } else {
                    setIsPasswordFocused(false);
                  }
                }
              }}
            >
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

              {/* Indikator Kekuatan & Syarat Kata Sandi Real-Time (muncul saat fokus di field password) */}
              <AnimatePresence initial={false}>
                {isPasswordFocused && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <PasswordStrength value={password} confirmValue={confirmPassword} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Checkbox Terms */}
            <div className="pt-0.5 flex items-center gap-2.5 text-xs text-slate-600 select-none leading-relaxed">
              <input
                id="agreeTerms"
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                suppressHydrationWarning
                className="w-4 h-4 rounded border-slate-300 text-[#193f53] accent-[#193f53] focus:ring-[#193f53]/20 cursor-pointer shrink-0"
              />
              <span>
                <label htmlFor="agreeTerms" className="cursor-pointer">
                  Saya menyetujui{" "}
                </label>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setLegalModal("terms")}
                  className="text-[#193f53] hover:underline font-semibold cursor-pointer"
                >
                  Syarat &amp; Ketentuan
                </button>
                <label htmlFor="agreeTerms" className="cursor-pointer">
                  {" "}serta{" "}
                </label>
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setLegalModal("privacy")}
                  className="text-[#193f53] hover:underline font-semibold cursor-pointer"
                >
                  Kebijakan Privasi
                </button>
              </span>
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
          <div className="mt-4 text-center text-xs text-slate-500">
            <span>Sudah memiliki akun? </span>
            <Link
              href="/login"
              className="font-bold text-slate-800 hover:text-[#193f53] transition-colors"
            >
              Masuk sekarang
            </Link>
          </div>
        </div>
      </main>

      {/* Modal Syarat & Ketentuan / Kebijakan Privasi */}
      <Modal
        isOpen={legalModal !== null}
        onClose={() => setLegalModal(null)}
        title={
          legalModal === "terms" ? "Syarat & Ketentuan" : "Kebijakan Privasi"
        }
        subtitle="Audit Pro — Standarisasi Operasional & Audit Checklist"
        icon={
          legalModal === "terms" ? (
            <FileText className="w-5 h-5 text-[#193f53]" />
          ) : (
            <ShieldCheck className="w-5 h-5 text-[#193f53]" />
          )
        }
        maxWidth="max-w-lg"
      >
        {legalModal === "terms" ? (
          <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed select-text">
            <p>
              Dengan mendaftarkan akun Super Admin pada <strong>Audit Pro</strong>, Anda menyetujui ketentuan penggunaan platform berikut:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Akun Super Admin bertanggung jawab penuh atas pengelolaan workspace, data gerai, template checklist SOP, dan hak akses pengguna (Admin, Auditor/Staff, Divisi Teknis).
              </li>
              <li>
                Seluruh data inspeksi, dokumentasi foto bukti, dan laporan audit digunakan khusus untuk keperluan operasional dan evaluasi kepatuhan internal perusahaan Anda.
              </li>
              <li>
                Pengguna wajib menjaga kerahasiaan kredensial login dan tidak membagikan akses akun kepada pihak yang tidak berwenang.
              </li>
            </ul>
          </div>
        ) : (
          <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed select-text">
            <p>
              <strong>Audit Pro</strong> berkomitmen menjaga keamanan dan kerahasiaan data organisasi Anda:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                Data identitas pendaftaran (nama, email perusahaan, nomor telepon, dan nama perusahaan) hanya digunakan untuk autentikasi dan administrasi workspace.
              </li>
              <li>
                Dokumentasi foto bukti inspeksi lapangan dan lokasi verifikasi dilindungi dengan enkripsi dan kontrol akses berbasis peran (role-based access control).
              </li>
              <li>
                Kami tidak memperjualbelikan atau membagikan data audit perusahaan Anda kepada pihak ketiga tanpa persetujuan resmi.
              </li>
            </ul>
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => setLegalModal(null)}
            className="px-4 py-2 rounded-lg bg-[#193f53] hover:bg-[#143343] text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Saya Mengerti
          </button>
        </div>
      </Modal>
    </div>
  );
}

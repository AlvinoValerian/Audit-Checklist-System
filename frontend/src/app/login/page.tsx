"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { Toaster, toast } from "sonner";

import { ApiAuthService } from "@/services/auth.service";
import { AuthService } from "@/lib/auth";
import { resolvePostLoginRedirect } from "@/lib/routes-acl";

const REASON_MESSAGES: Record<string, { text: string; tone: "warning" | "error" | "info" }> = {
  timeout: {
    text: "Sesi Anda berakhir otomatis karena tidak ada aktivitas selama 30 menit. Silakan login kembali.",
    tone: "warning",
  },
  expired: {
    text: "Sesi login Anda telah kedaluwarsa atau dicabut. Silakan masuk kembali.",
    tone: "warning",
  },
  inactive: {
    text: "Akun Anda berstatus Nonaktif atau telah dinonaktifkan oleh administrator.",
    tone: "error",
  },
  logout: {
    text: "Anda telah keluar dari sesi dengan aman.",
    tone: "info",
  },
};

function LoginContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason") || "";
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handledReasonRef = useRef<string | null>(null);
  const reasonInfo = reason ? REASON_MESSAGES[reason] : undefined;

  useEffect(() => {
    if (!reason || handledReasonRef.current === reason) return;
    handledReasonRef.current = reason;

    // Pastikan localStorage bersih agar tidak ada loop redirect jika cookie sudah kedaluwarsa/dicabut
    if (reasonInfo) {
      AuthService.logout({ broadcast: false });
      if (reasonInfo.tone === "error") {
        toast.error(reasonInfo.text);
      } else if (reasonInfo.tone === "warning") {
        toast.warning(reasonInfo.text);
      } else {
        toast.info(reasonInfo.text);
      }
    }
  }, [reason, reasonInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Silakan masukkan Email Anda.");
      return;
    }

    if (!password) {
      toast.error("Silakan masukkan Password Anda.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await ApiAuthService.login({
        email: email.trim(),
        password,
      });

      const user = response.data?.user;
      toast.success(response.message || "Login berhasil! Mengalihkan ke dashboard...");

      const targetUrl = resolvePostLoginRedirect(user?.role, redirectParam);
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan saat mencoba login.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-sans bg-white">
      <Toaster position="top-right" richColors />

      {/* Tampilan Login sebelah kiri */}
      <section className="w-full lg:w-1/2 bg-[#193f53] text-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 min-h-[420px] lg:min-h-screen relative select-none">
        {/* Top: Logo & App Name */}
        <div className="flex items-center gap-3.5 z-10">
          <span className="text-xl font-bold tracking-tight text-white">
            Audit Pro
          </span>
        </div>

        {/* Center: Main Headline & Description */}
        <div className="my-auto py-12 lg:py-0 z-10 max-w-xl">
          <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-bold text-white tracking-tight leading-[1.2]">
            Sistem Monitoring & Audit Toko
            <br />
            Terintegrasi
          </h1>
          <p className="mt-5 text-sm sm:text-base text-slate-300 font-normal leading-relaxed max-w-md">
            Tingkatkan efisiensi operasional dan akurasi data audit jaringan
            toko Anda dalam satu platform terpusat.
          </p>
        </div>

        {/* Bottom: Copyright Footer */}
        <div className="z-10 pt-6">
          <p className="text-xs text-white/45 font-normal tracking-wide">
            © 2026 Audit Pro Enterprise Monitor. All rights reserved.
          </p>
        </div>
      </section>

      {/* kanan */}
      <main className="w-full lg:w-1/2 flex-1 bg-white flex items-center justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-[420px] mx-auto">
          {/* Form Header */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Selamat Datang
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Masuk dengan akun Super Admin atau Admin workspace Anda.
            </p>
          </div>

          {reasonInfo && (
            <div
              className={`mb-5 p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                reasonInfo.tone === "error"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : reasonInfo.tone === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-sky-50 border-sky-200 text-sky-800"
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{reasonInfo.text}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Email
              </label>
              <div className="relative flex items-center h-11 rounded-lg border border-slate-200 bg-white transition-all hover:border-slate-300 focus-within:border-[#193f53] focus-within:ring-2 focus-within:ring-[#193f53]/15">
                <div className="pl-3.5 pr-2 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4 stroke-[1.8]" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Masukkan Email Anda"
                  autoComplete="email"
                  required
                  suppressHydrationWarning
                  className="w-full h-full pr-4 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-2"
              >
                Password
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
                  autoComplete="current-password"
                  required
                  suppressHydrationWarning
                  className="w-full h-full pr-11 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
                  suppressHydrationWarning
                  className="absolute right-3.5 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <Eye className="w-4 h-4 stroke-[1.8]" />
                  ) : (
                    <EyeOff className="w-4 h-4 stroke-[1.8]" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between pt-1">
              <label
                htmlFor="rememberMe"
                className="flex items-center gap-2.5 text-xs text-slate-600 hover:text-slate-800 cursor-pointer select-none"
              >
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  suppressHydrationWarning
                  className="w-4 h-4 rounded border-slate-300 text-[#193f53] accent-[#193f53] focus:ring-[#193f53]/20 cursor-pointer"
                />
                <span>Ingat saya</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#193f53] hover:text-[#122e3d] transition-colors"
              >
                Lupa Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              suppressHydrationWarning
              className="w-full mt-6 h-11 bg-[#193f53] hover:bg-[#143343] active:bg-[#0f2835] text-white font-medium text-sm rounded-lg transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 active:scale-[0.99]"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Login</span>
            </button>
          </form>

          {/* Bottom Register Link */}
          <div className="mt-8 text-center text-xs text-slate-500">
            <span>Belum memiliki akun? </span>
            <Link
              href="/register"
              className="font-bold text-slate-800 hover:text-[#193f53] transition-colors"
            >
              Daftar sekarang
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full flex items-center justify-center bg-white">
          <Loader2 className="w-7 h-7 animate-spin text-[#193f53]" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

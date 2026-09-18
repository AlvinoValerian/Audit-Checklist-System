"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Toaster, toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
      // Mock login validation / simulated delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      toast.success("Login berhasil! Mengalihkan ke dashboard...");
    } catch {
      toast.error("Terjadi kesalahan saat mencoba login. Silakan coba lagi.");
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
            StoreAudit
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
          </div>

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
                  className="w-full h-full pr-11 text-sm text-slate-800 placeholder:text-slate-400 bg-transparent border-none outline-none focus:ring-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Sembunyikan password" : "Tampilkan password"
                  }
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
              href="/auth/register"
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

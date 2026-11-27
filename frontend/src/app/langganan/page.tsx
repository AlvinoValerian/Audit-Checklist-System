"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, CreditCard, Sparkles, ArrowRight, Clock } from "lucide-react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { AuthService, AuthUser } from "@/lib/auth";
import { apiFetch } from "@/lib/api-client";

// Format tanggal bersih tanpa jam: contoh "9 November 2026"
function formatDateClean(dateStr?: string | null, fallback = "-"): string {
  if (!dateStr) return fallback;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// Hitung sisa hari aktif
function calculateRemainingDays(expiryDateStr?: string | null): number {
  if (!expiryDateStr) return 355;
  const expiry = new Date(expiryDateStr).getTime();
  if (isNaN(expiry)) return 355;
  const diff = expiry - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function LanggananPage() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    // 1. Ambil data sesi awal
    const localUser = AuthService.getCurrentUser();
    if (localUser) {
      setCurrentUser(localUser);
    }

    // 2. Sinkronkan dengan data database PostgreSQL /api/auth/me
    async function syncSubscription() {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const body = await res.json();
          if (body?.data?.user) {
            const freshUser: AuthUser = {
              ...(localUser || {}),
              ...body.data.user,
            };
            AuthService.setCurrentUser(freshUser);
            setCurrentUser(freshUser);

            const isFreshPaid =
              freshUser.isPaid === true ||
              freshUser.paymentStatus === "Lunas" ||
              freshUser.payment_status === "Lunas";

            if (isFreshPaid) {
              localStorage.setItem("superadmin_paid", "true");
              if (freshUser.paymentPackage) {
                localStorage.setItem("active_subscription_plan", freshUser.paymentPackage);
              }
            } else {
              localStorage.removeItem("superadmin_paid");
              localStorage.removeItem("active_subscription_plan");
            }
          }
        }
      } catch (err) {
        console.warn("Sinkronisasi langganan gagal:", err);
      }
    }

    syncSubscription();
  }, []);

  // Resolusi nama paket yang aktif
  const storedPlan =
    (typeof window !== "undefined" && localStorage.getItem("active_subscription_plan")) ||
    currentUser?.paymentPackage ||
    (typeof window !== "undefined" && localStorage.getItem("selected_checkout_plan")) ||
    "Standard Plan";

  const lowerPlan = storedPlan.toLowerCase();
  const displayPackageName = lowerPlan.includes("enterprise") || lowerPlan.includes("pro")
    ? "Enterprise"
    : lowerPlan.includes("business")
    ? "Enterprise"
    : lowerPlan.includes("lite")
    ? "Lite Plan"
    : lowerPlan.includes("standard")
    ? "Standard Plan"
    : storedPlan || "Enterprise";

  // Resolusi periode
  const storedCycle =
    (typeof window !== "undefined" && localStorage.getItem("selected_billing_cycle")) ||
    currentUser?.billingCycle ||
    "";

  const paidAtTime = currentUser?.paidAt ? new Date(currentUser.paidAt).getTime() : 0;
  const expiryTime = currentUser?.expiryDate ? new Date(currentUser.expiryDate).getTime() : 0;
  const diffDays =
    paidAtTime && expiryTime ? Math.round((expiryTime - paidAtTime) / (1000 * 60 * 60 * 24)) : 0;

  const cycleLower = storedCycle.toLowerCase();
  const durationDaysStored =
    typeof window !== "undefined" ? localStorage.getItem("subscription_duration_days") : null;

  const isExplicitMonthly =
    cycleLower.includes("bulan") ||
    cycleLower.includes("month") ||
    durationDaysStored === "30" ||
    (diffDays > 0 && diffDays <= 60);

  const isYearly =
    !isExplicitMonthly &&
    (cycleLower.includes("tahun") ||
      cycleLower.includes("year") ||
      cycleLower.includes("annual") ||
      cycleLower.includes("12") ||
      diffDays > 60 ||
      durationDaysStored === "365");

  const periodLabel = isYearly ? "12 Bulan" : "1 Bulan";

  // Kode paket resmi Audit Pro: [PAKET]-SUB-[DURASI]
  const cleanPackage = displayPackageName.toLowerCase().replace(/\s+plan$/i, "").trim();
  const prefix = cleanPackage.includes("enterprise") || cleanPackage.includes("pro")
    ? "ENT"
    : cleanPackage.includes("lite")
    ? "LITE"
    : cleanPackage.includes("standard")
    ? "STD"
    : cleanPackage.toUpperCase();

  const planCode = `${prefix}-SUB-${isYearly ? "12" : "01"}`;

  // Tanggal Mulai & Berakhir
  const startDate =
    currentUser?.paidAt ||
    (typeof window !== "undefined" && localStorage.getItem("subscription_start_date")) ||
    "2026-11-09T00:00:00.000Z";

  const fallbackEndDate = isYearly
    ? new Date(new Date(startDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString()
    : new Date(new Date(startDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const endDate = currentUser?.expiryDate || fallbackEndDate;
  const remainingDays = calculateRemainingDays(endDate);

  const isPaid =
    currentUser?.isPaid === true ||
    currentUser?.paymentStatus === "Lunas" ||
    (typeof window !== "undefined" && localStorage.getItem("superadmin_paid") === "true");

  return (
    <DashboardLayout>
      <div className="w-full max-w-3xl mx-auto pb-16">
        {/* =========================================================================
            HEADER HALAMAN
           ========================================================================= */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Langganan
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isPaid ? "Detail paket aktif Anda." : "Status paket langganan Super Admin Anda."}
          </p>
        </div>

        {/* =========================================================================
            CARD UTAMA (GRADIEN BIRU TUA KE BIRU MUDA SEDANG): PAKET AKTIF
           ========================================================================= */}
        <div className="bg-gradient-to-r from-[#26455E] via-[#1f567f] to-[#0284c7] rounded-2xl sm:rounded-3xl p-6 sm:p-7 text-white shadow-md shadow-[#26455E]/15 transition-all border border-white/15">
          {/* Top Row: Info Paket & Icon Card */}
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs sm:text-sm font-medium text-sky-100/90">
                {isPaid ? "Paket Aktif" : "Paket Dipilih (Menunggu Pembayaran)"}
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
                {displayPackageName}
              </h2>
              <p className="text-sm sm:text-base text-sky-100/90 font-normal mt-0.5">
                {periodLabel}
              </p>
            </div>

            {/* Credit Card Icon Capsule */}
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-2xs border border-white/15">
              <CreditCard className="w-5 h-5 stroke-[2.2]" />
            </div>
          </div>

          {/* Bottom Row: Status Aktif & Sisa Hari */}
          <div className="mt-8 sm:mt-10 flex items-center justify-between text-white">
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold tracking-wide">
              {isPaid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                  <span>AKTIF</span>
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 text-amber-300 stroke-[2.5]" />
                  <span className="text-amber-200">MENUNGGU PEMBAYARAN</span>
                </>
              )}
            </div>
            <div className="text-xs sm:text-sm text-sky-100 font-medium">
              {isPaid ? `${remainingDays} hari tersisa` : "Belum Aktif"}
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD PUTIH: DETAIL LANGGANAN
           ========================================================================= */}
        <div className="mt-6 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 sm:p-7">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
            Detail Langganan
          </h3>

          <div className="divide-y divide-slate-100">
            {/* 1. Kode Paket */}
            <div className="py-4 flex items-center justify-between text-sm">
              <span className="text-slate-500 font-normal">Kode Paket</span>
              <span className="text-black font-normal font-mono">
                {planCode}
              </span>
            </div>

            {/* 2. Periode */}
            <div className="py-4 flex items-center justify-between text-sm">
              <span className="text-slate-500 font-normal">Periode</span>
              <span className="text-black font-normal">
                {periodLabel}
              </span>
            </div>

            {/* 3. Mulai */}
            <div className="py-4 flex items-center justify-between text-sm">
              <span className="text-slate-500 font-normal">Mulai</span>
              <span className="text-black font-normal">
                {formatDateClean(startDate, "9 November 2026")}
              </span>
            </div>

            {/* 4. Berakhir */}
            <div className="py-4 flex items-center justify-between text-sm">
              <span className="text-slate-500 font-normal">Berakhir</span>
              <span className="text-black font-normal">
                {formatDateClean(endDate, "9 November 2027")}
              </span>
            </div>

            {/* 5. Status */}
            <div className="py-4 flex items-center justify-between text-sm">
              <span className="text-slate-500 font-normal">Status</span>
              <span className={`font-normal tracking-wide ${isPaid ? "text-emerald-700 font-semibold" : "text-amber-600 font-semibold"}`}>
                {isPaid ? "ACTIVE" : "MENUNGGU BAYAR"}
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TOMBOL AKSI: BAYAR / UPGRADE / PERPANJANG
           ========================================================================= */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              {isPaid
                ? "Ingin mengubah paket atau perpanjang lisensi?"
                : "Paket langganan Anda belum aktif"}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {isPaid
                ? "Tingkatkan kuota cabang toko Anda atau perpanjang masa aktif akun."
                : "Selesaikan pembayaran untuk mengaktifkan seluruh fitur sistem Audit Pro."}
            </p>
          </div>

          <Link
            href="/#pricing"
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.setItem("checkout_return_url", "/langganan");
              }
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#26455E] hover:bg-[#1a3143] text-white text-xs sm:text-sm font-bold shadow-xs hover:shadow transition-all shrink-0 group"
          >
            <Sparkles className="w-4 h-4 text-amber-300 group-hover:scale-110 transition-transform" />
            <span>{isPaid ? "Upgrade / Perpanjang" : "Bayar Sekarang"}</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Store,
  Layers,
} from "lucide-react";
import { AuthService } from "@/lib/auth";

interface SubscriptionPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SubscriptionPricingModal({
  isOpen,
  onClose,
}: SubscriptionPricingModalProps) {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const plans = [
    {
      id: "lite",
      name: "Lite Plan",
      monthlyPrice: 50000,
      yearlyPrice: 480000,
      monthlyPriceFormatted: "Rp 50.000",
      yearlyPriceFormatted: "Rp 480.000",
      monthlySubtext: "Fleksibel bayar per bulan",
      yearlySubtext: "Setara Rp 40.000/bln (Hemat Rp 120.000)",
      description: "Cocok untuk UMKM atau gerai awal",
      features: [
        "Hingga 2 cabang toko aktif",
        "Checklist audit digital dasar",
        "Riwayat audit & skor standar",
        "Dukungan email komunitas",
        "Fitur keamanan dasar",
      ],
      isPopular: false,
    },
    {
      id: "standard",
      name: "Standard Plan",
      monthlyPrice: 150000,
      yearlyPrice: 1440000,
      monthlyPriceFormatted: "Rp 150.000",
      yearlyPriceFormatted: "Rp 1.440.000",
      monthlySubtext: "Paling populer untuk jaringan cabang",
      yearlySubtext: "Setara Rp 120.000/bln (Hemat Rp 360.000)",
      description: "Solusi terlengkap & paling populer untuk jaringan toko",
      features: [
        "Hingga 15 cabang toko aktif",
        "Checklist dinamis & kustomisasi SOP",
        "Validasi Geotagging GPS & foto anti-fraud",
        "Ekspor laporan ke PDF & Excel resmi",
        "Tiket deviasi & CAPA terotomatisasi",
        "Dukungan teknis prioritas",
      ],
      isPopular: true,
    },
    {
      id: "pro",
      name: "Pro Plan",
      monthlyPrice: 360000,
      yearlyPrice: 3480000,
      monthlyPriceFormatted: "Rp 360.000",
      yearlyPriceFormatted: "Rp 3.480.000",
      monthlySubtext: "Solusi tanpa batas enterprise",
      yearlySubtext: "Setara Rp 290.000/bln (Hemat Rp 840.000)",
      description: "Untuk enterprise skala besar tanpa batas",
      features: [
        "Cabang toko & auditor tanpa batas",
        "Analitik performa & executive scoring matrix",
        "SLA Management & auto escalation",
        "Akses API & integrasi eksternal",
        "24/7 dedicated support",
      ],
      isPopular: false,
    },
  ];

  const handleSelectPlan = (plan: typeof plans[0]) => {
    const nominal = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    const cycle = isYearly ? "Tahunan" : "Bulanan";
    const currentUser = AuthService.getCurrentUser();

    onClose();
    const params = new URLSearchParams({
      package: plan.name,
      nominal: String(nominal),
      cycle: cycle,
      superAdminId: currentUser?.rawId || (currentUser?.id ? String(currentUser.id).replace(/^sa-/, "") : "") || "",
      email: currentUser?.email || "",
      name: currentUser?.fullName || "",
    });
    router.push(`/checkout?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Modal */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0 bg-slate-50/50">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3 h-3" />
              <span>Paket Langganan Audit Pro</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pilihan Paket &amp; Harga
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Paket Fleksibel &amp; Terukur Sesuai Jumlah Cabang Toko Anda (Sesuai Landing Page).
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Tombol Menuju Landing Page Langsung */}
            <Link
              href="/#pricing"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs hover:shadow transition-all cursor-pointer"
              title="Buka Bagian Harga di Landing Page"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Lihat di Landing Page</span>
            </Link>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Konten Scrollable */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
          {/* Billing Cycle Toggle: Bulanan vs Tahunan */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center p-1 rounded-full bg-slate-100 border border-slate-200 shadow-2xs select-none">
              <button
                type="button"
                onClick={() => setIsYearly(false)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  !isYearly
                    ? "bg-[#26455E] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bulanan
              </button>
              <button
                type="button"
                onClick={() => setIsYearly(true)}
                className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isYearly
                    ? "bg-[#26455E] text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>Tahunan</span>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    isYearly
                      ? "bg-sky-400 text-[#142636]"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  Hemat 20%
                </span>
              </button>
            </div>
          </div>

          {/* Grid 3 Kartu Paket */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                  plan.isPopular
                    ? "bg-gradient-to-b from-[#f0f9ff] to-white border-2 border-sky-400 shadow-md shadow-sky-500/10 hover:shadow-lg"
                    : "bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-sm"
                }`}
              >
                {/* Badge Rekomendasi */}
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                    Paling Populer
                  </div>
                )}

                <div>
                  {/* Judul & Harga */}
                  <div className="mb-4">
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {plan.description}
                    </p>
                  </div>

                  <div className="my-4 pb-4 border-b border-slate-100">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        {isYearly ? plan.yearlyPriceFormatted : plan.monthlyPriceFormatted}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {isYearly ? "/tahun" : "/bulan"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      {isYearly ? plan.yearlySubtext : plan.monthlySubtext}
                    </p>
                  </div>

                  {/* Daftar Fitur */}
                  <ul className="space-y-3 text-xs text-slate-600 mb-6">
                    {plan.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            plan.isPopular ? "text-sky-600" : "text-emerald-600"
                          }`}
                        />
                        <span className="leading-relaxed">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tombol CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      plan.isPopular
                        ? "bg-[#26455E] hover:bg-[#1a3042] text-white shadow-md shadow-[#26455E]/20"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                    }`}
                  >
                    <span>Pilih {plan.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 sm:px-8 py-3.5 bg-slate-50 border-t border-slate-200/90 flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Pembayaran aman &amp; terenkripsi via SparkPay Gateway</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Tag,
  Check,
  Receipt,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  Sparkles,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/lib/auth";
import SparkPayCheckoutModal, {
  SparkPayCheckoutData,
} from "@/app/pengaturan/components/SparkPayCheckoutModal";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parsing data transaksi dari URL params atau localStorage fallback
  const paramId = searchParams.get("id") || "";
  const paramSuperAdminId = searchParams.get("superAdminId") || "";
  const paramName = searchParams.get("name") || "";
  const paramEmail = searchParams.get("email") || "";
  const paramPackage = searchParams.get("package") || "";
  const paramNominal = searchParams.get("nominal") || "";
  const paramCycle = searchParams.get("cycle") || "";
  const paramInvoice = searchParams.get("invoice") || "";

  // State checkout order (Default Standard Plan Audit Pro)
  const [packageName, setPackageName] = useState<string>("Standard Plan");
  const [packageSlug, setPackageSlug] = useState<string>("standard-plan-1");
  const [totalNominal, setTotalNominal] = useState<number>(150000);
  const [billingDuration, setBillingDuration] = useState<string>("Bulanan");
  const [durationMultiplier, setDurationMultiplier] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>("Anton Kurniawan");
  const [customerEmail, setCustomerEmail] = useState<string>("admin@auditcorp.com");
  const [customerPhone, setCustomerPhone] = useState<string>("081234567890");
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `INV-2026-11-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [superAdminId, setSuperAdminId] = useState<string>("1");

  // State Modal Checkout Snap.js
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<SparkPayCheckoutData | null>(null);

  useEffect(() => {
    // 1. Coba ambil dari localStorage jika dikirim dari tabel rekap pembayaran
    let storedItem: any = null;
    try {
      const raw = localStorage.getItem("audit_pro_checkout_item");
      if (raw) storedItem = JSON.parse(raw);
    } catch {}

    const currentUser = AuthService.getCurrentUser();

    const finalName =
      paramName || currentUser?.fullName || storedItem?.name || "Anton Kurniawan";
    const finalEmail =
      paramEmail || currentUser?.email || storedItem?.email || "admin@auditcorp.com";
    const finalPhone =
      currentUser?.phone || storedItem?.phone || "081234567890";
    const finalPackage =
      paramPackage || storedItem?.packageName || "Standard Plan";
    const rawNominal =
      paramNominal ? parseInt(paramNominal, 10) : storedItem?.nominal || 150000;
    const finalNominal = isNaN(rawNominal) || rawNominal <= 0 ? 150000 : rawNominal;
    const finalCycle =
      paramCycle || storedItem?.billingCycle || (finalNominal === 850000 ? "6 Bulan" : "Bulanan");
    const finalInvoice =
      paramInvoice ||
      storedItem?.invoiceNumber ||
      `INV-2026-11-${Math.floor(1000 + Math.random() * 9000)}`;
    const finalSaId =
      paramSuperAdminId ||
      currentUser?.rawId ||
      (currentUser?.id ? String(currentUser.id).replace(/^sa-/, "") : "") ||
      storedItem?.superAdminId ||
      "1";

    setCustomerName(finalName);
    setCustomerEmail(finalEmail);
    setCustomerPhone(finalPhone);
    setPackageName(finalPackage);
    setTotalNominal(finalNominal);
    setBillingDuration(finalCycle);
    setInvoiceNumber(finalInvoice);
    setSuperAdminId(finalSaId);

    // Slug / code penomoran lisensi
    if (finalCycle.toLowerCase().includes("tahun") || finalCycle.toLowerCase().includes("12")) {
      setPackageSlug(`${finalPackage.toLowerCase().replace(/\s+/g, "-")}-12`);
      setDurationMultiplier(12);
    } else {
      setPackageSlug(`${finalPackage.toLowerCase().replace(/\s+/g, "-")}-1`);
      setDurationMultiplier(1);
    }
  }, [
    paramId,
    paramSuperAdminId,
    paramName,
    paramEmail,
    paramPackage,
    paramNominal,
    paramCycle,
    paramInvoice,
  ]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const monthlyPrice = Math.round(totalNominal / (durationMultiplier || 1));

  // Features list sesuai gambar
  const features = [
    "Akses penuh semua fitur paket",
    "Onboarding & pelatihan tim",
    "Dukungan teknis prioritas",
    "Update fitur gratis selama berlangganan",
  ];

  // Trigger Pembuatan Token Checkout Snap.js (Step 1 -> Step 2)
  const handlePayNow = async () => {
    setIsProcessing(true);

    const payload = {
      external_reference: invoiceNumber,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      title: `Langganan ${packageName} (${billingDuration}) - ${customerName}`,
      amount: totalNominal,
      currency: "IDR",
      products: [
        {
          name: `Paket ${packageName} (${billingDuration})`,
          quantity: 1,
          price: totalNominal,
        },
      ],
    };

    try {
      // Panggil backend Express /api/payment-links (Server Key dibaca aman di backend .env)
      let res: Response;
      const headers = {
        "Content-Type": "application/json",
      };

      try {
        res = await fetch("/api/payment-links", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetch("http://localhost:5000/api/payment-links", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json().catch(() => ({}));

      let slugToken = json.data?.slug || "mTP10-MEMXapUpZDhEW2Xwz5DPIDOPYu";

      setCheckoutData({
        slug: slugToken,
        external_reference: invoiceNumber,
        title: `Pembayaran ${packageName} (${billingDuration})`,
        amount: totalNominal,
        currency: "IDR",
        customer: {
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
        },
        items: [
          {
            name: `Paket Langganan ${packageName} (${billingDuration})`,
            quantity: 1,
            price: totalNominal,
          },
        ],
      });

      setIsCheckoutOpen(true);
    } catch (err: unknown) {
      console.error("Gagal generate link pembayaran:", err);
      toast.error("Gagal terhubung ke gateway SparkPay.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Sukses Pembayaran SparkPay (Simpan Lunas ke Database PostgreSQL & Langsung ke Workspace)
  const handlePaymentSuccess = async (result: any) => {
    setIsCheckoutOpen(false);
    const chosenMethod = result.paymentMethod || "QRIS SparkPay";
    const isYearlyPlan =
      billingDuration.toLowerCase().includes("tahun") ||
      billingDuration.toLowerCase().includes("year") ||
      durationMultiplier === 12;

    try {
      const confirmPayload = {
        superAdminId: superAdminId,
        email: customerEmail,
        invoiceNumber: invoiceNumber,
        packageName: packageName,
        nominal: totalNominal,
        paymentMethod: chosenMethod,
        billingCycle: isYearlyPlan ? "Tahunan" : "Bulanan",
      };

      const res = await fetch("/api/sparkpay/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(confirmPayload),
      }).catch(() => null);

      if (!res || !res.ok) {
        await fetch("http://localhost:5000/api/sparkpay/confirm-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(confirmPayload),
        }).catch(() => null);
      }
    } catch (err) {
      console.error("Gagal update status di backend:", err);
    }

    try {
      localStorage.setItem("superadmin_paid", "true");
      const normalizedPlan = packageName.toLowerCase().includes("lite")
        ? "Lite Plan"
        : packageName.toLowerCase().includes("pro")
        ? "Pro Plan"
        : "Standard Plan";
      localStorage.setItem("active_subscription_plan", normalizedPlan);
      localStorage.setItem("selected_checkout_plan", normalizedPlan);
      localStorage.setItem("selected_billing_cycle", isYearlyPlan ? "tahunan" : "bulanan");
      localStorage.setItem("subscription_duration_days", isYearlyPlan ? "365" : "30");
      localStorage.setItem("subscription_start_date", new Date().toISOString());
      localStorage.removeItem("show_payment_modal_on_workspace");
      localStorage.removeItem("pending_superadmin_payment");
      localStorage.removeItem("audit_pro_checkout_item");

      const user = AuthService.getCurrentUser();
      if (user) {
        user.paymentStatus = "Lunas";
        user.paymentPackage = normalizedPlan;
        user.billingCycle = isYearlyPlan ? "Tahunan" : "Bulanan";
        user.expiryDate = new Date(Date.now() + (isYearlyPlan ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString();
        user.isPaid = true;
        AuthService.setCurrentUser(user);
      }
    } catch {}

    toast.success("Pembayaran berhasil! Akun telah aktif sepenuhnya.");

    // Langsung arahkan kembali ke langganan/workspace dengan reload penuh agar data fresh
    const targetRedirect =
      (typeof window !== "undefined" && localStorage.getItem("checkout_return_url")) ||
      "/langganan";
    if (typeof window !== "undefined") {
      localStorage.removeItem("checkout_return_url");
      window.location.href = targetRedirect;
    } else {
      router.push(targetRedirect);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-800 font-sans pb-16">
      {/* Header Container */}
      <div className="max-w-5xl mx-auto pt-8 sm:pt-12 px-4 sm:px-6">
        {/* Tombol Kembali ke Harga */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/langganan");
              }
            }}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 text-slate-600" />
            <span>Kembali ke Harga</span>
          </button>
        </div>

        {/* Judul & Subtitle Checkout */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Checkout
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tinjau pesanan Anda sebelum melanjutkan pembayaran.
          </p>
        </div>

        {/* Grid 2 Kolom Sesuai Gambar User */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ============================================================== */}
            {/* KOLOM KIRI (7 Kolom): Rincian Paket & Manfaat                 */}
            {/* ============================================================== */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: Paket Terpilih */}
              <div className="bg-emerald-50/40 border border-emerald-200/90 rounded-2xl p-5 sm:p-6 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100/90 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <Tag className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <span className="text-[11px] font-extrabold text-emerald-600 tracking-wider uppercase">
                    PAKET TERPILIH
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                    {packageName}
                  </h2>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    {packageSlug}
                  </p>
                </div>
              </div>

              {/* Card 2: Yang Anda dapatkan */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Yang Anda dapatkan
                </h3>
                <ul className="space-y-3">
                  {features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-xs sm:text-sm text-slate-700">
                      <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.8]" />
                      </div>
                      <span className="leading-relaxed">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Card 3: Rincian Tagihan */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-800" />
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Rincian Tagihan
                  </h3>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500 inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Durasi
                    </span>
                    <span className="font-semibold text-slate-800">{billingDuration}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500">Harga per bulan</span>
                    <span className="font-semibold text-slate-800">{formatRupiah(monthlyPrice)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500">
                      Subtotal ({durationMultiplier}&times;)
                    </span>
                    <span className="font-semibold text-slate-800">{formatRupiah(totalNominal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-slate-500">Diskon</span>
                    <span className="font-semibold text-emerald-600">Rp 0</span>
                  </div>

                  <hr className="border-slate-100 my-2" />

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-slate-900 text-sm sm:text-base">Total</span>
                    <span className="text-base sm:text-lg font-black text-emerald-600">
                      {formatRupiah(totalNominal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* KOLOM KANAN (5 Kolom): Konfirmasi Pembayaran Sticky           */}
            {/* ============================================================== */}
            <div className="lg:col-span-5 sticky top-8 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs space-y-5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Konfirmasi Pembayaran
                </h3>

                {/* Box Nilai Total Pembayaran */}
                <div className="bg-slate-50/90 border border-slate-100 rounded-2xl p-6 text-center space-y-1">
                  <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                    TOTAL PEMBAYARAN
                  </span>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 tracking-tight py-1">
                    {formatRupiah(totalNominal)}
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    {billingDuration} · {packageName}
                  </p>
                </div>

                {/* Tombol Bayar Sekarang */}
                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={isProcessing}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyiapkan Gateway SparkPay...</span>
                    </>
                  ) : (
                    <span>Bayar Sekarang</span>
                  )}
                </button>

                {/* Poin Keamanan */}
                <div className="space-y-2 pt-1 text-xs text-slate-600">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.2]" />
                    <span>Pembayaran aman &amp; terenkripsi via SparkPay</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 stroke-[2.2]" />
                    <span>Akses langsung aktif setelah pembayaran berhasil</span>
                  </div>
                </div>

                {/* Footnote Persetujuan */}
                <p className="text-[11px] text-slate-400 text-center leading-relaxed pt-2">
                  Dengan melanjutkan, Anda menyetujui{" "}
                  <a href="#" className="underline hover:text-slate-600 transition-colors">
                    Syarat &amp; Ketentuan
                  </a>{" "}
                  dan{" "}
                  <a href="#" className="underline hover:text-slate-600 transition-colors">
                    Kebijakan Privasi
                  </a>{" "}
                  Audit Pro
                </p>
              </div>
            </div>
          </div>
      </div>

      {/* Popup Checkout Snap.js SparkPay */}
      {isCheckoutOpen && checkoutData && (
        <SparkPayCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          data={checkoutData}
          environment="sandbox"
          onSuccess={handlePaymentSuccess}
          onPending={() => {
            toast.info("Transaksi sedang menunggu pembayaran di gateway SparkPay.");
            setIsCheckoutOpen(false);
          }}
          onError={(err) => {
            toast.error(`Terjadi kendala checkout: ${err.message}`);
          }}
        />
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex items-center gap-3 text-slate-500 font-semibold text-sm">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
            <span>Memuat halaman checkout...</span>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

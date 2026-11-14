"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  CreditCard,
  Building2,
  User,
  ArrowRight,
  Loader2,
  Check,
  Store,
  QrCode,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Workspace } from "@/types/workspace";
import { AuthService } from "@/lib/auth";
import SparkPayCheckoutModal, {
  SparkPayCheckoutData,
} from "@/app/pengaturan/components/SparkPayCheckoutModal";

interface WorkspaceSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspace: Workspace | null;
  onSuccess?: () => void;
}

interface PlanOption {
  id: "lite" | "standard" | "pro";
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPeriod: string;
  yearlyPeriod: string;
  monthlyDescription: string;
  yearlyDescription: string;
  features: string[];
  isPopular?: boolean;
}

const PLANS: PlanOption[] = [
  {
    id: "lite",
    name: "Lite Plan",
    monthlyPrice: 50000,
    yearlyPrice: 480000,
    monthlyPeriod: "/bulan",
    yearlyPeriod: "/tahun",
    monthlyDescription: "Cocok untuk UMKM atau gerai awal",
    yearlyDescription: "Setara Rp 40.000/bln (Hemat Rp 120.000)",
    features: [
      "Hingga 2 cabang toko aktif",
      "Checklist audit digital dasar",
      "Riwayat audit standar",
      "Dukungan email standar",
    ],
  },
  {
    id: "standard",
    name: "Standard Plan",
    monthlyPrice: 150000,
    yearlyPrice: 1440000,
    monthlyPeriod: "/bulan",
    yearlyPeriod: "/tahun",
    monthlyDescription: "Solusi terlengkap & paling populer untuk jaringan toko",
    yearlyDescription: "Setara Rp 120.000/bln (Hemat Rp 360.000)",
    isPopular: true,
    features: [
      "Hingga 15 cabang toko aktif",
      "Checklist dinamis & custom template",
      "Validasi Geotagging GPS & foto bukti",
      "Ekspor laporan ke PDF & Excel",
      "Dukungan teknis prioritas",
    ],
  },
  {
    id: "pro",
    name: "Pro Plan",
    monthlyPrice: 360000,
    yearlyPrice: 3480000,
    monthlyPeriod: "/bulan",
    yearlyPeriod: "/tahun",
    monthlyDescription: "Untuk enterprise skala besar tanpa batas",
    yearlyDescription: "Setara Rp 290.000/bln (Hemat Rp 840.000)",
    features: [
      "Cabang toko & auditor tanpa batas",
      "Analitik transaksi & performa audit",
      "Sistem Tiket CAPA & SLA Manager",
      "Akses API & Webhook integrasi",
      "24/7 dedicated support",
    ],
  },
];

export default function WorkspaceSubscriptionModal({
  isOpen,
  onClose,
  workspace,
  onSuccess,
}: WorkspaceSubscriptionModalProps) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<"lite" | "standard" | "pro">("standard");
  const [isYearly, setIsYearly] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // State untuk Popup Checkout Snap.js (Step 2)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<SparkPayCheckoutData | null>(null);

  // Sinkronkan paket dan siklus penagihan yang dipilih dari registrasi / landing page
  React.useEffect(() => {
    if (!isOpen) return;
    try {
      const savedPlan = localStorage.getItem("selected_checkout_plan");
      if (savedPlan && (savedPlan === "lite" || savedPlan === "standard" || savedPlan === "pro")) {
        setSelectedPlanId(savedPlan as "lite" | "standard" | "pro");
      }
      const savedBilling = localStorage.getItem("selected_billing_cycle");
      if (savedBilling === "yearly") {
        setIsYearly(true);
      } else if (savedBilling === "monthly") {
        setIsYearly(false);
      }
    } catch {}
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUser = AuthService.getCurrentUser();
  const workspaceName = workspace?.name || currentUser?.companyName || "Workspace Perusahaan";
  const workspaceId = workspace?.id || "ws-main";
  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1];

  const currentPrice = isYearly ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;
  const currentPeriod = isYearly ? selectedPlan.yearlyPeriod : selectedPlan.monthlyPeriod;
  const currentDurationLabel = isYearly ? "1 Tahun" : "1 Bulan";

  const customerName = currentUser?.fullName || currentUser?.companyName || "Super Admin";
  const customerEmail = currentUser?.email || "admin@perusahaan.com";
  const customerPhone = currentUser?.phone || "081234567890";

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  /**
   * Step 1 — Buat Payment Link (Panggil Backend Server)
   * Sesuai dokumen .md: POST /api/payment-links
   */
  const handleInitiatePayment = async () => {
    setIsProcessing(true);

    const externalReference = `INV-WS-${workspaceId}-${Date.now().toString().slice(-6)}`;
    const payload = {
      external_reference: externalReference,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      title: `Langganan ${selectedPlan.name} (${currentDurationLabel}) - ${workspaceName}`,
      amount: currentPrice,
      currency: "IDR",
      products: [
        {
          name: `Paket ${selectedPlan.name} (${currentDurationLabel})`,
          quantity: 1,
          price: currentPrice,
        },
      ],
    };

    try {
      // Panggil backend API (proxy /api atau fallback langsung ke server Railway)
      let res: Response;
      try {
        res = await fetch("/api/payment-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        res = await fetch("https://audit-checklist-system-production.up.railway.app/api/payment-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.data?.slug) {
        const slug = json.data.slug;
        toast.success("Sesi pembayaran berhasil dibuat dari SparkPay (201 Created)!");

        // Siapkan data untuk Step 2 (Popup Modal Checkout Snap.js)
        setCheckoutData({
          slug: slug,
          external_reference: externalReference,
          title: `Langganan ${selectedPlan.name} (${currentDurationLabel}) — ${workspaceName}`,
          amount: currentPrice,
          currency: "IDR",
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
          items: [
            {
              name: `Paket ${selectedPlan.name} (${currentDurationLabel})`,
              quantity: 1,
              price: currentPrice,
            },
          ],
        });

        // Buka Modal Checkout Popup Snap.js
        setIsCheckoutOpen(true);
      } else {
        const errorMsg = json.message || "Gagal membuat sesi pembayaran SparkPay.";
        toast.error(`SparkPay: ${errorMsg}`);
      }
    } catch (err: unknown) {
      console.error("Error creating payment link:", err);
      toast.error("Gagal terhubung ke server pembayaran.");
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Callback onSuccess (Step 2 .md)
   * Dipicu saat pembayaran selesai dan berhasil
   */
  const handlePaymentSuccess = async (result: {
    type: string;
    external_reference: string;
    slug: string;
    amount: number;
  }) => {
    setIsCheckoutOpen(false);
    toast.success(`Pembayaran BERHASIL! (Ref: ${result.external_reference})`);

    // Tandai status langganan superadmin & workspace aktif di localStorage
    try {
      localStorage.setItem("superadmin_paid", "true");
      localStorage.setItem("active_subscription_plan", selectedPlan.id);
      localStorage.setItem("selected_billing_cycle", isYearly ? "yearly" : "monthly");
      localStorage.setItem("subscription_duration_days", isYearly ? "365" : "30");
      localStorage.removeItem("show_payment_modal_on_workspace");
      localStorage.removeItem("pending_superadmin_payment");

      if (workspace?.id) {
        localStorage.setItem(`workspace_plan_${workspace.id}`, selectedPlan.id);
        localStorage.setItem(`workspace_billing_${workspace.id}`, isYearly ? "yearly" : "monthly");
        localStorage.setItem(`workspace_paid_${workspace.id}`, "PAID");
        localStorage.setItem(`workspace_paid_at_${workspace.id}`, new Date().toISOString());
      }
    } catch {}

    // Step 3 (Kirim notifikasi Webhook callback server-to-server)
    try {
      const webhookPayload = {
        event: "PAID",
        external_reference: result.external_reference,
        slug: result.slug,
        amount: String(result.amount),
        currency: "IDR",
        paid_at: new Date().toISOString(),
      };

      fetch("/api/payment-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload),
      }).catch(() => {
        fetch("https://audit-checklist-system-production.up.railway.app/api/payment-callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        }).catch(console.warn);
      });
    } catch {}

    onSuccess?.();
    onClose();

    // Jika target workspace ada, aktifkan workspace
    if (workspace) {
      AuthService.setActiveWorkspace({
        id: workspace.id,
        name: workspace.name,
        companyName: workspace.companyName || workspace.name,
      });
    }
  };

  const handleEnterWithoutPay = () => {
    try {
      localStorage.setItem("show_payment_modal_on_workspace", "false");
    } catch {}
    if (workspace) {
      AuthService.setActiveWorkspace({
        id: workspace.id,
        name: workspace.name,
        companyName: workspace.companyName || workspace.name,
      });
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-r from-[#193f53] via-[#26455E] to-[#142636] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-sky-300 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold tracking-tight">
                    Aktivasi &amp; Pembayaran Akun Super Admin
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-400/20 text-sky-200 border border-sky-400/30 uppercase tracking-wider">
                    SparkPay Gateway
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Selesaikan pembayaran paket untuk <strong className="text-white">{workspaceName}</strong> sebelum masuk ke Workspace
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5">
            {/* Super Admin & Workspace Info */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-[#26455E]" />
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Ruang Kerja (Workspace)</span>
                  <span className="font-bold text-slate-800">{workspaceName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-sky-600" />
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Super Admin Penanggung Jawab</span>
                  <span className="font-semibold text-slate-700">{customerName} ({customerEmail})</span>
                </div>
              </div>
            </div>

            {/* Alur Integrasi SparkPay Snap.js (Berdasarkan Dokumen .md) */}
            <div className="p-3 rounded-2xl bg-slate-900 text-slate-200 text-xs border border-slate-800 shadow-xs">
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800">
                <span className="font-bold text-sky-400 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  ⚡ Alur Integrasi Snap.js SparkPay (Token-Based Checkout)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Sandbox / Production</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  <span className="block font-bold text-white mb-0.5">1. Backend Token</span>
                  <span className="text-slate-400">POST /api/payment-links mengunci nominal &amp; hasilkan slug (201 Created).</span>
                </div>
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-400/20 text-sky-200">
                  <span className="block font-bold text-sky-300 mb-0.5">2. Snap.pay(token)</span>
                  <span className="text-slate-400">Pop-up checkout interaktif untuk QRIS, Virtual Account, &amp; Kartu Kredit.</span>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-400/20 text-emerald-200">
                  <span className="block font-bold text-emerald-300 mb-0.5">3. Webhook Callback</span>
                  <span className="text-slate-400">Server-to-server callback POST /api/payment-callback event PAID.</span>
                </div>
              </div>
            </div>

            {/* Step 1: Pilihan Paket */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#26455E] text-white flex items-center justify-center text-[10px] font-bold">
                    1
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Pilih Paket Langganan Sesuai Kebutuhan
                  </h4>
                </div>

                {/* Billing cycle toggle */}
                <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsYearly(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isYearly
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsYearly(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isYearly
                        ? "bg-[#26455E] text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <span>Tahunan</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase tracking-wider font-extrabold ${
                        isYearly ? "bg-amber-400 text-slate-900" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      Hemat 20%
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLANS.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
                  const period = isYearly ? plan.yearlyPeriod : plan.monthlyPeriod;
                  const description = isYearly ? plan.yearlyDescription : plan.monthlyDescription;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-[#26455E] bg-blue-50/50 shadow-md ring-2 ring-[#26455E]/15"
                          : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50"
                      }`}
                    >
                      {plan.isPopular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-sky-600 to-[#26455E] text-white shadow-2xs">
                          Rekomendasi
                        </span>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-bold text-slate-900 text-xs sm:text-sm">{plan.name}</h5>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                              isSelected
                                ? "border-[#26455E] bg-[#26455E] text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                        </div>

                        <div className="mb-2">
                          <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {formatCurrency(price)}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium ml-0.5">{period}</span>
                        </div>

                        <p className="text-[11px] text-slate-500 mb-3 leading-snug">{description}</p>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                        {plan.features.slice(0, 3).map((feat, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ringkasan Biaya */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/30 border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-400 block">Total Tagihan Pembayaran:</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#26455E]">
                    {formatCurrency(currentPrice)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ {currentDurationLabel} Akses</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Enkripsi Aman &amp; Terverifikasi SparkPay Snap.js</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={handleEnterWithoutPay}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-2 px-3 rounded-lg hover:bg-slate-200/60 cursor-pointer w-full sm:w-auto text-center"
            >
              Lewati &amp; Langsung Masuk Dashboard
            </button>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-white transition-colors cursor-pointer w-full sm:w-auto"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleInitiatePayment}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-[#193f53] hover:from-emerald-700 hover:to-[#143343] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghubungi SparkPay...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Bayar Sekarang via SparkPay (Snap.js)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Snap.js Checkout Modal Popup (Step 2 .md) */}
      {checkoutData && (
        <SparkPayCheckoutModal
          isOpen={isCheckoutOpen}
          onClose={() => {
            setIsCheckoutOpen(false);
            toast.info("Modal checkout ditutup oleh user.");
          }}
          data={checkoutData}
          environment="sandbox"
          onSuccess={handlePaymentSuccess}
          onPending={(res) => toast.info(`Pembayaran PENDING (${res.method}). Silakan transfer.`)}
          onError={(err) => toast.error(`Pembayaran GAGAL: ${err.message}`)}
        />
      )}
    </>
  );
}


"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export interface SparkPayCheckoutData {
  slug: string;
  external_reference: string;
  title: string;
  amount: number;
  currency: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface SparkPayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SparkPayCheckoutData;
  environment: "sandbox" | "production";
  onSuccess: (result: { type: string; external_reference: string; slug: string; amount: number }) => void;
  onPending: (result: { type: string; external_reference: string; slug: string; method: string }) => void;
  onError: (error: { type: string; message: string }) => void;
}

export default function SparkPayCheckoutModal({
  isOpen,
  onClose,
  data,
  environment,
  onSuccess,
  onPending,
  onError,
}: SparkPayCheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<"qris" | "bca_va" | "mandiri_va" | "cc" | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(899); // 15 mins
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedMethod(null);
      setIsProcessing(false);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const copyVaNumber = (va: string) => {
    navigator.clipboard.writeText(va);
    setCopiedCode(true);
    toast.success("Nomor Virtual Account disalin ke clipboard!");
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSimulateSuccess = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onSuccess({
        type: "PL_PAID",
        external_reference: data.external_reference,
        slug: data.slug,
        amount: data.amount,
      });
      onClose();
    }, 800);
  };

  const handleSimulatePending = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onPending({
        type: "PL_PENDING",
        external_reference: data.external_reference,
        slug: data.slug,
        method: selectedMethod || "QRIS",
      });
      onClose();
    }, 800);
  };

  const handleSimulateError = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onError({
        type: "TIMEOUT",
        message: "Simulasi pembayaran gagal / batas waktu transaksi terlampaui.",
      });
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        {/* Top Header Snap.js Simulator */}
        <div className="bg-gradient-to-r from-slate-900 via-[#193f53] to-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-black text-sm">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                  SparkPay Snap Checkout
                </h3>
                <span
                  className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    environment === "sandbox"
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
                      : "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
                  }`}
                >
                  {environment === "sandbox" ? "🧪 Sandbox Mode" : "🚀 Production"}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-mono">
                token: {data.slug.substring(0, 16)}...
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/15 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Tutup (onClose callback)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Amount Bar */}
        <div className="bg-slate-50 border-b border-slate-200/80 px-5 py-3 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Total Pembayaran
            </span>
            <span className="text-lg font-black text-slate-900">
              {formatCurrency(data.amount)}
            </span>
          </div>

          <div className="text-right flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-xl border border-amber-200/70 text-xs font-semibold">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-bold">{formattedTime}</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Order Brief */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium text-slate-500">Order ID:</span>
              <span className="font-mono font-bold text-slate-800">{data.external_reference}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span className="font-medium text-slate-500">Pelanggan:</span>
              <span className="font-semibold text-slate-800">{data.customer.name} ({data.customer.email})</span>
            </div>
            {data.items && data.items.length > 0 && (
              <div className="pt-2 border-t border-slate-200/60 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block">Daftar Item:</span>
                {data.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-slate-700">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method Selector or Method Detail */}
          {!selectedMethod ? (
            <div className="space-y-2.5">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pilih Metode Pembayaran:
              </p>

              {/* QRIS */}
              <button
                type="button"
                onClick={() => setSelectedMethod("qris")}
                className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-emerald-700">
                      QRIS (Semua E-Wallet & Mobile Banking)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      GoPay, OVO, Dana, ShopeePay, BCA, Livin, dll.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* BCA Virtual Account */}
              <button
                type="button"
                onClick={() => setSelectedMethod("bca_va")}
                className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-sky-500 hover:bg-sky-50/30 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100/70 text-sky-700 flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-sky-700">
                      BCA Virtual Account
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Verifikasi otomatis instan 24 jam
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Mandiri Virtual Account */}
              <button
                type="button"
                onClick={() => setSelectedMethod("mandiri_va")}
                className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/30 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center font-bold">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-amber-700">
                      Mandiri Virtual Account
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pembayaran via Livin by Mandiri & ATM
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Kartu Kredit / Debit */}
              <button
                type="button"
                onClick={() => setSelectedMethod("cc")}
                className="w-full p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center font-bold">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs group-hover:text-indigo-700">
                      Kartu Kredit / Debit Online
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Visa, Mastercard, JCB, American Express (3DS OTP)
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedMethod(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Pilih Metode Lain</span>
              </button>

              {/* QRIS View */}
              {selectedMethod === "qris" && (
                <div className="text-center p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                    Scan QRIS untuk Bayar
                  </span>
                  <div className="w-44 h-44 mx-auto bg-white p-3 rounded-2xl border border-slate-300 shadow-sm flex items-center justify-center relative">
                    <div className="grid grid-cols-5 gap-1.5 w-full h-full p-1 opacity-90">
                      {Array.from({ length: 25 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-xs ${
                            i % 2 === 0 || i % 7 === 0 || i === 0 || i === 4 || i === 20 || i === 24
                              ? "bg-slate-900"
                              : "bg-slate-100"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[9px] font-black shadow-md border border-white">
                        SPARKPAY
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Buka aplikasi e-wallet atau mobile banking Anda, lalu scan kode QR di atas.
                  </p>
                </div>
              )}

              {/* VA View */}
              {(selectedMethod === "bca_va" || selectedMethod === "mandiri_va") && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      {selectedMethod === "bca_va" ? "BCA Virtual Account" : "Mandiri Virtual Account"}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-sky-100 text-sky-700">
                      Auto Verify
                    </span>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Nomor Virtual Account</span>
                      <span className="text-sm font-mono font-black text-slate-900 tracking-wider">
                        {selectedMethod === "bca_va" ? "8801 2938 1029 4819" : "8902 3847 1928 3746"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        copyVaNumber(
                          selectedMethod === "bca_va" ? "8801293810294819" : "8902384719283746"
                        )
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Tersalin" : "Salin"}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Bayar tepat <strong className="text-slate-800">{formatCurrency(data.amount)}</strong> sebelum batas waktu berakhir.
                  </p>
                </div>
              )}

              {/* CC View */}
              {selectedMethod === "cc" && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">Informasi Kartu Kredit (Simulasi)</span>
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Nomor Kartu (Test Card)</span>
                      <span className="font-mono font-bold text-slate-800">4000 1234 5678 9010</span>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Expired</span>
                        <span className="font-mono text-slate-800">12/28</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">CVV</span>
                        <span className="font-mono text-slate-800">123</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sandbox Simulation Actions Panel */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2.5">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Sandbox Action Triggers (Uji Callback Snap.js)</span>
            </div>
            <p className="text-[10px] text-amber-700/80 leading-relaxed">
              Klik salah satu tombol simulasi berikut untuk menguji response handler pada website merchant Anda:
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={handleSimulateSuccess}
                disabled={isProcessing}
                className="px-2.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold shadow-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>onSuccess</span>
              </button>

              <button
                type="button"
                onClick={handleSimulatePending}
                disabled={isProcessing}
                className="px-2.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-[11px] font-bold shadow-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>onPending</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateError}
                disabled={isProcessing}
                className="px-2.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-[11px] font-bold shadow-xs transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>onError</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px]">Enkripsi SSL 256-bit & PCI-DSS Compliant</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Batal (onClose)
          </button>
        </div>
      </div>
    </div>
  );
}


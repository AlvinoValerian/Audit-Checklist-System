"use client";

import React, { useState, useEffect, useRef } from "react";
import Script from "next/script";
import {
  Play,
  RotateCcw,
  Key,
  Eye,
  EyeOff,
  Copy,
  Terminal,
  Send,
  Plus,
  Trash2,
  Sparkles,
  ExternalLink,
  Globe,
  Link2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import SparkPayCheckoutModal, { SparkPayCheckoutData } from "./SparkPayCheckoutModal";

export default function SparkPaySandboxPlayground() {
  // Environment & Credentials
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [serverKey, setServerKey] = useState("sk_test_51687cb2e81ee70b1c634b90e79e4917057cf212505bad90");
  const [webhookSecret, setWebhookSecret] = useState("f38db35a6479f8cb5cb5ba902a979c99cc957fde523386b10c1da093476a3e38");
  const [webhookUrl, setWebhookUrl] = useState("http://localhost:5000/api/payment-callback");
  const [showServerKey, setShowServerKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Step 1: Order & Customer Form State
  const [externalReference, setExternalReference] = useState(
    `INV-2026-07-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [customerName, setCustomerName] = useState("Budi Santoso");
  const [customerEmail, setCustomerEmail] = useState("budi@example.com");
  const [customerPhone, setCustomerPhone] = useState("081234567890");

  const [products, setProducts] = useState([
    { name: "Sepatu Sneakers Premium", quantity: 2, price: 450000 },
    { name: "Kopi Specialty Blend", quantity: 1, price: 85000 },
  ]);

  // Step 1: Generated Token / Slug (Default ke token live sandbox yang aktif di DB SparkPay)
  const [generatedSlug, setGeneratedSlug] = useState<string>("P30Ilifo_KWE1qTPuZz9MO5SG2zkt9_s");
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Step 2: Snap Modal Checkout
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutModalData, setCheckoutModalData] = useState<SparkPayCheckoutData | null>(null);
  const paymentCompletedRef = useRef(false);

  // Step 3: Webhook Simulator
  const [webhookEvent, setWebhookEvent] = useState<"PAID" | "EXPIRED" | "CANCELLED">("PAID");
  const [computedSignature, setComputedSignature] = useState("");
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);

  // Logs / Audit Console
  interface LogItem {
    id: string;
    timestamp: string;
    type: "request" | "response" | "callback" | "webhook" | "info";
    title: string;
    details: string;
  }
  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: "1",
      timestamp: new Date().toLocaleTimeString("id-ID"),
      type: "info",
      title: "Sandbox SparkPay Ready",
      details: "Lingkungan pengujian token-based checkout berhasil diinisialisasi (Backend API: http://localhost:5000/api/payment-links).",
    },
  ]);

  const addLog = (type: LogItem["type"], title: string, details: string) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(),
        timestamp: new Date().toLocaleTimeString("id-ID"),
        type,
        title,
        details,
      },
      ...prev.slice(0, 49),
    ]);
  };

  const totalAmount = products.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const calculateHmac = async (secret: string, message: string) => {
    try {
      if (typeof window === "undefined" || !window.crypto?.subtle) return "sha256=mocked_signature";
      const enc = new TextEncoder();
      const key = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await window.crypto.subtle.sign("HMAC", key, enc.encode(message));
      const hex = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return `sha256=${hex}`;
    } catch {
      return `sha256=mock_${Math.random().toString(36).substring(2)}`;
    }
  };

  useEffect(() => {
    const updateSig = async () => {
      const payloadString = JSON.stringify({
        event: webhookEvent,
        external_reference: externalReference,
        slug: generatedSlug,
        amount: totalAmount.toFixed(2),
        currency: "IDR",
        timestamp: new Date().toISOString(),
      });
      const sig = await calculateHmac(webhookSecret, payloadString);
      setComputedSignature(sig);
    };
    updateSig();
  }, [webhookEvent, webhookSecret, externalReference, generatedSlug, totalAmount]);

  const handleAddProduct = () => {
    setProducts((prev) => [...prev, { name: "Produk Baru", quantity: 1, price: 50000 }]);
  };

  const handleRemoveProduct = (index: number) => {
    if (products.length <= 1) {
      toast.error("Minimal harus ada 1 produk dalam transaksi.");
      return;
    }
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, field: string, value: string | number) => {
    setProducts((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleGeneratePaymentLink = async () => {
    setIsGeneratingToken(true);

    const requestPayload = {
      external_reference: externalReference,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      products: products.map((p) => ({
        name: p.name,
        quantity: Number(p.quantity) || 1,
        price: Number(p.price) || 0,
      })),
    };

    addLog(
      "request",
      "POST http://localhost:5000/api/payment-links",
      JSON.stringify(
        {
          headers: {
            Authorization: `Bearer ${serverKey.substring(0, 10)}...`,
            "Content-Type": "application/json",
          },
          body: requestPayload,
        },
        null,
        2
      )
    );

    try {
      const res = await fetch("http://localhost:5000/api/payment-links", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serverKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const json = await res.json();

      if (res.ok && json.data?.slug) {
        setGeneratedSlug(json.data.slug);
        addLog("response", "201 Created (SparkPay Response)", JSON.stringify(json, null, 2));
        toast.success("Token pembayaran (slug) berhasil dibuat dari SparkPay!");
        // Update Order ID untuk transaksi berikutnya agar tidak duplikat
        setExternalReference(`INV-2026-07-${Math.floor(1000 + Math.random() * 9000)}`);
      } else {
        const errorMsg = json.message || "Gagal dari server SparkPay";
        addLog("response", `Error ${res.status} dari SparkPay`, JSON.stringify(json, null, 2));
        toast.error(`SparkPay: ${errorMsg}`);
        return;
      }
    } catch (err: unknown) {
      console.warn("Backend API error or unreachable, fallback to sandbox generator:", err);
      // Fallback sandbox generator jika backend offline
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let slug = "";
      for (let i = 0; i < 28; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      const responsePayload = {
        data: {
          id: `pl_${Math.random().toString(36).substring(2, 10)}`,
          slug: slug,
          title: `${products[0].name} (${products.length > 1 ? `+${products.length - 1} lainnya` : "x" + products[0].quantity})`,
          amount: totalAmount,
          currency: "IDR",
          status: "ACTIVE",
          external_reference: externalReference,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
          items: products,
        },
      };

      setGeneratedSlug(slug);
      addLog("response", "201 Created (Sandbox Fallback)", JSON.stringify(responsePayload, null, 2));
      toast.success("Token pembayaran (slug) berhasil di-generate!");
      setExternalReference(`INV-2026-07-${Math.floor(1000 + Math.random() * 9000)}`);
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleOpenCheckoutModal = () => {
    paymentCompletedRef.current = false;
    if (!generatedSlug) {
      toast.error("Generate token pembayaran (slug) terlebih dahulu.");
      return;
    }

    setCheckoutModalData({
      slug: generatedSlug,
      external_reference: externalReference,
      title: `${products[0].name} & item lainnya`,
      amount: totalAmount,
      currency: "IDR",
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      items: products,
    });

    addLog(
      "info",
      "Snap.pay(token)",
      `Membuka checkout popup menggunakan token: ${generatedSlug}`
    );
    setIsCheckoutModalOpen(true);
  };

  const handleSimulateRedirect = () => {
    // Sesuai route server SparkPay Sandbox: halaman checkout penuh berada di /p/:slug (BUKAN /pay/:slug)
    const url = `https://snap.sandbox.sparkpay.id/p/${generatedSlug}`;
    addLog("info", "Snap.redirect(token)", `Redirect user ke URL pembayaran resmi: ${url}`);
    toast.info(`[Redirect Mode] Membuka halaman pembayaran di tab baru: ${url}`);
    
    if (typeof window !== "undefined" && generatedSlug) {
      // Buka tab checkout pembayaran resmi SparkPay
      window.open(url, "_blank");
    }
  };

  const handleCheckoutSuccess = (res: { type: string; external_reference: string; slug: string; amount: number }) => {
    paymentCompletedRef.current = true;
    addLog(
      "callback",
      "Callback onSuccess Dipicu",
      JSON.stringify(res, null, 2)
    );
    toast.success(`Pembayaran BERHASIL! (Ref: ${res.external_reference})`);
  };

  const handleCheckoutPending = (res: { type: string; external_reference: string; slug: string; method: string }) => {
    addLog(
      "callback",
      "Callback onPending Dipicu",
      JSON.stringify(res, null, 2)
    );
    toast.info(`Pembayaran PENDING (${res.method}). Menunggu transfer pelanggan.`);
  };

  const handleCheckoutError = (err: { type: string; message: string }) => {
    addLog(
      "callback",
      "Callback onError Dipicu",
      JSON.stringify(err, null, 2)
    );
    toast.error(`Pembayaran GAGAL: ${err.message}`);
  };

  const handleSendWebhook = async () => {
    setIsSendingWebhook(true);

    const webhookBody = {
      event: webhookEvent,
      external_reference: externalReference,
      slug: generatedSlug,
      amount: totalAmount.toFixed(2),
      currency: "IDR",
      paid_at: webhookEvent === "PAID" ? new Date().toISOString() : null,
      timestamp: new Date().toISOString(),
    };

    const sig = await calculateHmac(webhookSecret, JSON.stringify(webhookBody));
    const targetEndpoint = webhookUrl && webhookUrl.trim() ? webhookUrl.trim() : "http://localhost:5000/api/payment-callback";

    try {
      const res = await fetch(targetEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sparkpay-Signature": sig,
        },
        body: JSON.stringify(webhookBody),
      });

      const json = await res.json();
      addLog(
        "webhook",
        `Webhook POST Dispatch -> ${targetEndpoint} [${webhookEvent}] (Status: ${res.status})`,
        JSON.stringify(
          {
            target_url: targetEndpoint,
            request: {
              headers: {
                "Content-Type": "application/json",
                "X-Sparkpay-Signature": sig,
              },
              body: webhookBody,
            },
            server_response: json,
          },
          null,
          2
        )
      );
      toast.success(`Webhook (${webhookEvent}) berhasil dikirim ke ${targetEndpoint}!`);
    } catch {
      addLog(
        "webhook",
        `Webhook POST Dispatch -> ${targetEndpoint} [${webhookEvent}] (Local Simulated)`,
        JSON.stringify(
          {
            target_url: targetEndpoint,
            headers: {
              "Content-Type": "application/json",
              "X-Sparkpay-Signature": sig,
            },
            body: webhookBody,
          },
          null,
          2
        )
      );
      toast.success(`Webhook Server-to-Server (${webhookEvent}) berhasil disimulasikan!`);
    } finally {
      setIsSendingWebhook(false);
    }
  };

  return (
    <>
      <Script src="https://snap.sandbox.sparkpay.id/snap/snap.js" strategy="afterInteractive" />
      <div className="space-y-6 text-xs text-slate-700">
      {/* 1. Header Toolbar & Environment Switcher */}
      <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              SparkPay Interactive Sandbox Playground
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                environment === "sandbox"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}
            >
              {environment === "sandbox" ? "🧪 Sandbox Active" : "🚀 Production Mode"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Simulator uji coba end-to-end: Backend Token Creation, Snap.js Frontend Popup, dan Webhook Verification.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => {
              setEnvironment("sandbox");
              setServerKey("sk_test_51687cb2e81ee70b1c634b90e79e4917057cf212505bad90");
              addLog("info", "Environment Switched", "Beralih ke mode 🧪 Sandbox.");
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              environment === "sandbox"
                ? "bg-white text-slate-900 shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🧪 Sandbox
          </button>
          <button
            type="button"
            onClick={() => {
              setEnvironment("production");
              setServerKey("sk_live_sparkpay_849201bc44ae910382ab");
              addLog("info", "Environment Switched", "Beralih ke mode 🚀 Production.");
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              environment === "production"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🚀 Production
          </button>
        </div>
      </div>

      {/* 2. Credentials Bar */}
      <div className="p-5 bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#193f53]" />
            <h4 className="font-bold text-slate-900 text-xs">API Credentials (Dashboard Merchant)</h4>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">merchant.sparkpay.id</span>
        </div>

        {/* Server Key & Webhook Secret */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <span>Server Key ({environment === "sandbox" ? "sk_test_..." : "sk_live_..."})</span>
                <span className="text-[10px] text-rose-500 font-bold">*Secret (Backend Only)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowServerKey(!showServerKey)}
                className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
              >
                {showServerKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showServerKey ? "Sembunyikan" : "Tampilkan"}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showServerKey ? "text" : "password"}
                value={serverKey}
                onChange={(e) => setServerKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53]"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <span>Webhook Secret (whsec_...)</span>
                <span className="text-[10px] text-slate-400">(Untuk Verifikasi HMAC)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
              >
                {showWebhookSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showWebhookSecret ? "Sembunyikan" : "Tampilkan"}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showWebhookSecret ? "text" : "password"}
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53]"
              />
            </div>
          </div>
        </div>

        {/* Webhook URL Input Field */}
        <div className="space-y-1.5 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Webhook URL (URL Callback Endpoint)</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Daftarkan URL ini di Dashboard Merchant SparkPay)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setWebhookUrl("http://localhost:5000/api/payment-callback");
                  toast.info("Webhook URL direset ke endpoint backend lokal.");
                }}
                className="text-[10px] text-sky-600 hover:text-sky-700 font-bold cursor-pointer underline decoration-dotted"
              >
                Reset Localhost
              </button>
            </div>
          </div>
          <div className="relative flex items-center">
            <input
              type="text"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-tunnel.loca.lt/api/payment-callback"
              className="w-full pl-3 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#193f53]/20 focus:border-[#193f53]"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(webhookUrl);
                setCopiedUrl(true);
                toast.success("Webhook URL disalin ke clipboard!");
                setTimeout(() => setCopiedUrl(false), 2000);
              }}
              className="absolute right-1.5 px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer shadow-2xs transition-all"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedUrl ? "Tersalin" : "Salin URL"}</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            💡 <strong>Panduan:</strong> Masukkan URL publik backend Anda (misal dari <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono font-bold">npx localtunnel --port 5000</code>). Endpoint ini akan menerima notifikasi otomatis saat pembayaran berhasil dikonfirmasi.
          </p>
        </div>
      </div>

      {/* 3. Main Playground Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1: Buat Payment Link */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-[#193f53] text-white flex items-center justify-center font-bold text-[10px]">
                  1
                </span>
                <h4 className="font-bold text-slate-900 text-xs">
                  Step 1 — Backend: Generate Payment Link & Token (slug)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                POST /api/payment-links
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Order Reference ID</label>
                  <button
                    type="button"
                    onClick={() => {
                      const newRef = `INV-2026-07-${Math.floor(1000 + Math.random() * 9000)}`;
                      setExternalReference(newRef);
                      toast.info(`Order ID baru di-generate: ${newRef}`);
                    }}
                    className="text-[10px] text-sky-600 hover:text-sky-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Acak ID Baru</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={externalReference}
                  onChange={(e) => setExternalReference(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nama Pelanggan</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email Pelanggan</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nomor HP</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>
            </div>

            {/* Products Table */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">Daftar Produk Belanjaan (Multi-Product):</span>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#193f53] hover:text-[#123040] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Produk</span>
                </button>
              </div>

              <div className="space-y-2">
                {products.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => handleProductChange(idx, "name", e.target.value)}
                      placeholder="Nama produk"
                      className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      value={p.quantity}
                      min={1}
                      onChange={(e) => handleProductChange(idx, "quantity", Number(e.target.value))}
                      placeholder="Qty"
                      className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-center"
                    />
                    <input
                      type="number"
                      value={p.price}
                      min={0}
                      step={1000}
                      onChange={(e) => handleProductChange(idx, "price", Number(e.target.value))}
                      placeholder="Harga"
                      className="w-28 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveProduct(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-slate-100/80 rounded-xl flex items-center justify-between font-bold">
                <span className="text-slate-600">Total Nominal Terkunci (Amount):</span>
                <span className="text-sm text-slate-900 font-mono">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGeneratePaymentLink}
              disabled={isGeneratingToken}
              className="w-full py-2.5 rounded-xl bg-[#193f53] hover:bg-[#123040] active:bg-[#0c202b] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isGeneratingToken ? "Memproses Token..." : "Kirim POST /api/payment-links (Generate Token)"}</span>
            </button>
          </div>

          {/* STEP 2: Checkout Modal Snap.js */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                  2
                </span>
                <h4 className="font-bold text-slate-900 text-xs">
                  Step 2 — Frontend: Buka Snap.pay(token, callbacks)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold">
                Snap.js Modal
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Token Transaksi Aktif (slug):
              </span>
              <div className="flex items-center justify-between font-mono text-xs text-slate-800">
                <span className="font-bold text-emerald-700 truncate max-w-sm">{generatedSlug}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedSlug);
                    toast.success("Token slug disalin!");
                  }}
                  className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                  title="Salin token"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleOpenCheckoutModal}
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Uji Snap.pay(token) [Modal Popup]</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateRedirect}
                className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                <span>Uji Snap.redirect(token)</span>
              </button>
            </div>
          </div>

          {/* STEP 3: Webhook Callback Simulator */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                  3
                </span>
                <h4 className="font-bold text-slate-900 text-xs">
                  Step 3 — Webhook Callback Simulator (Server-to-Server)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold">
                POST /webhook
              </span>
            </div>

            {/* Target URL indicator */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Target Webhook Endpoint:</span>
              <span className="font-mono font-bold text-[#193f53] truncate max-w-[260px]">
                {webhookUrl || "http://localhost:5000/api/payment-callback"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["PAID", "EXPIRED", "CANCELLED"] as const).map((evt) => (
                <button
                  key={evt}
                  type="button"
                  onClick={() => setWebhookEvent(evt)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    webhookEvent === evt
                      ? "bg-indigo-50 border-indigo-400 text-indigo-700 shadow-2xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Event: {evt}
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-900 rounded-2xl text-slate-300 font-mono text-[10px] space-y-1 overflow-x-auto">
              <div className="text-emerald-400 font-bold">X-Sparkpay-Signature:</div>
              <div className="text-slate-300 break-all">{computedSignature}</div>
            </div>

            <button
              type="button"
              onClick={handleSendWebhook}
              disabled={isSendingWebhook}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Simulasikan Kirim Webhook Server-to-Server</span>
            </button>
          </div>
        </div>

        {/* Right Column: Live Console & Audit Log */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-slate-200 rounded-3xl p-5 shadow-md flex flex-col h-full min-h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-xs text-white">Live Event & Audit Console</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLogs([]);
                  toast.info("Console log dibersihkan.");
                }}
                className="text-[10px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Bersihkan</span>
              </button>
            </div>

            <div className="mt-3 overflow-y-auto space-y-3 font-mono text-[10px] flex-1 max-h-[580px] pr-1">
              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-sans">
                  Belum ada aktivitas. Jalankan simulasi di sisi kiri.
                </div>
              ) : (
                logs.map((log) => {
                  const badgeColor =
                    log.type === "request"
                      ? "bg-sky-500/20 text-sky-300 border-sky-400/30"
                      : log.type === "response"
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/30"
                      : log.type === "callback"
                      ? "bg-amber-500/20 text-amber-300 border-amber-400/30"
                      : log.type === "webhook"
                      ? "bg-indigo-500/20 text-indigo-300 border-indigo-400/30"
                      : "bg-slate-700/50 text-slate-300 border-slate-600";

                  return (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5 animate-in fade-in duration-150"
                    >
                      <div className="flex items-center justify-between text-[9px]">
                        <span className={`px-2 py-0.5 rounded-full border font-bold uppercase ${badgeColor}`}>
                          {log.type}
                        </span>
                        <span className="text-slate-400">{log.timestamp}</span>
                      </div>
                      <div className="font-bold text-slate-100 text-[11px] font-sans">
                        {log.title}
                      </div>
                      <pre className="text-slate-300 text-[10px] whitespace-pre-wrap bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 leading-relaxed overflow-x-auto">
                        {log.details}
                      </pre>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Snap.js Modal Dialog Simulation */}
      {checkoutModalData && (
        <SparkPayCheckoutModal
          isOpen={isCheckoutModalOpen}
          onClose={() => {
            setIsCheckoutModalOpen(false);
            if (paymentCompletedRef.current) {
              addLog("callback", "Callback onClose Dipicu", "Modal checkout ditutup (Transaksi telah berhasil dibayar ✅).");
            } else {
              addLog("callback", "Callback onClose Dipicu", "Modal checkout ditutup oleh user tanpa menyelesaikan pembayaran ℹ️.");
            }
          }}
          data={checkoutModalData}
          environment={environment}
          onSuccess={handleCheckoutSuccess}
          onPending={handleCheckoutPending}
          onError={handleCheckoutError}
        />
      )}
    </div>
    </>
  );
}

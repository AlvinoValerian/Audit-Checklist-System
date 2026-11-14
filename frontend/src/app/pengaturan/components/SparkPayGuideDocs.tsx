"use client";

import React, { useState } from "react";
import {
  Code,
  Copy,
  Check,
  Server,
  Globe,
  Terminal,
  Shield,
  FileCode,
  CheckSquare,
  Square,
  ExternalLink,
  BookOpen,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function SparkPayGuideDocs() {
  const [activeCodeTab, setActiveCodeTab] = useState<"nodejs" | "php">("nodejs");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    step1: true,
    step2: true,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
    step7: false,
    step8: false,
  });

  const toggleChecklist = (key: string) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    toast.success("Kode disalin ke clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const nodeJsSnippet = `const express = require("express");
const axios = require("axios");
const app = express();

app.post("/api/checkout", express.json(), async (req, res) => {
  try {
    // Selalu hitung dan validasi harga produk dari database Anda (jangan percaya input harga dari frontend!)
    const response = await axios.post(
      "https://snap.sandbox.sparkpay.id/api/payment-links",
      {
        external_reference: \`ORDER-\${Date.now()}\`,
        customer: {
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
        },
        products: [
          {
            name: "Sepatu Sneakers Premium",
            quantity: 2,
            price: 450000,
          },
          {
            name: "Kopi Specialty Blend",
            quantity: 1,
            price: 85000,
          },
        ],
      },
      {
        headers: {
          Authorization: \`Bearer \${process.env.SPARKPAY_SERVER_KEY}\`,
          "Content-Type": "application/json",
        },
      }
    );

    // Kembalikan hanya token (slug) ke frontend
    res.json({ token: response.data.data.slug });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ message: "Gagal membuat sesi pembayaran" });
  }
});`;

  const phpSnippet = `<?php
function createPaymentToken($customerData) {
    $payload = [
        'external_reference' => 'ORDER-' . time(),
        'customer'           => [
            'name'  => $customerData['name'],
            'email' => $customerData['email'],
            'phone' => $customerData['phone'],
        ],
        'products'           => [
            [
                'name'     => 'Sepatu Sneakers Premium',
                'quantity' => 2,
                'price'    => 450000
            ],
            [
                'name'     => 'Kopi Specialty Blend',
                'quantity' => 1,
                'price'    => 85000
            ]
        ]
    ];

    $ch = curl_init('https://snap.sandbox.sparkpay.id/api/payment-links');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Authorization: Bearer ' . $_ENV['SPARKPAY_SERVER_KEY'],
            'Content-Type: application/json'
        ]
    ]);

    $response = json_decode(curl_exec($ch), true);
    curl_close($ch);

    return $response['data']['slug']; // Token pembayaran
}`;

  const snapJsFrontendSnippet = `<!-- 1. Muat Script snap.js di Frontend -->
<script src="https://snap.sandbox.sparkpay.id/snap/snap.js"></script>

<script>
  // 2. Panggil Snap.pay dengan token dari backend
  function launchCheckout(token) {
    Snap.pay(token, {
      onSuccess: function (result) {
        /* Dipicu saat pembayaran berhasil dikonfirmasi */
        console.log("Sukses:", result);
        window.location.href = "/checkout/success?ref=" + result.external_reference;
      },
      onPending: function (result) {
        /* Dipicu saat user memilih VA / QRIS dan menunggu transfer */
        console.log("Pending:", result);
        window.location.href = "/checkout/pending?ref=" + result.external_reference;
      },
      onError: function (err) {
        /* Dipicu saat error teknis atau timeout */
        console.error("Error:", err);
        alert("Terjadi kesalahan: " + err.message);
      },
      onClose: function () {
        /* Dipicu jika user menutup modal sebelum bayar */
        console.log("Modal checkout ditutup oleh user.");
      },
    });
  }
</script>`;

  const webhookVerifySnippet = `const crypto = require("crypto");

function verifyWebhookSignature(rawBody, signatureHeader, webhookSecret) {
  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader || ""),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}`;

  return (
    <div className="space-y-8 text-xs text-slate-700">
      {/* Intro Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-[#193f53] to-slate-900 text-white shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 font-black text-xl shrink-0">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Alur Integrasi Merchant via Snap.js — SparkPay
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase">
                  v2.4 Docs
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Panduan resmi integrasi pembayaran SparkPay ke dalam website merchant menggunakan modul <strong>Snap.js</strong> dengan pola arsitektur <strong>Token-Based Checkout</strong>.
              </p>
            </div>
          </div>

          <a
            href="https://merchant.sparkpay.id"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/15 text-white font-semibold text-xs border border-white/20 transition-all shrink-0"
          >
            <span>Portal Merchant</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Visual Sequence Flow */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-[#193f53]" />
            <h3 className="text-sm font-bold text-slate-900">
              Cara Kerja (Token-Based Checkout Sequence)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">Security Flow Diagram</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 relative space-y-2">
            <span className="w-6 h-6 rounded-full bg-[#193f53] text-white flex items-center justify-center text-[11px] font-bold">
              1
            </span>
            <p className="font-bold text-slate-800 text-xs">POST /api/payment-links</p>
            <p className="text-[11px] text-slate-500">
              Backend Merchant kirim data order ke SparkPay Server via Server Key (<code className="font-mono text-slate-700">sk_xxx</code>).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 relative space-y-2">
            <span className="w-6 h-6 rounded-full bg-[#193f53] text-white flex items-center justify-center text-[11px] font-bold">
              2
            </span>
            <p className="font-bold text-slate-800 text-xs">Simpan & Return Token</p>
            <p className="text-[11px] text-slate-500">
              SparkPay mengunci nominal transaksi di database dan mengembalikan token unik (<code className="font-mono text-slate-700">data.slug</code>).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 relative space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
              3
            </span>
            <p className="font-bold text-slate-800 text-xs">Snap.pay(token)</p>
            <p className="text-[11px] text-slate-500">
              Frontend Merchant membuka modal checkout Snap.js menggunakan token tanpa mengekspos Server Key.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 relative space-y-2">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">
              4
            </span>
            <p className="font-bold text-slate-800 text-xs">Checkout & Webhook</p>
            <p className="text-[11px] text-slate-500">
              Pelanggan membayar. Frontend menerima callback status dan Server menerima Webhook POST instan.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[11px] text-amber-800 space-y-1">
            <strong className="font-bold">Keamanan Utama: Server Key tidak pernah menyentuh browser!</strong>
            <p className="leading-relaxed">
              Seluruh validasi jumlah pembayaran (amount) terjadi di sisi server SparkPay menggunakan data yang sudah tersimpan di database. Klien tidak bisa memanipulasi harga di frontend.
            </p>
          </div>
        </div>
      </div>

      {/* Environments Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Globe className="w-4 h-4 text-sky-600" />
          <h3 className="text-sm font-bold text-slate-900">Environment & URL Endpoint</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-4">Environment</th>
                <th className="py-2.5 px-4">Base URL API</th>
                <th className="py-2.5 px-4">Script snap.js URL</th>
                <th className="py-2.5 px-4">Server Key Prefix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🧪 Sandbox</span>
                </td>
                <td className="py-3 px-4 text-sky-700">https://snap.sandbox.sparkpay.id</td>
                <td className="py-3 px-4 text-slate-600">https://snap.sandbox.sparkpay.id/snap/snap.js</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">sk_test_</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                  <span>🚀 Production</span>
                </td>
                <td className="py-3 px-4 text-emerald-700">https://snap.sparkpay.id</td>
                <td className="py-3 px-4 text-slate-600">https://snap.sparkpay.id/snap/snap.js</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">sk_live_</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Step 1: Backend Implementation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#193f53] text-white flex items-center justify-center font-bold text-[10px]">
              1
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Step 1 — Buat Payment Link (Sisi Backend Server)
            </h3>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveCodeTab("nodejs")}
              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                activeCodeTab === "nodejs"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Node.js (Express)
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab("php")}
              className={`px-3 py-1 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                activeCodeTab === "php"
                  ? "bg-white text-slate-900 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              PHP (cURL)
            </button>
          </div>
        </div>

        <div className="relative">
          <div className="bg-slate-900 rounded-2xl p-4 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400">
              <span>{activeCodeTab === "nodejs" ? "server.js" : "checkout.php"}</span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    activeCodeTab === "nodejs" ? nodeJsSnippet : phpSnippet,
                    "backend-code"
                  )
                }
                className="inline-flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
              >
                {copiedKey === "backend-code" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === "backend-code" ? "Tersalin" : "Salin Kode"}</span>
              </button>
            </div>
            <pre>{activeCodeTab === "nodejs" ? nodeJsSnippet : phpSnippet}</pre>
          </div>
        </div>
      </div>

      {/* Step 2: Frontend Implementation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
              2
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Step 2 — Tampilkan Modal Checkout (Frontend Snap.js)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(snapJsFrontendSnippet, "frontend-code")}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            {copiedKey === "frontend-code" ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedKey === "frontend-code" ? "Tersalin" : "Salin Kode"}</span>
          </button>
        </div>

        <div className="bg-slate-900 rounded-2xl p-4 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
          <pre>{snapJsFrontendSnippet}</pre>
        </div>
      </div>

      {/* Step 3: Webhook Implementation */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
              3
            </span>
            <h3 className="text-sm font-bold text-slate-900">
              Step 3 — Verifikasi Webhook Callback (Server-to-Server)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => copyToClipboard(webhookVerifySnippet, "webhook-code")}
            className="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            {copiedKey === "webhook-code" ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedKey === "webhook-code" ? "Tersalin" : "Salin Kode"}</span>
          </button>
        </div>

        <p className="text-slate-600 text-xs leading-relaxed">
          Setiap request notifikasi webhook menyertakan header <code>X-Sparkpay-Signature: sha256=&lt;hmac&gt;</code>. Gunakan <strong>Webhook Secret</strong> untuk memvalidasi keaslian payload webhook:
        </p>

        <div className="bg-slate-900 rounded-2xl p-4 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
          <pre>{webhookVerifySnippet}</pre>
        </div>
      </div>

      {/* Integration Checklist */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <CheckSquare className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Checklist Kelayakan Integrasi (Go-Live)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {[
            { id: "step1", label: "Daftar akun merchant di merchant.sparkpay.id" },
            { id: "step2", label: "Dapatkan Server Key sandbox (sk_test_...) dari dashboard" },
            { id: "step3", label: "Implementasikan backend route POST /api/payment-links" },
            { id: "step4", label: "Pasang script snap.js sandbox di frontend website" },
            { id: "step5", label: "Hubungkan tombol bayar dengan pemanggilan Snap.pay(token, callbacks)" },
            { id: "step6", label: "Jalankan testing transaksi di Sandbox hingga menerima callback status" },
            { id: "step7", label: "Daftarkan Webhook URL & verifikasi tanda tangan HMAC SHA-256" },
            { id: "step8", label: "Go-Live: Ganti endpoint dan kunci API ke sk_live_..." },
          ].map((item) => (
            <div
              key={item.id}
              onClick={() => toggleChecklist(item.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 select-none ${
                checklist[item.id]
                  ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 font-medium"
                  : "bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {checklist[item.id] ? (
                <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 shrink-0" />
              )}
              <span className="leading-snug">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


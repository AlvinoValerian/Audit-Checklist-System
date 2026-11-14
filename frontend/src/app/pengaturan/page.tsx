"use client";

import React, { useState, useEffect, Suspense } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Header from "@/components/layout/Header";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Settings,
  Server,
  Database,
  Shield,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Lock,
  Layers,
  Terminal,
  RotateCcw,
  Sliders,
  BookOpen,
  Zap,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import SparkPaySandboxPlayground from "./components/SparkPaySandboxPlayground";
import SparkPayGuideDocs from "./components/SparkPayGuideDocs";
import UserPackagePaymentDashboard from "./components/UserPackagePaymentDashboard";

function PengaturanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialTab = searchParams?.get("tab") || "sparkpay_sandbox";
  const [activeTab, setActiveTab] = useState<
    "sparkpay_sandbox" | "user_packages" | "sparkpay_docs" | "system"
  >(
    initialTab === "system"
      ? "system"
      : initialTab === "docs" || initialTab === "sparkpay_docs"
      ? "sparkpay_docs"
      : initialTab === "user_packages" || initialTab === "rekap"
      ? "user_packages"
      : "sparkpay_sandbox"
  );

  useEffect(() => {
    const tabParam = searchParams?.get("tab");
    if (tabParam === "system") {
      setActiveTab("system");
    } else if (tabParam === "docs" || tabParam === "sparkpay_docs") {
      setActiveTab("sparkpay_docs");
    } else if (tabParam === "user_packages" || tabParam === "rekap") {
      setActiveTab("user_packages");
    } else if (tabParam === "sparkpay" || tabParam === "sparkpay_sandbox") {
      setActiveTab("sparkpay_sandbox");
    }
  }, [searchParams]);

  const handleTabChange = (
    tab: "sparkpay_sandbox" | "user_packages" | "sparkpay_docs" | "system"
  ) => {
    setActiveTab(tab);
    const param =
      tab === "sparkpay_sandbox"
        ? "sparkpay"
        : tab === "user_packages"
        ? "user_packages"
        : tab === "sparkpay_docs"
        ? "docs"
        : "system";
    router.replace(`/pengaturan?tab=${param}`);
  };

  // State untuk System Tab
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [notificationAudit, setNotificationAudit] = useState(true);
  const [logLevel, setLogLevel] = useState("INFO");

  const handleTestConnection = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("http://localhost:5000/api/health");
      if (res.ok) {
        toast.success("Koneksi server backend & database PostgreSQL berjalan normal!");
      } else {
        toast.error("Respons server tidak sesuai harapan.");
      }
    } catch {
      toast.error("Gagal terhubung ke backend server (http://localhost:5000).");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleResetCache = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("audit_pro_teknis_users_cache");
      toast.success("Cache lokal personil teknis berhasil disegarkan!");
    }
  };

  return (
    <DashboardLayout>
      <Header
        title="Pengaturan Sistem & Divisi Teknis"
        subtitle="Pusat konfigurasi parameter teknis, monitoring konektivitas database PostgreSQL, dan lingkungan pengujian sandbox."
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            {/* TAB 1: SPARKPAY SANDBOX (BAGIAN SANDBOX YANG DIBUAT) */}
            <button
              type="button"
              onClick={() => handleTabChange("sparkpay_sandbox")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "sparkpay_sandbox"
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>🧪 SparkPay Sandbox</span>
            </button>

            {/* TAB 2: REKAP PEMBAYARAN USER */}
            <button
              type="button"
              onClick={() => handleTabChange("user_packages")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "user_packages"
                  ? "bg-white text-indigo-950 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>💳 Rekap Pembayaran User</span>
            </button>

            {/* TAB 3: PANDUAN INTEGRASI */}
            <button
              type="button"
              onClick={() => handleTabChange("sparkpay_docs")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "sparkpay_docs"
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-4 h-4 text-[#193f53]" />
              <span>📖 Panduan Alur Integrasi</span>
            </button>

            {/* TAB 4: INFRASTRUKTUR & SISTEM */}
            <button
              type="button"
              onClick={() => handleTabChange("system")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "system"
                  ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Sliders className="w-4 h-4 text-sky-600" />
              <span>⚙️ Infrastruktur & Sistem</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Snap.js Gateway Ready
            </span>
          </div>
        </div>

        {/* TAB 1: SPARKPAY SANDBOX PLAYGROUND (BAGIAN SANDBOX ASLI) */}
        {activeTab === "sparkpay_sandbox" && <SparkPaySandboxPlayground />}

        {/* TAB 2: REKAP PEMBAYARAN USER */}
        {activeTab === "user_packages" && <UserPackagePaymentDashboard />}

        {/* TAB 3: PANDUAN ALUR INTEGRASI (MD DOCS) */}
        {activeTab === "sparkpay_docs" && <SparkPayGuideDocs />}

        {/* TAB 4: INFRASTRUKTUR & SISTEM */}
        {activeTab === "system" && (
          <div className="space-y-6">
            {/* Banner Lingkungan Teknis */}
            <div className="bg-gradient-to-r from-slate-900 to-[#193f53] p-5 sm:p-6 rounded-3xl text-white shadow-md relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/20">
                    <Sliders className="w-6 h-6 text-sky-400 stroke-[2]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold">Pusat Kendali Divisi Teknis</h2>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold uppercase tracking-wider">
                        Sistem Normal
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      Ruang kontrol parameter teknis, monitoring konektivitas database PostgreSQL, serta isolasi ruang uji coba (Sandbox Testing).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>Uji Konektivitas</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Grid Kartu Pengaturan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom 1: Status Infrastruktur & Database */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Infrastruktur Database</h3>
                    <p className="text-[11px] text-slate-400">PostgreSQL Store Audit DB</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Database Engine</span>
                      <span className="font-semibold text-slate-800">PostgreSQL (Prisma ORM)</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Online
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Port Database</span>
                      <span className="font-semibold text-slate-800">5433 (Default DB Port)</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-slate-500">store_audit_db</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Server Backend API</span>
                      <span className="font-semibold text-slate-800">Express.js (Port 5000)</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-emerald-600">Active</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Frontend Server</span>
                      <span className="font-semibold text-slate-800">Next.js 15 (Port 3000)</span>
                    </div>
                    <span className="text-[11px] font-mono font-semibold text-emerald-600">Turbopack</span>
                  </div>
                </div>
              </div>

              {/* Kolom 2: Sandbox Lingkungan Pengujian */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Ruang Uji Coba (Sandbox)</h3>
                    <p className="text-[11px] text-slate-400">Isolasi data personil teknis</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Divisi Teknis - Sandbox Testing</span>
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-extrabold uppercase">
                        Aktif
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Ruang kerja pengujian terisolasi penuh dari tenant komersial. Data toko, jadwal, checklist dan staf tidak akan bocor ke penyewa umum.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Cache Lokal Personil Teknis</span>
                      <button
                        type="button"
                        onClick={handleResetCache}
                        className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Segarkan Cache</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Bersihkan cache lokal di browser untuk memperbarui sinkronisasi personil teknis terbaru.
                    </p>
                  </div>
                </div>
              </div>

              {/* Kolom 3: Parameter Keamanan & Konfigurasi */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Keamanan & Sistem</h3>
                    <p className="text-[11px] text-slate-400">Parameter enkripsi & akses</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Protokol Enkripsi Media</span>
                      <span className="font-semibold text-slate-800">AES-256-CBC</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                      <Lock className="w-3 h-3" />
                      Aktif
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Masa Sesi JWT Token</span>
                      <span className="font-semibold text-slate-800">7 Hari</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">HS256</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tingkat Log Sistem</span>
                      <span className="font-semibold text-slate-800">{logLevel}</span>
                    </div>
                    <select
                      value={logLevel}
                      onChange={(e) => {
                        setLogLevel(e.target.value);
                        toast.info(`Tingkat logging diubah ke: ${e.target.value}`);
                      }}
                      className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="DEBUG">DEBUG</option>
                      <option value="INFO">INFO</option>
                      <option value="WARN">WARN</option>
                      <option value="ERROR">ERROR</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian Bawah: Preferensi Operasional */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-600" />
                <span>Preferensi Operasional Divisi Teknis</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">Auto-Refresh Realtime Status</p>
                    <p className="text-[11px] text-slate-400">
                      Perbarui status audit dan jadwal secara berkala di latar belakang
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => {
                      setAutoRefresh(e.target.checked);
                      toast.success(
                        e.target.checked
                          ? "Auto-refresh realtime diaktifkan."
                          : "Auto-refresh realtime dinonaktifkan."
                      );
                    }}
                    className="w-4 h-4 accent-[#193f53] cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">Notifikasi Log Sistem Penting</p>
                    <p className="text-[11px] text-slate-400">
                      Tampilkan notifikasi pop-up saat terjadi anomali pada audit toko
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationAudit}
                    onChange={(e) => {
                      setNotificationAudit(e.target.checked);
                      toast.success(
                        e.target.checked
                          ? "Notifikasi sistem penting diaktifkan."
                          : "Notifikasi sistem penting dinonaktifkan."
                      );
                    }}
                    className="w-4 h-4 accent-[#193f53] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function PengaturanPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-8 text-center text-slate-400">
            Memuat Pengaturan Sistem & Teknis...
          </div>
        </DashboardLayout>
      }
    >
      <PengaturanContent />
    </Suspense>
  );
}

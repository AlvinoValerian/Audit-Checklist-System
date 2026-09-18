"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Monitor,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Layers,
  Store,
  BarChart3,
  Sparkles,
} from "lucide-react";

export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const features = [
    {
      icon: <Layers className="w-6 h-6 text-white" />,
      title: "Checklist Digital Dinamis",
      description:
        "Kustomisasi kuesioner audit pembukaan toko, kebersihan, SOP kasir, hingga kepatuhan visual merchandising secara fleksibel.",
    },
    {
      icon: <MapPin className="w-6 h-6 text-white" />,
      title: "Geotagging & Bukti Foto Anti-Fraud",
      description:
        "Validasi kehadiran auditor di lokasi toko dengan koordinat GPS real-time dan pengambilan foto langsung berkamera timestamp.",
    },
    {
      icon: <AlertCircle className="w-6 h-6 text-white" />,
      title: "Tiket Temuan & Tindak Lanjut (CAPA)",
      description:
        "Otomatisasi penugasan perbaikan deviasi ke Store Manager lengkap dengan tenggat waktu penyelesaian (SLA) dan verifikasi ulang.",
    },
    {
      icon: <BarChart3 className="w-6 h-6 text-white" />,
      title: "Executive Dashboard & Scoring",
      description:
        "Pantau pemeringkatan skor kepatuhan seluruh jaringan cabang toko secara terpusat dengan matriks analitik interaktif.",
    },
    {
      icon: <FileSpreadsheet className="w-6 h-6 text-white" />,
      title: "Ekspor Laporan Otomatis (PDF/Excel)",
      description:
        "Generate laporan audit komprehensif berformat resmi beserta lampiran foto bukti dalam hitungan detik tanpa rekap manual.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
      title: "Multi-Role & Kontrol Akses",
      description:
        "Struktur hak akses aman dan bertingkat untuk Super Admin, Area Manager, Auditor Lapangan, dan Store Supervisor.",
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Penjadwalan & Penugasan",
      desc: "Super Admin atau Area Manager menentukan jadwal kunjungan audit serta menugaskan auditor ke cabang toko target.",
    },
    {
      step: "02",
      title: "Inspeksi Lapangan",
      desc: "Auditor mengisi checklist digital di lokasi toko, melampirkan foto temuan, dan tervalidasi oleh sistem GPS.",
    },
    {
      step: "03",
      title: "Scoring & Rekap Otomatis",
      desc: "Sistem langsung menghitung nilai kepatuhan toko dan mengelompokkan temuan kritis, major, atau minor secara otomatis.",
    },
    {
      step: "04",
      title: "Resolusi & Monitoring",
      desc: "Store Manager menyelesaikan tindakan perbaikan langsung di platform hingga seluruh temuan tertutup dengan tuntas.",
    },
  ];

  const faqs = [
    {
      question: "Apa itu platform StoreAudit?",
      answer:
        "StoreAudit adalah platform sistem monitoring dan audit toko terpadu yang dirancang untuk membantu jaringan ritel mengotomasi proses inspeksi operasional, meningkatkan kepatuhan SOP cabang, dan menyajikan analitik performa toko secara real-time.",
    },
    {
      question: "Bagaimana cara kerja validasi GPS dan foto anti-fraud?",
      answer:
        "Sistem secara otomatis mendeteksi radius lokasi koordinat GPS auditor saat memulai checklist di toko. Setiap foto bukti diambil secara langsung melalui kamera aplikasi dengan metadata tanggal, jam, dan titik lokasi yang terkunci.",
    },
    {
      question: "Apakah sistem mendukung banyak cabang toko (multi-branch)?",
      answer:
        "Ya, StoreAudit mendukung skalabilitas tanpa batas mulai dari puluhan hingga ribuan cabang toko yang tersebar di berbagai wilayah dengan pengelompokan wilayah (area/regional).",
    },
    {
      question: "Bagaimana cara login bagi Super Admin?",
      answer:
        "Super Admin dapat mengakses portal manajemen dengan mengklik tombol 'Masuk' di pojok kanan atas atau menuju ke halaman login khusus di /login menggunakan kredensial terdaftar.",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#26455E] selection:text-white">
      {/* =========================================================================
          1. STICKY NAVBAR
         ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#26455E] text-white shadow-sm">
              <Monitor className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-[#26455E] leading-none">
                StoreAudit
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                ENTERPRISE SYSTEM
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#fitur" className="hover:text-[#26455E] transition-colors">
              Fitur
            </a>
            <a href="#alur" className="hover:text-[#26455E] transition-colors">
              Alur Kerja
            </a>
            <a href="#keunggulan" className="hover:text-[#26455E] transition-colors">
              Keunggulan
            </a>
            <a href="#faq" className="hover:text-[#26455E] transition-colors">
              FAQ
            </a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-semibold text-[#26455E] hover:text-[#1a3143] border border-slate-200 hover:border-[#26455E] rounded-lg transition-all"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#26455E] hover:bg-[#1e384b] rounded-lg shadow-sm hover:shadow transition-all"
            >
              <span>Registrasi</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION
         ========================================================================= */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[20%] w-96 h-96 rounded-full bg-[#26455E]/10 blur-3xl" />
          <div className="absolute top-[20%] right-[15%] w-80 h-80 rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#26455E]/10 text-[#26455E] border border-[#26455E]/20 mb-6">
              <Sparkles className="w-3.5 h-3.5 text-[#26455E]" />
              <span>Platform Audit &amp; Checklist Toko Terintegrasi No. 1</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.15]">
              Optimalkan Kepatuhan &amp;{" "}
              <span className="text-[#26455E]">Standar Operasional Toko</span> Ritel
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Tingkatkan efisiensi inspeksi cabang toko, validasi temuan dengan bukti foto
              dan GPS real-time, serta analisa kepatuhan seluruh jaringan dalam satu
              platform terpusat.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-[#26455E] hover:bg-[#1e384b] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <span>Daftar Akun Baru</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <span>Masuk ke Akun</span>
              </Link>
              <a
                href="#fitur"
                className="w-full sm:w-auto px-5 py-3.5 rounded-lg text-slate-600 hover:text-slate-900 font-semibold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <span>Eksplorasi Fitur</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Social Proof note */}
            <p className="mt-5 text-xs text-slate-400">
              Digunakan oleh tim auditor, area manager, dan operasional jaringan ritel.
            </p>
          </div>

          {/* =========================================================================
              HERO VISUAL: Interactive Dashboard Mockup Card
             ========================================================================= */}
          <div className="mt-14 max-w-5xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-2xl relative overflow-hidden">
              {/* Header bar of the mockup */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#26455E]/10 flex items-center justify-center text-[#26455E]">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                        Cabang Sudirman #042 - Jakarta Pusat
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Audit Berjalan
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Auditor: Rian Hidayat (Lead Area 1) • Terverifikasi GPS (Radius 15m)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-[#26455E]" />
                  <span>Kamis, 17 Sept 2026 • 14:30 WIB</span>
                </div>
              </div>

              {/* 4 Score Widgets */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 my-5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Skor Kepatuhan</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-[#26455E]">96.8%</span>
                    <span className="text-[11px] font-bold text-emerald-600">+3.4%</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Target minimal: 90%</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Checklist Selesai</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-slate-800">48 / 50</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">96% selesai</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Temuan Deviasi</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold text-amber-600">2 Minor</span>
                  </div>
                  <span className="text-[10px] text-slate-400">0 Isu Kritis</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Status Geotag</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-base font-bold text-slate-800">Valid</span>
                  </div>
                  <span className="text-[10px] text-slate-400">-6.2088, 106.8456</span>
                </div>
              </div>

              {/* Sample Checklist Rows */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800">
                        Kebersihan &amp; Kerapihan Display Gondola Utama
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Area: Food &amp; Beverage • Foto bukti terlampir (2 file)
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                    Sesuai SOP
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-white hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800">
                        Kesiapan APAR &amp; Jalur Evakuasi Bebas Halangan
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Area: Keselamatan Kerja • Masa berlaku APAR: Des 2026
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                    Sesuai SOP
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/40">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-800">
                        Suhu Chiller Minuman (Terukur 5.5°C — Standar ≤ 4.0°C)
                      </p>
                      <p className="text-[11px] text-amber-700 font-medium">
                        Tiket CAPA #310 dibuat untuk Store Manager (SLA: 2 Jam)
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded text-[11px] font-semibold bg-amber-100 text-amber-800">
                    Perlu Perbaikan
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. STATS BAR
         ========================================================================= */}
      <section className="bg-[#26455E] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">500+</p>
              <p className="text-xs sm:text-sm text-slate-200 mt-1">
                Toko Cabang Terpantau
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">45%</p>
              <p className="text-xs sm:text-sm text-slate-200 mt-1">
                Penurunan Deviasi SOP
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">3x</p>
              <p className="text-xs sm:text-sm text-slate-200 mt-1">
                Laporan Terbit Lebih Cepat
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold tracking-tight">99.8%</p>
              <p className="text-xs sm:text-sm text-slate-200 mt-1">
                Akurasi Validasi Geotag
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. KEY FEATURES SECTION
         ========================================================================= */}
      <section id="fitur" className="py-20 bg-slate-50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#26455E]">
              Fitur Lengkap
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-2">
              Segala Kebutuhan Audit Toko dalam Satu Platform
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3">
              Dirancang khusus untuk mendukung operasional retail yang menuntut kecepatan,
              akurasi data, dan kepatuhan standar tinggi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((item, idx) => (
              <div
                key={idx}
                className="bg-white p-7 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#26455E] flex items-center justify-center mb-5 shadow-sm">
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. WORKFLOW STEPS SECTION
         ========================================================================= */}
      <section id="alur" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#26455E]">
              Alur Kerja Terpadu
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-2">
              4 Langkah Mudah Melakukan Audit Toko
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-3">
              Dari penjadwalan hingga tindak lanjut perbaikan, semuanya terkoordinasi
              secara mulus dan transparan.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflowSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-slate-50 border border-slate-100 relative overflow-hidden"
              >
                <span className="text-3xl font-black text-[#26455E]/20 block mb-3">
                  {step.step}
                </span>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          6. COMPARISON: TRADITIONAL VS STOREAUDIT
         ========================================================================= */}
      <section id="keunggulan" className="py-20 bg-slate-50 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-[#26455E]">
              Mengapa StoreAudit?
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight mt-2">
              Transformasi dari Audit Manual ke Sistem Terintegrasi
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Traditional Audit */}
            <div className="bg-white p-7 rounded-2xl border border-red-200">
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                Audit Manual / Konvensional
              </span>
              <ul className="mt-5 space-y-3.5 text-sm text-slate-600">
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Formulir kertas bertumpuk dan rawan hilang atau rusak.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Tidak ada validasi lokasi, risiko auditor tidak hadir ke toko.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Rekap data membutuhkan waktu berhari-hari via spreadsheet.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold">✕</span>
                  <span>Tindak lanjut temuan sering terlewat tanpa pelacakan status.</span>
                </li>
              </ul>
            </div>

            {/* StoreAudit Digital */}
            <div className="bg-[#26455E] text-white p-7 rounded-2xl shadow-xl border border-[#26455E]">
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider">
                Dengan StoreAudit System
              </span>
              <ul className="mt-5 space-y-3.5 text-sm text-slate-100">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>100% digital, formulir dinamis dapat diakses di tablet/smartphone.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Geotagging GPS otomatis &amp; timestamp foto anti-rekayasa.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Laporan PDF &amp; skor audit keluar instan seketika inspeksi selesai.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span>Sistem tiket CAPA dengan SLA jelas untuk Store Manager.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          7. FAQ SECTION
         ========================================================================= */}
      <section id="faq" className="py-20 bg-white scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#26455E]">
              Pusat Informasi
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-2">
              Pertanyaan yang Sering Diajukan
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-slate-200 rounded-xl overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full flex items-center justify-between p-5 text-left bg-white hover:bg-slate-50 cursor-pointer"
                >
                  <span className="font-semibold text-slate-800 text-sm sm:text-base">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform ${
                      activeFaq === idx ? "rotate-180 text-[#26455E]" : ""
                    }`}
                  />
                </button>
                {activeFaq === idx && (
                  <div className="p-5 pt-0 bg-white text-slate-600 text-sm leading-relaxed border-t border-slate-100">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. CALL TO ACTION BANNER (Background #26455E)
         ========================================================================= */}
      <section className="bg-[#26455E] text-white py-16 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Siap Meningkatkan Standar Kepatuhan Toko Anda?
          </h2>
          <p className="mt-4 text-sm sm:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed">
            Bergabunglah dengan ratusan jaringan toko ritel modern yang telah mengadopsi
            StoreAudit untuk proses audit yang lebih cepat, transparan, dan akurat.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg bg-white hover:bg-slate-100 text-[#26455E] font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Daftar Akun Baru Sekarang</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3.5 rounded-lg border border-white/30 hover:bg-white/10 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Sudah Punya Akun? Masuk</span>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. FOOTER
         ========================================================================= */}
      <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold tracking-tight text-white">
                StoreAudit
              </span>
            </div>

            <div className="flex items-center gap-6 text-xs text-slate-400">
              <a href="#fitur" className="hover:text-white transition-colors">
                Fitur
              </a>
              <a href="#alur" className="hover:text-white transition-colors">
                Alur Kerja
              </a>
              <a href="#keunggulan" className="hover:text-white transition-colors">
                Keunggulan
              </a>
              <Link href="/login" className="hover:text-white transition-colors">
                Portal Login
              </Link>
              <Link href="/register" className="hover:text-white transition-colors">
                Registrasi
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <p>© 2026 Audit Pro Enterprise Monitor. All rights reserved.</p>
            <p>Platform Monitoring &amp; Audit Toko Terintegrasi</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
